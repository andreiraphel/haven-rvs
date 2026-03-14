"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import type { Building, HazardIndicators, VulnerabilityIndicators, ExposureIndicators, RiskResult, RiskLevel } from "@/types";
import { getSupabase } from "@/lib/supabase";
import { calculateAssessmentRisk } from "@/lib/risk-calculator";
import { RUNOFF_MAP, PLAN_MAP, MAT_MAP, ENCL_MAP, WALL_MAP, FRAME_MAP, FLOOR_MAP, ROOF_DESIGN_MAP, ROOF_MAT_MAP, FAST_TYPE_MAP } from "@/lib/maps";

// ... (rest of the file is the same until computeAndShow)

type Step = "building" | "hazard" | "exposure" | "vulnerability" | "result";

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "building",      label: "Building Info",     icon: "🏛️" },
  { key: "hazard",        label: "Hazard Indicators",  icon: "⚠️" },
  { key: "exposure",      label: "Value Assessment",   icon: "💎" },
  { key: "vulnerability", label: "Vulnerability",      icon: "🔩" },
  { key: "result",        label: "Weight Summary",     icon: "📊" },
];

type QualitativeSelectProps = {
  value: string | string[]
  options: string[]
  onChange: (v: string | string[]) => void
  multiple?: boolean
}

