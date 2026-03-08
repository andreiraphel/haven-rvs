"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import StatCard from "@/components/ui/StatCard";
import RiskBadge from "@/components/ui/RiskBadge";
import Modal from "@/components/ui/Modal";
import { getSupabase } from "@/lib/supabase";
import type { Assessment, Building, RiskResult } from "@/types";

interface CombinedData {
  building: Building;
  result: RiskResult;
}

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<CombinedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CombinedData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    async function fetchData() {
      try {
        const sb = getSupabase();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;

        const res = await fetch("/api/buildings", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        });
        
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        
        // Map the API response to our CombinedData structure
        const mapped: CombinedData[] = data.map((b: any) => ({
          building: b,
          result: b.risk_results?.[0] || {
            risk_index: 0,
            risk_description: "LOW RISK",
            hazard_rating: 0,
            vulnerability_rating: 0,
            exposure_rating: 0,
            risk_rating: 0,
          }
        }));
        
        setAssessments(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = {
    total: assessments.length,
    low: assessments.filter(a => a.result.risk_description === "LOW RISK").length,
    mod: assessments.filter(a => a.result.risk_description === "MODERATE RISK").length,
    high: assessments.filter(a => a.result.risk_description === "HIGH RISK").length,
  };

  const totalPages = Math.ceil(assessments.length / ITEMS_PER_PAGE);
  const paginated = assessments.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <>
      <Topbar />
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-7">
          <h2 className="font-sora font-bold text-2xl text-ink">Dashboard</h2>
          <p className="text-[var(--ink-lt)] text-sm mt-1">Overview of all evaluated heritage buildings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon="🏛️" label="Total Buildings"       value={stats.total} color="default" />
          <StatCard icon="✅" label="Low Risk Buildings"    value={stats.low}   color="low" />
          <StatCard icon="⚠️" label="Moderate Risk"         value={stats.mod}   color="mod" />
          <StatCard icon="🚨" label="High Risk Buildings"   value={stats.high}  color="high" />
        </div>

        {/* Table Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="section-title">Recent Evaluations</h3>
          <Link href="/questionnaire" className="btn-primary text-xs px-4 py-2.5 w-full sm:w-auto">+ New Assessment</Link>
        </div>
        
        {loading ? (
          <div className="card p-12 flex flex-col items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-terracotta border-t-transparent rounded-full mb-4"></div>
            <p className="text-[var(--ink-lt)] text-sm">Loading evaluations…</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="card p-16 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">📭</div>
            <h4 className="font-sora font-bold text-lg text-ink">No assessments found</h4>
            <p className="text-[var(--ink-lt)] text-sm max-w-xs mt-1 mb-6">
              Start by creating your first rapid visual screening for a heritage building.
            </p>
            <Link href="/questionnaire" className="btn-primary">Create First Assessment</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card overflow-x-auto">
              <table className="w-full border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-sand border-b border-[var(--border)]">
                    {["Building", "Code", "Location", "Risk Index", "Risk Level"].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 label-sm">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a, i) => (
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
                          a.result.risk_description === "LOW RISK" ? "text-[var(--risk-low)]" :
                          a.result.risk_description === "MODERATE RISK" ? "text-[var(--risk-mod)]" :
                          "text-[var(--risk-high)]"
                        }`}>{a.result.risk_index.toFixed(2)}</span>
                      </td>
                      <td className="px-5 py-4"><RiskBadge level={a.result.risk_description} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
                <p className="text-xs text-[var(--ink-lt)] font-medium text-center sm:text-left">
                  Showing <span className="text-ink">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-ink">{Math.min(currentPage * ITEMS_PER_PAGE, assessments.length)}</span> of <span className="text-ink">{assessments.length}</span> assessments
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
        )}
      </main>

      {/* Detail modal */}
      {selected && <BuildingModal assessment={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function BuildingModal({ assessment: a, onClose }: { assessment: CombinedData; onClose: () => void }) {
  const rc = a.result.risk_description;
  const riskCls =
    rc === "LOW RISK"      ? "bg-[var(--risk-low-bg)] border-[#b7e4cb] text-[var(--risk-low)]"
    : rc === "MODERATE RISK" ? "bg-[var(--risk-mod-bg)] border-[#ffe0a0] text-[var(--risk-mod)]"
    : "bg-[var(--risk-high-bg)] border-[#f5b8b8] text-[var(--risk-high)]";

  const coa = a.result.ai_course_of_action?.split("\n").filter(Boolean) ?? [];

  return (
    <Modal open onClose={onClose} title={a.building.name} wide
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <Link href="/risk-summary" className="btn-primary text-xs px-4 py-2">View Full Summary →</Link>
        </>
      }
    >
      {/* 1. Quick Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Code", a.building.unique_code],
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Left: Risk Score Card */}
        <div className="md:col-span-1">
          <div className={`rounded-xl border p-6 flex flex-col items-center text-center h-full justify-center ${riskCls}`}>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2 opacity-70 text-current">Risk Index</div>
            <div className="font-sora font-extrabold text-6xl leading-none mb-2">
              {a.result.risk_index?.toFixed(2) ?? "—"}
            </div>
            <div className="text-sm font-bold uppercase tracking-widest">{rc}</div>
            
            <div className="w-full mt-6 space-y-3 pt-6 border-t border-current/20">
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Hazard</span>
                <span className="font-bold">{a.result.hazard_rating?.toFixed(3) ?? "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Vulnerability</span>
                <span className="font-bold">{a.result.vulnerability_rating?.toFixed(3) ?? "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Exposure</span>
                <span className="font-bold">{a.result.exposure_rating?.toFixed(3) ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Narrative & COA */}
        <div className="md:col-span-2 space-y-6">
          {a.result.narrative ? (
            <div className="card p-5 bg-bark/5 border-l-4 border-bark">
              <div className="label-sm mb-2 flex items-center gap-2">
                <span>🤖</span> AI Summary
              </div>
              <p className="text-sm leading-relaxed text-ink italic font-serif">
                &quot;{a.result.narrative}&quot;
              </p>
            </div>
          ) : (
            <div className="card p-5 bg-sand text-center text-[var(--ink-lt)] text-xs italic">
              AI Analysis not available for this record.
            </div>
          )}

          {coa.length > 0 && (
            <div>
              <div className="label-sm mb-3">🛠 Recommended Actions</div>
              <div className="grid grid-cols-1 gap-2">
                {coa.map((item, i) => (
                  <div key={i} className="flex gap-3 bg-sand p-3 rounded-lg text-sm border border-[var(--border)]">
                    <span className="font-bold text-terracotta">{i + 1}.</span>
                    <span className="text-ink leading-snug">{item.replace(/^\d+\.\s*/, "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-sand p-4 rounded-lg border border-[var(--border)] text-center">
        <p className="text-xs text-[var(--ink-lt)]">
          Address: <span className="font-medium text-ink">{a.building.address}, {a.building.municipality}, {a.building.province}</span>
        </p>
      </div>
    </Modal>
  );
}
