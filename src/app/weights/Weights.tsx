"use client";
import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { DEFAULT_WEIGHTS, type RiskWeights } from "@/lib/risk-calculator";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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

        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm font-semibold">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Section title="Hazard Weights" color="border-terracotta">
            {Object.entries(weights.hazard).map(([k, v]) => (
              <WeightInput key={k} label={k} value={v} onChange={val => update("hazard", k, val)} />
            ))}
          </Section>

          <Section title="Vulnerability Weights" color="border-bark">
            {Object.entries(weights.vulnerability).map(([k, v]) => (
              <WeightInput key={k} label={k} value={v} onChange={val => update("vulnerability", k, val)} />
            ))}
          </Section>

          <Section title="Exposure Weights" color="border-sienna">
             {Object.entries(weights.exposure).map(([k, v]) => (
              <WeightInput key={k} label={k} value={v} onChange={val => update("exposure", k, val)} />
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
      <h3 className="font-bold text-ink mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function WeightInput({ label, value, onChange }: { label: string, value: number, onChange: (v: string) => void }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <label className="text-[var(--ink-lt)] capitalize">{label.replace(/_/g, " ")}</label>
      <input
        type="number"
        step="0.001"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-20 p-1.5 border border-[var(--border)] rounded text-right font-mono text-ink focus:border-terracotta focus:ring-1 focus:ring-terracotta outline-none transition-all"
      />
    </div>
  );
}
