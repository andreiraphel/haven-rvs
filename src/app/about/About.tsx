"use client";
import Topbar from "@/components/layout/Topbar";

export default function AboutPage() {
  return (
    <>
      <Topbar />
      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="mb-7">
          <h2 className="font-sora font-bold text-2xl text-ink">About HAVEN-RVS</h2>
          <p className="text-[var(--ink-lt)] text-sm mt-1">Research background and system overview</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 card p-8">
            <h3 className="font-sora font-bold text-lg text-ink mb-4 pb-4 border-b border-[var(--border)]">
              About the Website
            </h3>
            <div className="space-y-4 text-[15px] leading-relaxed text-[var(--ink-lt)]">
              <p>
                <strong className="text-ink">HAVEN-RVS</strong> (Heritage and Ancestral Houses Visual Evaluation
                Network – Rapid Visual Screening) is a specialized tool for the rapid structural risk screening of
                heritage and ancestral houses in the Philippines.
              </p>
              <p>
                The system is uniquely powered by a dual-AI architecture. A <strong className="text-ink">Custom-Trained Machine Learning Model</strong> (XGBoost) calculates the numerical Risk Index, while <strong className="text-ink">Google Gemini AI</strong> generates contextualized prioritization narratives and course-of-action reports for each structure.
              </p>
              <p>
                Hazard indicators covering earthquake intensity, fault proximity, wind speed, slope, elevation, and
                proximity to bodies of water are combined with structural vulnerability factors to produce a
                science-backed risk score.
              </p>
              <p>
                The platform is designed for field evaluators, heritage researchers, government planners, and local
                authorities involved in cultural heritage preservation and disaster preparedness in the Philippines.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: "🔬", title: "Research-Grade", desc: "Methodology based on PHIVOLCS, NSCP 2015, and engineering best practices" },
                { icon: "🤖", title: "Dual-AI Powered", desc: "Custom-trained model for risk scoring & Gemini for course-of-action generation" },
                { icon: "📊", title: "Risk Analytics", desc: "Hazard × Vulnerability × Exposure model with 0–10 risk index" },
                { icon: "🗺️", title: "Map Visualization", desc: "Geospatial view of risk distribution with filterable risk levels" },
              ].map(f => (
                <div key={f.title} className="bg-sand rounded-xl p-5 border border-transparent hover:border-clay/20 transition-colors">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <div className="font-sora font-bold text-sm text-ink mb-1">{f.title}</div>
                  <div className="text-xs text-[var(--ink-lt)] leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="font-sora font-bold text-lg text-ink mb-4 pb-4 border-b border-[var(--border)]">
                Research Team
              </h3>
              <div className="space-y-4">
                {[
                  { initials: "JG", name: "Engr. Joshua M. Gumia", role: "Author & Researcher", institution: "Universiti Teknologi PETRONAS, Malaysia" },
                  { initials: "BM", name: "AP IR Dr. Bashar S. Mohammed", role: "Thesis Supervisor", institution: "Universiti Teknologi PETRONAS, Malaysia" },
                ].map(p => (
                  <div key={p.initials} className="flex gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-terracotta to-sienna text-white font-bold font-sora flex items-center justify-center flex-shrink-0">
                      {p.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-ink">{p.name}</div>
                      <div className="text-xs text-[var(--ink-lt)] mt-0.5">{p.role}</div>
                      <div className="text-xs text-[var(--ink-lt)]">{p.institution}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-sora font-bold text-lg text-ink mb-4 pb-4 border-b border-[var(--border)]">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Next.js 14", "TypeScript", "Tailwind CSS", "FastAPI", "Supabase", "Gemini AI", "Python ML", "Google Cloud"].map(t => (
                  <span key={t} className="bg-sand border border-[var(--border)] text-[var(--ink-lt)] text-xs px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-sora font-bold text-lg text-ink mb-3">Risk Scale Reference</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center"><span className="risk-badge-low">Low Risk</span><span className="text-xs text-[var(--ink-lt)]">Index ≤ 3.58</span></div>
                <div className="flex justify-between items-center"><span className="risk-badge-mod">Moderate Risk</span><span className="text-xs text-[var(--ink-lt)]">3.58 – 6.79</span></div>
                <div className="flex justify-between items-center"><span className="risk-badge-high">High Risk</span><span className="text-xs text-[var(--ink-lt)]">Index &gt; 6.79</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
