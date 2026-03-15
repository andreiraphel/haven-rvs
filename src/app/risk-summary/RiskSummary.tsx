"use client";
import { useState, useMemo, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import RiskBadge from "@/components/ui/RiskBadge";
import Modal from "@/components/ui/Modal";
import { exportToExcel, exportToPDF } from "@/lib/export";
import type { Assessment } from "@/types";
import { supabase } from "@/lib/supabase";

type SortKey = "default" | "az" | "za" | "asc" | "desc" | "town";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "default", label: "Default" },
  { key: "az",      label: "A → Z" },
  { key: "za",      label: "Z → A" },
  { key: "asc",     label: "Risk ↑" },
  { key: "desc",    label: "Risk ↓" },
  { key: "town",    label: "By Town" },
];

export default function RiskSummaryPage() {
  const [sort, setSort]           = useState<SortKey>("default");
  const [selected, setSelected]   = useState<Assessment | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"xlsx" | "pdf">("xlsx");
  const [exporting, setExporting] = useState<"" | "xlsx" | "pdf">("");
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());

  // ── Fetch real data from Supabase ─────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("buildings")
        .select("*, risk_results(*), hazard_indicators(*), vulnerability_indicators(*), exposure_indicators(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load assessments:", error.message);
      } else if (data) {
        const mapped: Assessment[] = data.map((b: any) => ({
          building:      b,
          hazard:        b.hazard_indicators?.[0]        ?? {},
          vulnerability: b.vulnerability_indicators?.[0] ?? {},
          exposure:      b.exposure_indicators?.[0]      ?? {},
          result:        b.risk_results?.[0]             ?? {},
        }));
        setAssessments(mapped);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Sorting ───────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...assessments];
    switch (sort) {
      case "az":   return arr.sort((a, b) => a.building.name.localeCompare(b.building.name));
      case "za":   return arr.sort((a, b) => b.building.name.localeCompare(a.building.name));
      case "asc":  return arr.sort((a, b) => a.result.risk_index - b.result.risk_index);
      case "desc": return arr.sort((a, b) => b.result.risk_index - a.result.risk_index);
      case "town": return arr.sort((a, b) => a.building.municipality.localeCompare(b.building.municipality));
      default:     return arr;
    }
  }, [sort, assessments]);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sort]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  async function handleExcel() {
    setExporting("xlsx");
    await exportToExcel(sorted);
    setExporting("");
  }

  async function handlePDF() {
    setExporting("pdf");
    await exportToPDF(sorted);
    setExporting("");
  }

  const router = useRouter();

  return (
    <>
      <Topbar />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="mb-7">
          <h2 className="font-sora font-bold text-2xl text-ink">Risk Summary Table</h2>
          <p className="text-[var(--ink-lt)] text-sm mt-1">
            All evaluated buildings. Click any row to view detailed risk assessment.
          </p>
        </div>

        {/* Sort chips */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <span className="label-sm whitespace-nowrap">Sort by:</span>
          <div className="flex flex-wrap gap-2">
            {SORTS.map(s => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-bold border transition-all ${
                  sort === s.key
                    ? "bg-bark text-white border-bark shadow-md"
                    : "bg-white text-[var(--ink-lt)] border-[var(--border)] hover:bg-sand"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="card overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-sand border-b border-[var(--border)]">
                  {["Building Name", "Code", "Address", "Risk Index", "Risk Level"].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 label-sm whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-[var(--ink-lt)]">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-terracotta border-t-transparent rounded-full"></div>
                        Loading assessments…
                      </div>
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-[var(--ink-lt)]">
                      No assessments found. Complete a questionnaire to see results here.
                    </td>
                  </tr>
                ) : (
                  paginated.map(a => (
                    <tr
                      key={a.building.id}
                      onClick={() => setSelected(a)}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-sand cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-semibold text-ink text-sm max-w-[200px] truncate">{a.building.name}</td>
                      <td className="px-5 py-4">
                        <span className="bg-sand border border-[var(--border)] text-[var(--ink-lt)] text-xs font-mono px-2 py-1 rounded">
                          {a.building.unique_code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--ink-lt)] max-w-[250px] truncate">{a.building.address}</td>
                      <td className="px-5 py-4">
                        <span className={`font-sora font-bold text-base ${
                          !a.result.risk_description                    ? "text-[var(--ink-lt)]" :
                          a.result.risk_description === "LOW RISK"      ? "text-[var(--risk-low)]" :
                          a.result.risk_description === "MODERATE RISK" ? "text-[var(--risk-mod)]" :
                          "text-[var(--risk-high)]"
                        }`}>
                          {a.result.risk_index !== undefined ? a.result.risk_index.toFixed(2) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4"><RiskBadge level={a.result.risk_description} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
              <p className="text-xs text-[var(--ink-lt)] font-medium text-center sm:text-left">
                Showing <span className="text-ink">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-ink">{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)}</span> of <span className="text-ink">{sorted.length}</span> assessments
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                      currentPage === i + 1
                        ? "bg-bark text-white border-bark"
                        : "bg-white text-bark border-border hover:bg-sand"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button onClick={() => setShowExportModal(true)} disabled={loading || sorted.length === 0} className="btn-secondary w-full sm:w-auto py-3">
            ⇪ Export Options
          </button>
        </div>
      </main>

      {selected && <DetailModal assessment={selected} onClose={() => setSelected(null)} router={router} />}

      <Modal open={showExportModal} onClose={() => setShowExportModal(false)} title="Export Reports">
        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <div className="label-sm mb-3">1. Select Format</div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setExportFormat("xlsx")}
                className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                  exportFormat === "xlsx" ? "border-terracotta bg-terracotta/5 ring-1 ring-terracotta" : "border-[var(--border)] hover:bg-sand"
                }`}
              >
                <span className="text-2xl">📊</span>
                <span className={`font-semibold text-sm ${exportFormat === "xlsx" ? "text-terracotta" : "text-ink"}`}>Excel (.xlsx)</span>
              </button>
              <button 
                onClick={() => setExportFormat("pdf")}
                className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                  exportFormat === "pdf" ? "border-terracotta bg-terracotta/5 ring-1 ring-terracotta" : "border-[var(--border)] hover:bg-sand"
                }`}
              >
                <span className="text-2xl">📄</span>
                <span className={`font-semibold text-sm ${exportFormat === "pdf" ? "text-terracotta" : "text-ink"}`}>PDF Document</span>
              </button>
            </div>
          </div>

          {/* Records Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="label-sm">2. Select Records</div>
              <button onClick={() => {
                if (selectedForExport.size === sorted.length) setSelectedForExport(new Set());
                else setSelectedForExport(new Set(sorted.map(a => a.building.id)));
              }} className="text-xs text-terracotta hover:underline font-semibold">
                {selectedForExport.size === sorted.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            
            <div className="border border-[var(--border)] rounded-xl max-h-[200px] overflow-y-auto bg-sand p-2">
              {sorted.map(a => (
                <label key={a.building.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-[var(--border)] text-terracotta focus:ring-terracotta accent-terracotta"
                    checked={selectedForExport.has(a.building.id)}
                    onChange={() => {
                      const next = new Set(selectedForExport);
                      if (next.has(a.building.id)) next.delete(a.building.id);
                      else next.add(a.building.id);
                      setSelectedForExport(next);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{a.building.name}</div>
                    <div className="text-xs text-[var(--ink-lt)] truncate">{a.building.unique_code} • {a.building.municipality}</div>
                  </div>
                  <RiskBadge level={a.result.risk_description} showDot={false} />
                </label>
              ))}
            </div>
            <p className="text-xs text-[var(--ink-lt)] mt-2 italic">
              {selectedForExport.size === 0 ? "No records selected (will export ALL by default)" : `${selectedForExport.size} records selected`}
            </p>
          </div>
          
          <button 
            onClick={async () => {
              const toExport = selectedForExport.size === 0 
                ? sorted 
                : sorted.filter(a => selectedForExport.has(a.building.id));
          
              setExporting(exportFormat);
              try {
                if (exportFormat === "xlsx") await exportToExcel(toExport);
                else await exportToPDF(toExport);
              } catch (err) {
                console.error("Export failed", err);
              }
              setExporting("");
              setShowExportModal(false);
            }} 
            disabled={!!exporting}
            className="btn-primary w-full py-3 mt-4"
          >
            {exporting ? "Exporting..." : `Download ${exportFormat.toUpperCase()}`}
          </button>
        </div>
      </Modal>
    </>
  );
}

import { useRouter } from "next/navigation";

function DetailModal({ assessment: a, onClose, router }: { assessment: Assessment; onClose: () => void; router: any }) {
  const rc = a.result.risk_description;
  const riskCls =
    rc === "LOW RISK"      ? "bg-[var(--risk-low-bg)] border-[#b7e4cb] text-[var(--risk-low)]"
    : rc === "MODERATE RISK" ? "bg-[var(--risk-mod-bg)] border-[#ffe0a0] text-[var(--risk-mod)]"
    : "bg-[var(--risk-high-bg)] border-[#f5b8b8] text-[var(--risk-high)]";

  const coa = a.result.ai_course_of_action?.split("\n").filter(Boolean) ?? [];

  return (
    <Modal open onClose={onClose} title={a.building.name} wide
      footer={
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="btn-secondary flex-1 sm:flex-none" onClick={onClose}>Close</button>
          <button className="btn-primary flex-1 sm:flex-none" onClick={() => router.push(`/edit-assessment/${a.building.id}`)}>Edit Assessment</button>
        </div>
      }
    >
      {/* 1. Quick Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Unique Code", a.building.unique_code],
          ["Year Built",  a.building.year_built],
          ["Floors",      a.building.number_of_floors],
          ["Use",         a.building.building_use],
        ].map(([label, val]) => (
          <div key={label} className="bg-sand rounded-lg px-4 py-2 border border-[var(--border)]">
            <div className="label-sm text-[10px] mb-0.5">{label}</div>
            <div className="text-sm font-bold text-ink">{val ?? "—"}</div>
          </div>
        ))}
      </div>

      {/* 2. Primary Statistical Result (Hero Box) */}
      <div className={`rounded-xl border p-6 mb-8 flex flex-col md:flex-row items-center gap-8 ${riskCls}`}>
        <div className="flex flex-col items-center text-center md:min-w-[240px] md:pr-8 md:border-r border-current/20">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 opacity-70 text-current">Statistical Risk Index</div>
          <div className="font-sora font-extrabold text-7xl leading-none mb-2">
            {a.result.risk_index?.toFixed(2) ?? "—"}
          </div>
          <div className="text-sm font-bold uppercase tracking-widest">{rc}</div>
        </div>
        
        <div className="flex-1 w-full flex flex-wrap md:flex-nowrap justify-between gap-6 px-4">
          <div className="flex flex-col justify-center min-w-[100px]">
            <span className="text-[10px] uppercase font-bold opacity-60 mb-1 leading-tight">Manual<br/>Verification</span>
            <span className="text-xl font-bold border-t border-current/10 pt-1">
              {a.result.manual_index?.toFixed(2) ?? a.result.risk_index?.toFixed(2) ?? "—"}
            </span>
          </div>
          
          <div className="w-px bg-current/10 hidden md:block" />

          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold opacity-60 mb-1 leading-tight">Hazard<br/>Rating</span>
            <span className="text-lg font-bold border-t border-current/10 pt-1">{a.result.hazard_rating?.toFixed(3) ?? "—"}</span>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold opacity-60 mb-1 leading-tight">Vulnerability<br/>Rating</span>
            <span className="text-lg font-bold border-t border-current/10 pt-1">{a.result.vulnerability_rating?.toFixed(3) ?? "—"}</span>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-[10px] uppercase font-bold opacity-60 mb-1 leading-tight">Exposure<br/>Rating</span>
            <span className="text-lg font-bold border-t border-current/10 pt-1">{a.result.exposure_rating?.toFixed(3) ?? "—"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Left: AI Narrative */}
        <div className="space-y-4">
          {a.result.narrative && (
            <div className="h-full flex flex-col">
              <div className="label-sm mb-3 flex items-center gap-2">
                <span className="text-lg">🤖</span> AI Assessment Summary
              </div>
              <div className="flex-1 card p-6 bg-bark/[0.03] border-l-4 border-bark relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5 text-4xl font-serif">&quot;</div>
                <p className="text-sm leading-relaxed text-ink italic font-serif">
                  {a.result.narrative}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: COA */}
        <div className="space-y-4">
          {coa.length > 0 && (
            <div>
              <div className="label-sm mb-3 flex items-center gap-2">
                <span className="text-lg">🛠️</span> Prioritized Course of Action
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {coa.map((item, i) => {
                  const clean = item.replace(/^\d+\.\s*/, "");
                  const parts = clean.split(/(\*\*.*?\*\*)/);
                  return (
                    <div key={i} className="flex gap-3 bg-sand/50 p-3 rounded-lg text-sm border border-[var(--border)] hover:border-bark/30 transition-colors">
                      <span className="font-bold text-terracotta tabular-nums">{i + 1}.</span>
                      <span className="text-ink leading-snug">
                        {parts.map((p, j) => 
                          p.startsWith("**") && p.endsWith("**") 
                            ? <strong key={j} className="text-bark font-bold">{p.slice(2, -2)}</strong>
                            : p
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Detailed Data Sections */}
      <div className="space-y-6">
        <Section title="Location & Context">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <DataRow label="Address" val={a.building.address} />
            <DataRow label="Municipality" val={a.building.municipality} />
            <DataRow label="Province" val={a.building.province} />
            <DataRow label="Coordinates" val={`${a.building.latitude}, ${a.building.longitude}`} />
          </div>
        </Section>

        <Section title="Hazard Profile (A1-A3)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <DataRow label="Earthquake Intensity (PEIS)" val={a.hazard.earthquake_intensity} />
            <DataRow label="Fault Distance" val={`${a.hazard.fault_distance_km} km`} />
            <DataRow label="Fault Name" val={a.hazard.fault_name} />
            <DataRow label="Seismic Source (Mw)" val={a.hazard.seismic_source_type} />
            <DataRow label="Liquefaction Susceptibility" val={a.hazard.potential_liquefaction} />
            <DataRow label="Basic Wind Speed" val={`${a.hazard.basic_wind_speed_kph} kph`} />
            <DataRow label="Terrain" val={a.hazard.terrain} />
            <DataRow label="Slope" val={a.hazard.slope_degrees} />
            <DataRow label="Elevation" val={`${a.hazard.elevation_m} m`} />
            <DataRow label="Distance to Water" val={`${a.hazard.distance_to_water_m} m`} />
            <DataRow label="Water Body Name" val={a.hazard.water_body_name} />
            <DataRow label="Surface Runoff" val={Array.isArray(a.hazard.surface_runoff) ? a.hazard.surface_runoff.join(', ') : a.hazard.surface_runoff} />
            <DataRow label="Base Height" val={a.hazard.base_height} />
            <DataRow label="Drainage System" val={a.hazard.drainage_system} />
          </div>
        </Section>

        <Section title="Vulnerability & Structural (C1-C4)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <DataRow label="Building Code Era" val={a.vulnerability.building_code} />
            <DataRow label="Structural Material" val={Array.isArray(a.vulnerability.structural_material) ? a.vulnerability.structural_material.join(', ') : a.vulnerability.structural_material} />
            <DataRow label="Framing Type" val={Array.isArray(a.vulnerability.structural_framing_type) ? a.vulnerability.structural_framing_type.join(', ') : a.vulnerability.structural_framing_type} />
            <DataRow label="Plan Irregularity" val={Array.isArray(a.vulnerability.plan_irregularity) ? a.vulnerability.plan_irregularity.join(', ') : a.vulnerability.plan_irregularity} />
            <DataRow label="Vertical Irregularity" val={a.vulnerability.vertical_irregularity} />
            <DataRow label="Building Proximity" val={a.vulnerability.building_proximity} />
            <DataRow label="Building Enclosure" val={Array.isArray(a.vulnerability.building_enclosure) ? a.vulnerability.building_enclosure.join(', ') : a.vulnerability.building_enclosure} />
            <DataRow label="Number of Bays" val={a.vulnerability.number_of_bays} />
            <DataRow label="Column Spacing" val={`${a.vulnerability.column_spacing_m} m`} />
            <DataRow label="Wall Material" val={Array.isArray(a.vulnerability.wall_material) ? a.vulnerability.wall_material.join(', ') : a.vulnerability.wall_material} />
            <DataRow label="Flooring Material" val={Array.isArray(a.vulnerability.flooring_material) ? a.vulnerability.flooring_material.join(', ') : a.vulnerability.flooring_material} />
            <DataRow label="Roof Design" val={Array.isArray(a.vulnerability.roof_design) ? a.vulnerability.roof_design.join(', ') : a.vulnerability.roof_design} />
            <DataRow label="Roof Material" val={Array.isArray(a.vulnerability.roofing_material) ? a.vulnerability.roofing_material.join(', ') : a.vulnerability.roofing_material} />
            <DataRow label="Roof Slope" val={a.vulnerability.roof_slope} />
            <DataRow label="Roof Fastener" val={Array.isArray(a.vulnerability.roof_fastener) ? a.vulnerability.roof_fastener.join(', ') : a.vulnerability.roof_fastener} />
            <DataRow label="Fastener Spacing" val={`${a.vulnerability.roof_fastener_distance_mm} mm`} />
          </div>
        </Section>

        <Section title="Building Condition">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <DataRow label="Maximum Crack Width" val={a.vulnerability.maximum_crack} />
            <DataRow label="Uneven Settlement" val={a.vulnerability.uneven_settlement ? "Yes" : "No"} />
            <DataRow label="Beam/Column Deformations" val={a.vulnerability.beam_column_deformations ? "Yes" : "No"} />
            <DataRow label="Finishing Condition" val={a.vulnerability.finishing_condition ? "Yes" : "No"} />
            <DataRow label="Decay of Structural Members" val={a.vulnerability.decay_of_structural_member ? "Yes" : "No"} />
            <DataRow label="Additional Loads" val={a.vulnerability.additional_loads ? "Yes" : "No"} />
          </div>
        </Section>

        <Section title="Value Assessment (Exposure)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <DataRow label="B1.1 Theme & Proportion" val={a.exposure.b11} />
            <DataRow label="B1.2 Uniqueness" val={a.exposure.b12} />
            <DataRow label="B1.3 Typical Style" val={a.exposure.b13} />
            <DataRow label="B1.4 Integration" val={a.exposure.b14} />
            <DataRow label="B2.1 Age Score" val={a.exposure.b21} />
            <DataRow label="B2.2 Relevance" val={a.exposure.b22} />
            <DataRow label="B2.3 Geographic Impact" val={a.exposure.b23} />
            <DataRow label="B2.4 Heritage Tie" val={a.exposure.b24} />
            <DataRow label="B2.5 Important Message" val={a.exposure.b25} />
            <DataRow label="B3.1 Promotion" val={a.exposure.b31} />
            <DataRow label="B3.2 Suggestions" val={a.exposure.b32} />
            <DataRow label="B3.3 Importance" val={a.exposure.b33} />
            <DataRow label="B3.4 No Efforts (Inverted)" val={a.exposure.b34} />
            <DataRow label="B4.1 Tourist Attraction" val={a.exposure.b41} />
            <DataRow label="B4.2 Tourism Contrib." val={a.exposure.b42} />
            <DataRow label="B4.3 Goods & Services" val={a.exposure.b43} />
            <DataRow label="B4.4 Adaptive Use" val={a.exposure.b44} />
          </div>
        </Section>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--border)] pt-5">
      <h4 className="label-sm text-bark mb-4 tracking-wider uppercase text-[10px] font-bold">{title}</h4>
      {children}
    </div>
  );
}

function DataRow({ label, val }: { label: string; val: any }) {
  return (
    <div className="flex justify-between border-b border-sand pb-1.5">
      <span className="text-[var(--ink-lt)] text-xs">{label}</span>
      <span className="font-semibold text-ink text-xs">{val ?? "—"}</span>
    </div>
  );
}
