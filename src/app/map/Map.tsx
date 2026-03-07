"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import Topbar from "@/components/layout/Topbar";
import { supabase } from "@/lib/supabase";
import type { Assessment, RiskLevel } from "@/types";

const PIN_COLORS: Record<RiskLevel, string> = {
  "LOW RISK":      "#2A7D4F",
  "MODERATE RISK": "#9C6A00",
  "HIGH RISK":     "#B52A2A",
};

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [filters, setFilters] = useState<Record<RiskLevel, boolean>>({
    "LOW RISK": true,
    "MODERATE RISK": true,
    "HIGH RISK": true,
  });

  // Fetch real data from /api/buildings
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch("/api/buildings", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        const mapped: Assessment[] = data.map((b: any) => ({
          building:      b,
          hazard:        {}, 
          vulnerability: {},
          result:        b.risk_results?.[0] ?? {
            risk_index: 0,
            risk_description: "LOW RISK"
          },
        }));
        setAssessments(mapped);
      } catch (error) {
        console.error("Failed to load assessments:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter assessments based on active chips and valid coordinates
  const visible = useMemo(() => assessments.filter(
    (a) => filters[a.result.risk_description as RiskLevel] && 
           a.building.latitude !== null && a.building.longitude !== null
  ), [assessments, filters]);

  // Load Google Maps API once
  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: "weekly",
      libraries: ["maps", "marker"],
    });

    loader.load().then(() => {
      setApiLoaded(true);
    }).catch(err => {
      console.error("Google Maps failed to load:", err);
    });
  }, []);

  // Initialize Map once API and Ref are ready
  useEffect(() => {
    if (!apiLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;
      mapInstanceRef.current = new Map(mapRef.current!, {
        center: { lat: 9.8500, lng: 124.1435 }, // Center of Bohol
        zoom: 10,
        mapId: "6465e08bc83a0f038302b00a", 
        tilt: 45,
        heading: 0,
      });
    };

    initMap();
  }, [apiLoaded]);

  // Update Markers when visible data changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const updateMarkers = async () => {
      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

      // Clear existing markers
      markersRef.current.forEach(m => (m.map = null));
      markersRef.current = [];

      // Add new markers
      visible.forEach((a) => {
        const position = {
          lat: Number(a.building.latitude),
          lng: Number(a.building.longitude),
        };

        const pin = new PinElement({
          background: PIN_COLORS[a.result.risk_description as RiskLevel] || "#ccc",
          borderColor: "white",
          glyphColor: "white",
          scale: 1.1,
        });

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current,
          position,
          title: a.building.name,
          content: pin.element,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 12px; font-family: 'Sora', sans-serif; min-width: 180px;">
              <h4 style="margin: 0 0 4px 0; color: #1A1208; font-size: 14px; font-weight: 700;">
                ${a.building.name}
              </h4>
              <p style="margin: 0; color: #5C4832; font-size: 12px; font-weight: 500;">
                ${a.building.municipality || ""}, ${a.building.province || ""}
              </p>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E0D4C0; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; font-weight: 700; color: #8C3A1A; text-transform: uppercase; letter-spacing: 0.05em;">Risk Index</span>
                <span style="font-size: 14px; font-weight: 700; color: ${PIN_COLORS[a.result.risk_description as RiskLevel] || "#333"};">
                  ${(a.result.risk_index || 0).toFixed(2)}
                </span>
              </div>
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open({ anchor: marker, map: mapInstanceRef.current });
        });

        markersRef.current.push(marker);
      });
    };

    updateMarkers();
  }, [visible, apiLoaded]);

  return (
    <>
      <Topbar />
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Header Section */}
        <div className="mb-7 flex justify-between items-end">
          <div>
            <h2 className="font-sora font-bold text-2xl text-ink">Map View</h2>
            <p className="text-ink-lt text-sm mt-1">
              Geographic distribution of evaluated heritage structures in Bohol
            </p>
          </div>
          <div className="text-xs text-ink-lt font-semibold bg-white px-4 py-1.5 rounded-full border border-border shadow-sm">
            {visible.length} BUILDINGS SYNCED
          </div>
        </div>

        {/* Map Container Card */}
        <div className="card overflow-hidden border border-border bg-white shadow-lg">
          {/* Controls/Filters */}
          <div className="px-6 py-4 border-b border-border flex items-center gap-3 bg-sand/30">
            <span className="label-sm">Filter by Risk:</span>
            {(["LOW RISK", "MODERATE RISK", "HIGH RISK"] as RiskLevel[]).map((level) => {
              const isActive = filters[level];
              return (
                <button
                  key={level}
                  onClick={() => setFilters((f) => ({ ...f, [level]: !f[level] }))}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-white text-ink border-clay shadow-sm"
                      : "bg-gray-50 text-gray-400 border-transparent grayscale"
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ background: PIN_COLORS[level] }} 
                  />
                  {level}
                </button>
              );
            })}
          </div>

          {/* Actual Map */}
          <div 
            ref={mapRef} 
            className="h-[650px] w-full bg-[#f8f5f0]" 
          />
        </div>

        {/* Floating Quick-Tip */}
        <div className="mt-4 flex items-center gap-2 text-xs text-ink-lt italic justify-center">
          <span>💡 Tip: Hold <kbd className="bg-white border rounded px-1 not-italic shadow-sm">Shift</kbd> + click & drag to tilt or rotate the view.</span>
        </div>
      </main>
    </>
  );
}