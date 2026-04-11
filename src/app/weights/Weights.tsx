"use client";
import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { DEFAULT_WEIGHTS, type RiskWeights } from "@/lib/risk-calculator";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const WEIGHT_LABELS: Record<string, string> = {
  // Hazard (A)
  earthquake_intensity: "A1.1 Earthquake Intensity (PEIS)",
  fault_distance: "A1.2 Fault Distance (km)",
  seismic_source: "A1.3 Source (Mw)",
  liquefaction: "A1.4 Liquefaction",
  wind_speed: "A2.1 Wind Speed (kph)",
  terrain: "A2.2 Vicinity / Terrain",
  flood: "A3.1 Flood Susceptibility",
  storm_surge: "A3.2 Storm Surge",
  slope: "A3.3 Slope / Gradient",
  elevation: "A3.4 Elevation (m)",
  water_distance: "A3.5 Dist. to Water (m)",
  runoff: "A3.6 Surface Runoff",
  base_height: "A3.7 Base Height",
  drainage: "A3.8 Drainage System",
  // Exposure (B)
  b11: "B1.1 Theme & Proportion",
  b12: "B1.2 Uniqueness",
  b13: "B1.3 Typical Style",
  b14: "B1.4 Integration",
  b21: "B2.1 Age of Building",
  b22: "B2.2 Relevance",
  b23: "B2.3 Geog. Impact",
  b24: "B2.4 Heritage Tie",
  b25: "B2.5 Important Message",
  b31: "B3.1 Promotion",
  b32: "B3.2 Suggestions",
  b33: "B3.3 Importance",
  b34: "B3.4 No Efforts (Inverted)",
  b41: "B4.1 Tourist Attraction",
  b42: "B4.2 Tourism Contrib.",
  b43: "B4.3 Goods & Services",
  b44: "B4.4 Adaptive Use",
  // Vulnerability (C)
  building_code: "C1.1 Code Year Built",
  plan_irregularity: "C1.2 Plan Irregularity",
  vertical_irregularity: "C1.3 Vertical Irregularity",
  building_proximity: "C1.4 Proximity / Pounding",
  stories: "C1.5 Number of Storeys",
  material: "C1.6 System Material",
  bays: "C1.7 Number of Bays",
  column_spacing: "C1.8 Column Spacing (m)",
  enclosure: "C1.9 Building Enclosure",
  wall_material: "C1.10 Wall Material",
  framing: "C1.11 Framing Type",
  flooring: "C1.12 Flooring Material",
  crack: "C2.1 Maximum Crack Width",
  settlement: "C2.2 Uneven Settlement",
  deformations: "C2.3 Beam/Column Deform.",
  finishing: "C2.4 Finishing Condition",
  decay: "C2.5 Decay of Member",
  loads: "C2.6 Additional Loads",
  roof_design: "C3.1 Roof Design",
  roof_slope: "C3.2 Roof Slope",
  roof_material: "C3.3 Roofing Material",
  roof_fastener_type: "C4.1 Roof Fasteners",
  roof_fastener_dist: "C4.2 Fastener Spacing (mm)"
};

export default function WeightsPage() {
  const router = useRouter();
  const [weights, setWeights] = useState<RiskWeights>(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const res = await fetch("/api/weights", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data) setWeights(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/weights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(weights)
      });

      if (!res.ok) throw new Error("Failed to save");
      setMessage("Weights updated successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (confirm("Reset all weights to defaults?")) {
      setWeights(DEFAULT_WEIGHTS);
    }
  }

  const update = (section: keyof RiskWeights, key: string, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setWeights(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: num
      }
    }));
  };

  const sortEntries = (sectionWeights: Record<string, number>) => {
    return Object.entries(sectionWeights).sort(([ka], [kb]) => {
      const labelA = WEIGHT_LABELS[ka] || ka;
      const labelB = WEIGHT_LABELS[kb] || kb;
      return labelA.localeCompare(labelB, undefined, { numeric: true });
    });
  };

  if (loading) return (
    <>
      <Topbar />
      <div className="p-8 text-center text-[var(--ink-lt)]">Loading configuration...</div>
    </>
  );

  return (
    <>
      <Topbar />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-7 gap-4">
          <div>
            <h2 className="font-sora font-bold text-2xl text-ink">Assessment Weights</h2>
            <p className="text-[var(--ink-lt)] text-sm mt-1">Configure risk calculation coefficients.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="btn-secondary text-xs px-4 py-2">Reset Defaults</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-6 py-2">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm font-semibold border border-green-200">✓ {message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold border border-red-200">⚠ {error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Section A: Hazard */}
          <Section title="Hazard Weights (A)" color="border-terracotta">
            {sortEntries(weights.hazard).map(([k, v]) => (
              <WeightInput key={k} propertyKey={k} value={v} onChange={val => update("hazard", k, val)} />
            ))}
          </Section>

          {/* Section B: Exposure */}
          <Section title="Exposure Weights (B)" color="border-sienna">
             {sortEntries(weights.exposure).map(([k, v]) => (
              <WeightInput key={k} propertyKey={k} value={v} onChange={val => update("exposure", k, val)} />
            ))}
          </Section>

          {/* Section C: Vulnerability */}
          <Section title="Vulnerability Weights (C)" color="border-bark">
            {sortEntries(weights.vulnerability).map(([k, v]) => (
              <WeightInput key={k} propertyKey={k} value={v} onChange={val => update("vulnerability", k, val)} />
            ))}
          </Section>
        </div>
      </main>
    </>
  );
}

function Section({ title, color, children }: { title: string, color: string, children: React.ReactNode }) {
  return (
    <div className={`card p-5 border-t-4 ${color}`}>
      <h3 className="font-sora font-bold text-ink mb-5 text-sm uppercase tracking-wider">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function WeightInput({ propertyKey, value, onChange }: { propertyKey: string, value: number, onChange: (v: string) => void }) {
  const fullLabel = WEIGHT_LABELS[propertyKey] || propertyKey;
  const [id, ...nameParts] = fullLabel.split(" ");
  const name = nameParts.join(" ");

  return (
    <div className="flex justify-between items-center text-sm gap-4 group">
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-black text-terracotta/70 tracking-tighter uppercase mb-0.5">{id}</span>
        <span className="text-ink font-semibold text-[11px] leading-tight truncate group-hover:text-terracotta transition-colors" title={fullLabel}>
          {name || propertyKey.replace(/_/g, " ")}
        </span>
      </div>
      <input
        type="number"
        step="0.001"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 p-1.5 border border-[var(--border)] rounded text-right font-mono text-[13px] text-ink focus:border-terracotta focus:ring-1 focus:ring-terracotta outline-none transition-all bg-sand/30"
      />
    </div>
  );
}