function QualitativeSelect({
  value,
  options,
  onChange,
  multiple = false,
}: QualitativeSelectProps) {
  const toggle = (opt: string) => {
    if (!multiple) {
      // single-select mode
      onChange(opt)
    } else {
      // multi-select mode
      const arr = Array.isArray(value) ? value : []
      if (arr.includes(opt)) {
        onChange(arr.filter(v => v !== opt))
      } else {
        onChange([...arr, opt])
      }
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const selected = multiple
          ? Array.isArray(value) && value.includes(opt)
          : value === opt

        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              selected
                ? "bg-bark text-white border-bark shadow-sm"
                : "bg-white text-[var(--ink-lt)] border-[var(--border)] hover:bg-sand"
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function SurveySelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const options = [
    { label: "Disagree", val: 1 },
    { label: "Neutral",  val: 2 },
    { label: "Agree",    val: 3 },
  ];
  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={opt.val}
          type="button"
          onClick={() => onChange(opt.val)}
          className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
            value === opt.val
              ? "bg-bark text-white border-bark shadow-sm"
              : "bg-white text-[var(--ink-lt)] border-[var(--border)] hover:bg-sand"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function QuestionnairePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const isEditing = !!editId;

  const [step, setStep]       = useState<Step>("building");
  const [building, setBuilding] = useState<Partial<Building>>({});
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();
  
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) {
        router.replace("/login");
      }
    }
    checkAuth();
  }, [router]);

  const [hazard, setHazard]   = useState<Partial<HazardIndicators>>({});
  const [vuln, setVuln]       = useState<Partial<VulnerabilityIndicators>>({});
  const [exposure, setExposure] = useState<Partial<ExposureIndicators>>({
    b11: 2, b12: 2, b13: 2, b14: 2,
    b21: 2, b22: 2, b23: 2, b24: 2, b25: 2,
    b31: 2, b32: 2, b33: 2, b34: 2,
    b41: 2, b42: 2, b43: 2, b44: 2
  });
  const [isStubFilled, setIsStubFilled] = useState(false);
  const [result, setResult]   = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [numInputs, setNumInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadEditData() {
      if (!editId) return;
      setLoading(true);
      try {
        const sb = getSupabase();
        
        const { data: bData, error: bErr } = await sb.from("buildings").select("*").eq("id", editId).single();
        if (bErr) throw bErr;
        
        const { data: hData } = await sb.from("hazard_indicators").select("*").eq("building_id", editId).single();
        const { data: vData } = await sb.from("vulnerability_indicators").select("*").eq("building_id", editId).single();
        const { data: eData } = await sb.from("exposure_indicators").select("*").eq("building_id", editId).single();
        
        setBuilding(bData || {});
        setBuildingId(editId);
        if (hData) setHazard(hData);
        if (vData) setVuln(vData);
        if (eData) setExposure(eData);

        // Pre-fill number inputs as strings
        const strings: Record<string, string> = {};
        if (bData) Object.entries(bData).forEach(([k, v]) => { if (typeof v === 'number') strings[k] = String(v); });
        if (hData) Object.entries(hData).forEach(([k, v]) => { if (typeof v === 'number') strings[k] = String(v); });
        if (vData) Object.entries(vData).forEach(([k, v]) => { if (typeof v === 'number') strings[k] = String(v); });
        setNumInputs(strings);
      } catch (err: any) {
        console.error("Failed to load assessment for editing", err);
        setError("Failed to load existing assessment. " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEditData();
  }, [editId]);

  function setB(k: string, v: unknown) { setBuilding(f => ({ ...f, [k]: v })); }
  function setH(k: string, v: unknown) { setHazard(f => ({ ...f, [k]: v })); }
  function setV(k: string, v: unknown) { setVuln(f => ({ ...f, [k]: v })); }
  function setE(k: string, v: number) { setExposure(f => ({ ...f, [k]: v })); }
  
  function handleNum(k: string, v: string, setter: (k: string, num: number) => void) {
    setNumInputs(prev => ({ ...prev, [k]: v }));
    if (v === "" || v === "-") return;
    const num = parseFloat(v);
    if (!isNaN(num)) setter(k, num);
  }

  function fillStub() {
    setIsStubFilled(true);
    
    // Choose a random profile every time
    const profile = Math.floor(Math.random() * 3);
    const label = ["LOW", "MOD", "HIGH"][profile];
    
    // Helper: Pick with variety
    const pick = (opts: any[]) => {
      const idx = Math.floor(Math.random() * opts.length);
      if (profile === 0) return opts[Math.min(idx, 1)];
      if (profile === 2) return opts[Math.max(idx, opts.length - 2)];
      return opts[idx];
    };

    const randNum = (min: number, max: number) => {
      const base = min + Math.random() * (max - min);
      if (profile === 0) return min + (base - min) * 0.3;
      if (profile === 2) return max - (max - base) * 0.3;
      return base;
    };

    const randScore = () => {
      const dice = Math.random();
      if (profile === 0) return dice > 0.8 ? 2 : 1;
      if (profile === 2) return dice > 0.8 ? 2 : 3;
      return Math.floor(Math.random() * 3) + 1;
    };

    const stubBuilding = {
      name: `${["Amihan", "Balai", "Casa"][Math.floor(Math.random()*3)]} ${["Heritage", "Legacy", "Grand"][Math.floor(Math.random()*3)]} ${Math.floor(Math.random() * 999)}`,
      unique_code: `${label}-` + Math.random().toString(36).substring(2, 7).toUpperCase(),
      year_built: profile === 0 ? 2005 + Math.floor(Math.random()*15) : profile === 1 ? 1950 + Math.floor(Math.random()*40) : 1880 + Math.floor(Math.random()*40),
      address: `${Math.floor(Math.random()*500)} ${["Rizal", "Mabini", "Luna"][Math.floor(Math.random()*3)]} St.`,
      municipality: ["Tagbilaran", "Baclayon", "Loboc", "Loon"][Math.floor(Math.random()*4)],
      province: "Bohol",
      latitude: 9.6 + (Math.random() * 0.2),
      longitude: 123.8 + (Math.random() * 0.2),
      building_type: pick(["Timber Building", "Concrete Building", "Masonry Building"]),
      building_use: "Residential",
      number_of_floors: profile === 0 ? 1 : profile === 1 ? 2 : 3 + Math.floor(Math.random()*2)
    };

    const stubHazard = {
      earthquake_intensity: pick(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]),
      fault_distance_km: randNum(0.5, 20),
      fault_name: "Local Fault Line",
      seismic_source_type: randNum(5.5, 8.2),
      potential_liquefaction: pick(["Safe", "Least Susceptible", "Moderately Susceptible", "Highly Susceptible"]),
      basic_wind_speed_kph: randNum(150, 320),
      terrain: pick(["Numerous Obstruction", "Minimal Obstruction", "Flat Terrain"]),
      slope_degrees: pick(["1-8 degrees", "9-30 degrees", "31-60 degrees"]),
      elevation_m: randNum(1, 50),
      distance_to_water_m: randNum(10, 1000),
      water_body_name: "Inland Creek",
      surface_runoff: pick(["Soil", "Grass", "Grass/Soil", "Grass/Concrete", "Concrete"]),
      base_height: pick(["Base is higher", "Same Level", "Base is lower"]),
      drainage_system: pick(["Closed drainage system", "Open drainage system", "No Drainage System"])
    };

    const stubVuln = {
      building_code: pick(["New Code (1992-present)", "Post-Code (1972-1991)", "Pre-Code (before 1972)"]),
      plan_irregularity: pick(["Rectangular", "Square", "T- shaped", "Irregular Shaped", "L-shaped"]),
      vertical_irregularity: pick(["No vertical irregularity", "1 Vertical Irregularity", "2 Vertical Irregularities"]),
      building_proximity: pick(["No adjacent buildings", "6 inches and above", "below 6 inches"]),
      number_of_stories: stubBuilding.number_of_floors,
      structural_material: stubBuilding.building_type === "Timber Building" ? "Timber Frame" : pick(["Reinforced Concrete", "Unreinforced Masonry"]),
      structural_framing_type: pick(["Braced", "Special Moment-Resisting Frame", "Shearwall", "Ordinary Frame"]),
      number_of_bays: profile === 0 ? 5 + Math.floor(Math.random()*3) : profile === 1 ? 3 + Math.floor(Math.random()*2) : 1 + Math.floor(Math.random()*2),
      column_spacing_m: randNum(2, 8),
      building_enclosure: pick(["Enclosed", "Partially Open", "Open"]),
      wall_material: pick(["Reinforced Concrete", "Reinforced Masonry", "Unreinforced Masonry", "Wood", "Bamboo", "Glass", "Masonry"]),
      flooring_material: pick(["Concrete", "Tiles", "Hardwood", "Bamboo", "Earth Mud"]),
      maximum_crack: profile === 0 ? "0.1 mm" : profile === 1 ? "2.0 mm" : "12.0 mm",
      uneven_settlement: profile === 2 ? Math.random() > 0.3 : Math.random() > 0.8,
      beam_column_deformations: profile === 2 ? Math.random() > 0.3 : Math.random() > 0.8,
      finishing_condition: profile === 2 ? Math.random() > 0.3 : Math.random() > 0.8,
      decay_of_structural_member: profile === 2 ? Math.random() > 0.2 : Math.random() > 0.9,
      additional_loads: profile === 2 ? Math.random() > 0.4 : Math.random() > 0.9,
      roof_design: pick(["Hip", "Dutch Hip", "Gable", "Cross Hip Roof", "Monoslope"]),
      roof_slope: pick(["30 to 45 degrees", "above 45 degrees", "below 30 degrees"]),
      roofing_material: pick(["Tiles", "Concrete", "Galvanized Iron Sheets", "Metals", "Asphalt Shingles", "Wood", "Thatch", "Shingles"]),
      roof_fastener: pick(["Metal Screw", "Nails", "Staples", "Hazel Spars"]),
      roof_fastener_distance_mm: randNum(150, 600)
    };

    const stubExposure = {
      b11: randScore(), b12: randScore(), b13: randScore(), b14: randScore(),
      b21: profile === 0 ? 1 : profile === 1 ? 2 : 3,
      b22: randScore(), b23: randScore(), b24: randScore(), b25: randScore(),
      b31: randScore(), b32: randScore(), b33: randScore(), b34: randScore(),
      b41: randScore(), b42: randScore(), b43: randScore(), b44: randScore()
    };

    setBuilding(stubBuilding); setHazard(stubHazard); setVuln(stubVuln); setExposure(stubExposure);
    const strings: Record<string, string> = {};
    Object.entries(stubBuilding).forEach(([k, v]) => { if (typeof v === 'number') strings[k] = String(v); });
    Object.entries(stubHazard).forEach(([k, v]) => { if (typeof v === 'number') strings[k] = String(v); });
    Object.entries(stubVuln).forEach(([k, v]) => { if (typeof v === 'number') strings[k] = String(v); });
    setNumInputs(strings);
  }

  async function computeAndShow() {
      console.log("🚀 START: Compute Index Pressed");
      setLoading(true); setError(null);
      try {
        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("You must be logged in to submit an assessment.");
        console.log("👤 User authenticated:", user.id);

        // Manual Computation
        console.log("🔢 Running Manual Computation...");
        const manualResult = calculateAssessmentRisk(
          hazard as HazardIndicators,
          vuln as VulnerabilityIndicators,
          Number(building.year_built ?? 1950),
          isStubFilled,
          exposure as ExposureIndicators
        );
        console.log("✅ Manual Result:", manualResult);

        const { data: { session } } = await sb.auth.getSession();
        console.log("💾 Saving Building to Supabase...");
        
        const buildingEndpoint = "/api/buildings";
        const buildingMethod = isEditing ? "PUT" : "POST";
        const buildingPayload = isEditing ? { ...building, id: buildingId, created_by: user.id } : { ...building, created_by: user.id };

        const buildingRes = await fetch(buildingEndpoint, {
          method: buildingMethod,
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
          body: JSON.stringify(buildingPayload),
        });
        if (!buildingRes.ok) throw new Error("Failed to save building");
        const savedBuilding = await buildingRes.json();
        const activeBuildingId = savedBuilding.id;
        console.log("✅ Building Saved:", activeBuildingId);

        await sb.from("questionnaire_responses").insert({
          building_id: activeBuildingId, step: "final_submission",
          response: { building, hazard, vulnerability: vuln, exposure }
        });

        // Calculate b21 based on age
        const age = currentYear - Number(building.year_built ?? currentYear);
        const b21 = age <= 75 ? 1 : age <= 125 ? 2 : 3;
        const finalExposure = { ...exposure, b21, building_id: activeBuildingId };

        // Process multi-select fields for ML prediction and Gemini API
        const getHighestValue = (value: string | string[] | undefined, map: Record<string, number>): string | undefined => {
          if (Array.isArray(value)) {
            if (value.length === 0) return undefined;
            let maxValue = -1;
            let maxKey: string | undefined = undefined;
            for (const item of value) {
              const currentVal = map[item];
              if (currentVal > maxValue) {
                maxValue = currentVal;
                maxKey = item;
              }
            }
            return maxKey;
          }
          return value;
        }

        const processedHazard = { ...hazard };
        processedHazard.surface_runoff = getHighestValue(hazard.surface_runoff, RUNOFF_MAP);

        const processedVuln = { ...vuln };
        processedVuln.plan_irregularity = getHighestValue(vuln.plan_irregularity, PLAN_MAP);
        processedVuln.structural_material = getHighestValue(vuln.structural_material, MAT_MAP);
        processedVuln.building_enclosure = getHighestValue(vuln.building_enclosure, ENCL_MAP);
        processedVuln.wall_material = getHighestValue(vuln.wall_material, WALL_MAP);
        processedVuln.structural_framing_type = getHighestValue(vuln.structural_framing_type, FRAME_MAP);
        processedVuln.flooring_material = getHighestValue(vuln.flooring_material, FLOOR_MAP);
        processedVuln.roof_design = getHighestValue(vuln.roof_design, ROOF_DESIGN_MAP);
        processedVuln.roofing_material = getHighestValue(vuln.roofing_material, ROOF_MAT_MAP);
        processedVuln.roof_fastener = getHighestValue(vuln.roof_fastener, FAST_TYPE_MAP);

        // Fetch ML Prediction
        console.log("🤖 Calling ML API /api/predict...");
        let mlPred = 0;
        try {
          const mlRes = await fetch("/api/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hazard: processedHazard,
              vulnerability: processedVuln,
              exposure: finalExposure,
              year_built: Number(building.year_built ?? 1950),
              isStub: isStubFilled
            }),
          });
          if (mlRes.ok) {
            const mlData = await mlRes.json();
            mlPred = mlData.ml_prediction;
            console.log("✅ ML Prediction Success:", mlPred);
          } else {
            console.error("❌ ML Prediction failed with status:", mlRes.status);
          }
        } catch (mlErr) { console.error("❌ ML Prediction API call crashed:", mlErr); }

        // 3. Save all indicators
        console.log("📊 Saving Indicators...");
        
        let hRes, vRes, eRes;

        if (isEditing) {
          [hRes, vRes, eRes] = await Promise.all([
            sb.from("hazard_indicators").update({ ...hazard }).eq("building_id", activeBuildingId),
            sb.from("vulnerability_indicators").update({ ...vuln }).eq("building_id", activeBuildingId),
            sb.from("exposure_indicators").update(finalExposure).eq("building_id", activeBuildingId)
          ]);
        } else {
          [hRes, vRes, eRes] = await Promise.all([
            sb.from("hazard_indicators").insert({ ...hazard, building_id: activeBuildingId }),
            sb.from("vulnerability_indicators").insert({ ...vuln, building_id: activeBuildingId }),
            sb.from("exposure_indicators").insert(finalExposure)
          ]);
        }

        if (hRes.error) throw new Error(`Hazard data failed: ${hRes.error.message}`);
        if (vRes.error) throw new Error(`Vulnerability data failed: ${vRes.error.message}`);
        if (eRes.error) throw new Error(`Exposure data failed: ${eRes.error.message}`);
        console.log("✅ Indicators Saved");

        // 4. Generate AI Narrative & COA
        console.log("🧠 Calling Gemini AI /api/gemini...");
        let aiNarrative = ""; let aiCOA = "";
        try {
          const geminiRes = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              buildingName: building.name,
              riskIndex: mlPred,
              riskDescription: mlPred,
              hazardData: processedHazard,
              vulnerabilityData: processedVuln,
              exposureData: finalExposure,
            }),
          });
          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            aiNarrative = gData.narrative; aiCOA = gData.courseOfAction;
            console.log("✅ Gemini AI Success");
          } else {
            console.error("❌ Gemini API failed with status:", geminiRes.status);
          }
        } catch (gErr) { console.error("❌ Gemini AI call crashed:", gErr); }

        if (!aiNarrative) aiNarrative = `Assessment for ${building.name}: Index ${mlPred.toFixed(2)} (${mlPred}).`;
        if (!aiCOA) aiCOA = "1. Structural audit\n2. Connection check\n3. Decay check\n4. Disaster plan";

        // 5. Finalize Result (ML is primary, Manual is fallback/support)
        const primaryIndex = mlPred > 0 ? mlPred : manualResult.risk_index;

        // Determine description based on the Primary (ML) Index
        let finalDesc: RiskLevel = "LOW RISK";
        if (primaryIndex <= 3.58) finalDesc = "LOW RISK";
        else if (primaryIndex <= 6.79) finalDesc = "MODERATE RISK";
        else finalDesc = "HIGH RISK";

        console.log("🏁 Finalizing Result...");
        const { error: rErr } = await sb.from("risk_results").insert({
          building_id: savedBuilding.id,
          risk_index: primaryIndex,
          risk_description: finalDesc,
          hazard_rating: manualResult.hazard_rating,
          vulnerability_rating: manualResult.vulnerability_rating,
          exposure_rating: manualResult.exposure_rating,
          risk_rating: mlPred,
          ml_prediction: mlPred,
          manual_index: manualResult.risk_index,
          narrative: aiNarrative,
          ai_course_of_action: aiCOA,
          assessed_by: user.id,
        });

        if (rErr) throw new Error(`Risk result failed: ${rErr.message}`);

        setResult({
          ...manualResult,
          building_id: savedBuilding.id,
          risk_index: primaryIndex,
          risk_description: finalDesc,
          ml_prediction: mlPred,
          manual_index: manualResult.risk_index,
          narrative: aiNarrative,
          ai_course_of_action: aiCOA
        });
        console.log("🎉 SUCCESS: Moving to result step");
        setStep("result");
      } catch (err: any) {
        console.error("❌ CRITICAL ERROR in computeAndShow:", err);
        setError(err.message);
      } finally { setLoading(false); }
    }
  const stepIdx = STEPS.findIndex(s => s.key === step);
  const riskColor = result ? result.risk_description === "LOW RISK" ? "text-[var(--risk-low)] bg-[var(--risk-low-bg)] border-[#b7e4cb]" : result.risk_description === "MODERATE RISK" ? "text-[var(--risk-mod)] bg-[var(--risk-mod-bg)] border-[#ffe0a0]" : "text-[var(--risk-high)] bg-[var(--risk-high-bg)] border-[#f5b8b8]" : "";

  return (
    <>
      <Topbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-7 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="font-sora font-bold text-2xl text-ink">New Assessment</h2>
            <p className="text-[var(--ink-lt)] text-sm mt-1">Fill in all sections based on structural audit reference.</p>
          </div>
          <button onClick={fillStub} className="btn-secondary text-[10px] uppercase tracking-widest px-4 py-2 w-full sm:w-auto shadow-sm">⚡ Fill Test Data</button>
        </div>

        {/* Step Navigation - Scrollable on mobile */}
        <div className="overflow-x-auto pb-4 mb-4 -mx-4 px-4 scrollbar-hide">
          <div className="flex items-center min-w-[600px]">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center cursor-pointer min-w-[80px]" onClick={() => i <= stepIdx && setStep(s.key)}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors ${i < stepIdx  ? "bg-terracotta text-white" : i === stepIdx ? "bg-bark text-white" : "bg-[var(--border)] text-[var(--ink-lt)]"}`}>{i < stepIdx ? "✓" : s.icon}</div>
                  <span className={`text-[10px] mt-1.5 font-bold uppercase tracking-tight ${i === stepIdx ? "text-ink" : "text-[var(--ink-lt)]"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-2 mt-[-18px] ${i < stepIdx ? "bg-terracotta" : "bg-[var(--border)]"}`} />}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-700">⚠️ {error}</div>}

        <div className="card p-5 sm:p-8">
          {step === "building" && (
            <div className="space-y-5">
              <h3 className="font-sora font-bold text-lg text-ink">Building Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="label-sm block mb-2">Building Name *</label><input className="input-field" value={building.name ?? ""} onChange={e => setB("name", e.target.value)} /></div>
                <div><label className="label-sm block mb-2">Unique Code *</label><input className="input-field" value={building.unique_code ?? ""} onChange={e => setB("unique_code", e.target.value)} /></div>
                <div><label className="label-sm block mb-2">Year Built</label><input className="input-field" value={numInputs.year_built ?? building.year_built ?? ""} onChange={e => handleNum("year_built", e.target.value, setB)} /></div>
                <div className="sm:col-span-2"><label className="label-sm block mb-2">Address</label><input className="input-field" value={building.address ?? ""} onChange={e => setB("address", e.target.value)} /></div>
                <div><label className="label-sm block mb-2">Municipality</label><input className="input-field" value={building.municipality ?? ""} onChange={e => setB("municipality", e.target.value)} /></div>
                <div><label className="label-sm block mb-2">Province</label><input className="input-field" value={building.province ?? ""} onChange={e => setB("province", e.target.value)} /></div>
                <div><label className="label-sm block mb-2">Latitude</label><input className="input-field" value={numInputs.latitude ?? building.latitude ?? ""} onChange={e => handleNum("latitude", e.target.value, setB)} /></div>
                <div><label className="label-sm block mb-2">Longitude</label><input className="input-field" value={numInputs.longitude ?? building.longitude ?? ""} onChange={e => handleNum("longitude", e.target.value, setB)} /></div>
                <div><label className="label-sm block mb-2">Building Type</label><select className="input-field" value={building.building_type ?? ""} onChange={e => setB("building_type", e.target.value)}><option value="">Select…</option><option>Timber Building</option><option>Concrete Building</option><option>Masonry Building</option></select></div>
                <div><label className="label-sm block mb-2">Building Use</label><select className="input-field" value={building.building_use ?? ""} onChange={e => setB("building_use", e.target.value)}><option value="">Select…</option><option>Residential</option><option>Commercial</option><option>Mixed Use</option></select></div>
                <div><label className="label-sm block mb-2">Floors</label><input className="input-field" value={numInputs.number_of_floors ?? building.number_of_floors ?? ""} onChange={e => handleNum("number_of_floors", e.target.value, setB)} /></div>
              </div>
              <div className="flex justify-end pt-2"><button className="btn-primary w-full sm:w-auto" onClick={() => setStep("hazard")}>Next: Hazard →</button></div>
            </div>
          )}

          {step === "hazard" && (
            <div className="space-y-6">
              <h3 className="font-sora font-bold text-lg text-ink">Hazard Indicators</h3>
              <Section title="A1 — Seismic">
                <QField label="A1.1 PHIVOLCS EARTHQUAKE INTENSITY SCALE (PEIS)" sub="Low (Intensity IV and below) ; Moderate (Intensity V to Intensity VI) ; High (Intensity VII and above)"><QualitativeSelect value={hazard.earthquake_intensity ?? ""} options={["I","II","III","IV","V","VI","VII","VIII","IX","X"]} onChange={v => setH("earthquake_intensity",v)} /></QField>
                <QField label="A1.2 Fault Distance (km)" sub="Low(>10) ; Mod(5-10) ; High(<5)"><input className="input-field" value={numInputs.fault_distance_km ?? hazard.fault_distance_km ?? ""} onChange={e => handleNum("fault_distance_km", e.target.value, setH)} /></QField>
                <QField label="A1.3 Source (Mw)" sub="Low(<6.5) ; Mod(6.5-7) ; High(7-8.4)"><input className="input-field" value={numInputs.seismic_source_type ?? hazard.seismic_source_type ?? ""} onChange={e => handleNum("seismic_source_type", e.target.value, setH)} /></QField>
                <QField label="A1.4 Liquefaction" sub="Low(Safe) ; Mod(Moderate) ; High(Highly)"><QualitativeSelect value={hazard.potential_liquefaction ?? ""} options={["Safe","Least Susceptible","Moderately Susceptible","Highly Susceptible"]} onChange={v => setH("potential_liquefaction",v)} /></QField>
              </Section>
              <Section title="A2 — Wind">
                <QField label="A2.1 Wind Speed (kph)" sub="Low(<=225) ; Mod(226-279) ; High(>=280)"><input className="input-field" value={numInputs.basic_wind_speed_kph ?? hazard.basic_wind_speed_kph ?? ""} onChange={e => handleNum("basic_wind_speed_kph", e.target.value, setH)} /></QField>
                <QField label="A2.2 Vicinity" sub="Low(Numerous) ; Mod(Minimal) ; High(Flat)"><QualitativeSelect value={hazard.terrain ?? ""} options={["Numerous Obstruction","Minimal Obstruction","Flat Terrain"]} onChange={v => setH("terrain",v)} /></QField>
              </Section>
              <Section title="A3 — Flood/Geo">
                <QField label="A3.1 Slope" sub="Low(1-8°) ; Mod(9-30°) ; High(>30°)"><QualitativeSelect value={hazard.slope_degrees ?? ""} options={["1-8 degrees","9-30 degrees","31-60 degrees","above 60 degrees"]} onChange={v => setH("slope_degrees",v)} /></QField>
                <QField label="A3.2 Elevation (m)" sub="Low(>10) ; Mod(5-10) ; High(<5)"><input className="input-field" value={numInputs.elevation_m ?? hazard.elevation_m ?? ""} onChange={e => handleNum("elevation_m", e.target.value, setH)} /></QField>
                <QField label="A3.3 Dist. to Water (m)" sub="Low(>500) ; Mod(200-500) ; High(<200)"><input className="input-field" value={numInputs.distance_to_water_m ?? hazard.distance_to_water_m ?? ""} onChange={e => handleNum("distance_to_water_m", e.target.value, setH)} /></QField>
                <QField label="A3.4 Surface" sub="Low(Lawn/Grass) ; Mod(Clay) ; High(Concrete/Asphalt/Brick)"><QualitativeSelect multiple value={hazard.surface_runoff ?? []} options={["Lawn","Grass","Clay","Concrete", "Asphalt", "Brick"]} onChange={v => setH("surface_runoff", v)} /></QField>
                <QField label="A3.5 Base Height" sub="Low(Higher) ; Mod(Same) ; High(Lower)"><QualitativeSelect value={hazard.base_height ?? ""} options={["Base is higher","Same Level","Base is lower"]} onChange={v => setH("base_height",v)} /></QField>
                <QField label="A3.6 Drainage" sub="Low(Maint.) ; Mod(Seldom) ; High(No)"><QualitativeSelect value={hazard.drainage_system ?? ""} options={["Closed drainage system","Open drainage system","No Drainage System"]} onChange={v => setH("drainage_system",v)} /></QField>
              </Section>
              <div className="flex justify-between pt-2"><button className="btn-secondary" onClick={() => setStep("building")}>← Back</button><button className="btn-primary" onClick={() => setStep("exposure")}>Next: Values →</button></div>
            </div>
          )}

          {step === "exposure" && (
            <div className="space-y-6">
              <h3 className="font-sora font-bold text-lg text-ink">Value Assessment (Exposure)</h3>
              
              <Section title="B1 — Architectural Value">
                <QField label="B1.1 Theme & Proportion" sub="The aesthetic theme reflects building's proportion, decoration and landscape."><SurveySelect value={exposure.b11!} onChange={v => setE("b11", v)} /></QField>
                <QField label="B1.2 Uniqueness" sub="The architectural style is eye-catching and unique."><SurveySelect value={exposure.b12!} onChange={v => setE("b12", v)} /></QField>
                <QField label="B1.3 Typical Style" sub="The style is typical of its prevailing style during its era."><SurveySelect value={exposure.b13!} onChange={v => setE("b13", v)} /></QField>
                <QField label="B1.4 Integration" sub="The style beautifully integrates into the cityscape."><SurveySelect value={exposure.b14!} onChange={v => setE("b14", v)} /></QField>
              </Section>

              <Section title="B2 — Historical Value">
                <QField label="B2.1 Age of Building" sub="Low (50-75) ; Moderate (76 to 125) ; High (126+ years)">
                  <div className="text-sm font-bold text-terracotta bg-sand px-3 py-2 rounded-lg border border-bark/20 inline-block">
                    {currentYear - Number(building.year_built ?? currentYear)} years old
                  </div>
                </QField>
                <QField label="B2.2 Relevance" sub="past is relevant as I am able to identify with the culture and history."><SurveySelect value={exposure.b22!} onChange={v => setE("b22", v)} /></QField>
                <QField label="B2.3 Geog. Impact" sub="Local=1 ; Regional=2 ; National=3"><SurveySelect value={exposure.b23!} onChange={v => setE("b23", v)} /></QField>
                <QField label="B2.4 Heritage Tie" sub="History strongly ties in the area's cultural heritage."><SurveySelect value={exposure.b24!} onChange={v => setE("b24", v)} /></QField>
                <QField label="B2.5 Important Message" sub="Relays an important message worth preserving."><SurveySelect value={exposure.b25!} onChange={v => setE("b25", v)} /></QField>
              </Section>

              <Section title="B3 — Social Value">
                <QField label="B3.1 Promotion" sub="Initiatives were seen to promote this property."><SurveySelect value={exposure.b31!} onChange={v => setE("b31", v)} /></QField>
                <QField label="B3.2 Suggestions" sub="Prominent people strongly suggest for its conservation."><SurveySelect value={exposure.b32!} onChange={v => setE("b32", v)} /></QField>
                <QField label="B3.3 Importance" sub="Strong sense of importance in the people's daily lives."><SurveySelect value={exposure.b33!} onChange={v => setE("b33", v)} /></QField>
                <QField label="B3.4 No Efforts (Inverted)" sub="No efforts were made to further promote this building."><SurveySelect value={exposure.b34!} onChange={v => setE("b34", v)} /></QField>
              </Section>

              <Section title="B4 — Socio-Economic Value">
                <QField label="B4.1 Tourist Attraction" sub="Must-see for the tourists eager to visit the area."><SurveySelect value={exposure.b41!} onChange={v => setE("b41", v)} /></QField>
                <QField label="B4.2 Tourism Contrib." sub="Contributes to overall tourism in the community."><SurveySelect value={exposure.b42!} onChange={v => setE("b42", v)} /></QField>
                <QField label="B4.3 Goods & Services" sub="Often visited for its goods and services."><SurveySelect value={exposure.b43!} onChange={v => setE("b43", v)} /></QField>
                <QField label="B4.4 Adaptive Use" sub="Adopts needs of community without sacrificing culture."><SurveySelect value={exposure.b44!} onChange={v => setE("b44", v)} /></QField>
              </Section>

              <div className="flex justify-between pt-2"><button className="btn-secondary" onClick={() => setStep("hazard")}>← Back</button><button className="btn-primary" onClick={() => setStep("vulnerability")}>Next: Vulnerability →</button></div>
            </div>
          )}

          {step === "vulnerability" && (
            <div className="space-y-6">
              <h3 className="font-sora font-bold text-lg text-ink">Vulnerability Assessment</h3>
              
              <Section title="C1 — Structural System">
                <QField label="C1.1 Code Year Built" sub="Low (1992+) ; Moderate (1972-1991) ; High (Pre-1972)"><QualitativeSelect value={vuln.building_code ?? ""} options={["New Code (1992-present)","Post-Code (1972-1991)","Pre-Code (before 1972)"]} onChange={v => setV("building_code",v)} /></QField>
                <QField label="C1.2 Plan Irregularity" sub="Low (Regular) ; Moderate (Symmetric T,U,C) ; High (L-shaped)"><QualitativeSelect multiple value={vuln.plan_irregularity ?? []} options={["Rectangular", "Square", "T- shaped", "Irregular Shaped", "L-shaped"]} onChange={v => setV("plan_irregularity",v)} /></QField>
                <QField label="C1.3 Vertical Irregularity" sub="Low (None) ; Moderate (1) ; High (2+)"><QualitativeSelect value={vuln.vertical_irregularity ?? ""} options={["No vertical irregularity", "1 Vertical Irregularity", "2 Vertical Irregularities"]} onChange={v => setV("vertical_irregularity",v)} /></QField>
                <QField label="C1.4 Proximity / Pounding" sub="Low (No adjacent) ; Moderate (>6 inches) ; High (<6 inches)"><QualitativeSelect value={vuln.building_proximity ?? ""} options={["No adjacent buildings", "6 inches and above", "below 6 inches"]} onChange={v => setV("building_proximity",v)} /></QField>
                <QField label="C1.5 Number of Storeys" sub="Low (1) ; Moderate (2) ; High (3+)"><input className="input-field" value={numInputs.number_of_stories ?? vuln.number_of_stories ?? ""} onChange={e => handleNum("number_of_stories", e.target.value, setV)} /></QField>
                <QField label="C1.6 System Material" sub="Low (Timber/LS) ; Moderate (RC/Steel) ; High (URM)"><QualitativeSelect multiple value={vuln.structural_material ?? []} options={["Timber Frame","Light Steel Frame","Reinforced Concrete","Steel","Unreinforced Masonry"]} onChange={v => setV("structural_material",v)} /></QField>
                <QField label="C1.7 Number of Bays" sub="Low (5+) ; Moderate (3-4) ; High (<3)"><input className="input-field" value={numInputs.number_of_bays ?? vuln.number_of_bays ?? ""} onChange={e => handleNum("number_of_bays", e.target.value, setV)} /></QField>
                <QField label="C1.8 Column Spacing (m)" sub="Low (<3m) ; Moderate (3-5m) ; High (>5m)"><input className="input-field" value={numInputs.column_spacing_m ?? vuln.column_spacing_m ?? ""} onChange={e => handleNum("column_spacing_m", e.target.value, setV)} /></QField>
                <QField label="C1.9 Building Enclosure" sub="Low (Enclosed) ; Moderate (Partial) ; High (Open)"><QualitativeSelect multiple value={vuln.building_enclosure ?? []} options={["Enclosed", "Partially Open", "Open"]} onChange={v => setV("building_enclosure",v)} /></QField>
                <QField label="C1.10 Wall Material" sub="Low (RC) ; Moderate (RM) ; High (URM/Wood/Glass)"><QualitativeSelect multiple value={vuln.wall_material ?? []} options={["Reinforced Concrete", "Reinforced Masonry", "Unreinforced Masonry", "Wood", "Bamboo", "Glass", "Masonry"]} onChange={v => setV("wall_material",v)} /></QField>
                <QField label="C1.11 Framing Type" sub="Low (Braced/SMRF) ; Moderate (Shearwall) ; High (Ordinary)"><QualitativeSelect multiple value={vuln.structural_framing_type ?? []} options={["Braced","Special Moment-Resisting Frame","Shearwall","Ordinary Frame"]} onChange={v => setV("structural_framing_type",v)} /></QField>
                <QField label="C1.12 Flooring Material" sub="Low (Tiles/RC) ; Moderate (Hardwood/Bamboo) ; High (Mud)"><QualitativeSelect multiple value={vuln.flooring_material ?? []} options={["Concrete", "Tiles", "Hardwood", "Bamboo", "Earth Mud"]} onChange={v => setV("flooring_material",v)} /></QField>
              </Section>

              <Section title="C2 — Building Condition">
                <QField label="C2.1 Maximum Crack Width" sub="Low (<1mm) ; Moderate (1-3mm) ; High (>3mm)"><input className="input-field" value={vuln.maximum_crack ?? ""} onChange={e => setV("maximum_crack", e.target.value)} /></QField>
                {([
                  { key: "uneven_settlement",          label: "C2.2 Uneven Settlement / Inclination?" },
                  { key: "beam_column_deformations",   label: "C2.3 Beam and Column Deformations?" },
                  { key: "finishing_condition",         label: "C2.4 Finishing Condition Deterioration?" },
                  { key: "decay_of_structural_member", label: "C2.5 Decay of Structural Members?" },
                  { key: "additional_loads",           label: "C2.6 Additional Loads / Gatherings?" },
                ] as { key: keyof VulnerabilityIndicators; label: string }[]).map(f => (
                  <div key={f.key} className="flex items-center justify-between py-2 border-b border-sand last:border-0">
                    <span className="text-sm text-ink">{f.label}</span>
                    <div className="flex gap-3">
                      {["No", "Yes"].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={(vuln as Record<string, boolean>)[f.key] === (opt === "Yes")} onChange={() => setV(f.key, opt === "Yes")} className="accent-bark" />
                          <span className="text-sm text-[var(--ink-lt)]">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </Section>

              <Section title="C3 & C4 — Roof & Fasteners">
                <QField label="C3.1 Roof Design" sub="Low (Hip) ; Moderate (Dutch/Gable) ; High (Monoslope)"><QualitativeSelect multiple value={vuln.roof_design ?? []} options={["Hip","Dutch Hip","Gable","Cross Hip Roof","Monoslope"]} onChange={v => setV("roof_design",v)} /></QField>
                <QField label="C3.2 Roof Slope" sub="Low (30-45°) ; Moderate (>45°) ; High (<30°)"><QualitativeSelect value={vuln.roof_slope ?? ""} options={["30 to 45 degrees", "above 45 degrees", "below 30 degrees"]} onChange={v => setV("roof_slope",v)} /></QField>
                <QField label="C3.3 Roofing Material" sub="Low (Tiles/RC) ; Moderate (GI/Metal) ; High (Wood/Thatch)"><QualitativeSelect multiple value={vuln.roofing_material ?? []} options={["Tiles", "Concrete", "Galvanized Iron Sheets", "Metals", "Asphalt Shingles", "Wood", "Thatch", "Shingles"]} onChange={v => setV("roofing_material",v)} /></QField>
                <QField label="C4.1 Roof Fasteners" sub="Low (Screw) ; Moderate (Nails) ; High (Staples)"><QualitativeSelect multiple value={vuln.roof_fastener ?? []} options={["Metal Screw", "Nails", "Staples", "Hazel Spars"]} onChange={v => setV("roof_fastener",v)} /></QField>
                <QField label="C4.2 Fastener Spacing (mm)" sub="Low (<225) ; Moderate (226-450) ; High (>450)"><input className="input-field" value={numInputs.roof_fastener_distance_mm ?? vuln.roof_fastener_distance_mm ?? ""} onChange={e => handleNum("roof_fastener_distance_mm", e.target.value, setV)} /></QField>
              </Section>

              <div className="flex justify-between pt-2"><button className="btn-secondary" onClick={() => setStep("exposure")}>← Back</button><button className="btn-primary" onClick={computeAndShow} disabled={loading}>{loading ? "Computing…" : "Compute Index →"}</button></div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-6 text-center">
              <h3 className="font-sora font-bold text-xl text-ink">Assessment Result</h3>
              <div className={`p-8 rounded-2xl border-4 ${riskColor}`}>
                <div className="text-sm font-bold tracking-widest uppercase opacity-70 mb-2">Statistical Risk Index</div>
                <div className="text-7xl font-extrabold mb-2">{result.risk_index.toFixed(2)}</div>
                <div className="text-xl font-bold">{result.risk_description}</div>
                
                <div className="mt-4 pt-4 border-t border-current/20 text-xs font-medium">
                  <span className="opacity-70">Manual Verification: </span>
                  <span className="font-bold">{result.manual_index?.toFixed(2) ?? "—"}</span>
                </div>
              </div>
              <button className="btn-primary w-full py-4" onClick={() => router.push("/risk-summary")}>View All Summary →</button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="border-t border-sand pt-6 mt-6 first:border-0 first:pt-0 first:mt-0"><h4 className="text-[10px] uppercase tracking-widest font-bold text-bark mb-4">{title}</h4><div className="space-y-4">{children}</div></div>);
}

function QField({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (<div><label className="block mb-2"><span className="text-sm font-bold text-ink">{label}</span>{sub && <span className="block text-[10px] text-[var(--ink-lt)] mt-0.5">{sub}</span>}</label>{children}</div>);
}
