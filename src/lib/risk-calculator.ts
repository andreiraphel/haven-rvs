import type { HazardIndicators, VulnerabilityIndicators, RiskResult, ExposureIndicators } from "@/types";
import { PEIS_MAP, LIQ_MAP, TERRAIN_MAP, SLOPE_MAP, RUNOFF_MAP, BASE_MAP, DRAIN_MAP, CODE_MAP, PLAN_MAP, VERT_MAP, PROX_MAP, MAT_MAP, FRAME_MAP, ENCL_MAP, WALL_MAP, FLOOR_MAP, ROOF_DESIGN_MAP, ROOF_SLOPE_MAP, ROOF_MAT_MAP, FAST_TYPE_MAP } from "./maps";

function getMaxScore(value: string | string[] | undefined, map: Record<string, number>, defaultValue = 1): number {
  if (Array.isArray(value)) {
    if (value.length === 0) return defaultValue;
    return Math.max(...value.map(v => map[v] ?? defaultValue));
  }
  if (typeof value === 'string') {
    return map[value] ?? defaultValue;
  }
  return defaultValue;
}

export function calculateAssessmentRisk(
  h: HazardIndicators,
  v: VulnerabilityIndicators,
  yearBuilt: number,
  isDangerStub: boolean = false,
  e?: ExposureIndicators
): RiskResult {
  // --- 1. HAZARD RATING (H) ---
  const a1 = (PEIS_MAP[h.earthquake_intensity] ?? 1) * 0.224 +
             (h.fault_distance_km > 10 ? 1 : h.fault_distance_km > 5 ? 2 : 3) * 0.185 +
             (h.seismic_source_type < 6.5 ? 1 : h.seismic_source_type < 7.0 ? 2 : 3) * 0.364 +
             (LIQ_MAP[h.potential_liquefaction] ?? 1) * 0.227;

  const a2 = (h.basic_wind_speed_kph <= 225 ? 1 : h.basic_wind_speed_kph <= 279 ? 2 : 3) * 0.657 +
             (TERRAIN_MAP[h.terrain] ?? 2) * 0.343;

  const a3 = (SLOPE_MAP[h.slope_degrees] ?? 1) * 0.087 +
             (h.elevation_m > 10 ? 1 : h.elevation_m >= 5 ? 2 : 3) * 0.211 +
             (h.distance_to_water_m > 500 ? 1 : h.distance_to_water_m >= 200 ? 2 : 3) * 0.175 +
             (getMaxScore(h.surface_runoff, RUNOFF_MAP, 1)) * 0.269 +
             (BASE_MAP[h.base_height] ?? 2) * 0.140 +
             (DRAIN_MAP[h.drainage_system] ?? 2) * 0.118;

  const hazardRating = (a1 + a2 + a3) / 3;

  // --- 2. EXPOSURE RATING (E) ---
  const score = isDangerStub ? 3 : 2;
  const b1 = (e?.b11 ?? score) * 0.159 + (e?.b12 ?? score) * 0.168 + (e?.b13 ?? score) * 0.344 + (e?.b14 ?? score) * 0.329;
  
  const age = 2024 - yearBuilt;
  const ageScore = age <= 75 ? 1 : age <= 125 ? 2 : 3;
  const b2 = ageScore * 0.401 + (e?.b22 ?? score) * 0.125 + (e?.b23 ?? score) * 0.093 + (e?.b24 ?? score) * 0.158 + (e?.b25 ?? score) * 0.223;
  
  const b3 = (e?.b31 ?? score) * 0.378 + (e?.b32 ?? score) * 0.217 + (e?.b33 ?? score) * 0.133 + (e?.b34 ?? score) * 0.272;
  const b4 = (e?.b41 ?? score) * 0.244 + (e?.b42 ?? score) * 0.361 + (e?.b43 ?? score) * 0.115 + (e?.b44 ?? score) * 0.280;

  const exposureRating = (b1 + b2 + b3 + b4) / 4;

  // --- 3. VULNERABILITY RATING (V) ---
  const c1_scores = [
    CODE_MAP[v.building_code] ?? 2,
    getMaxScore(v.plan_irregularity, PLAN_MAP, 1),
    VERT_MAP[v.vertical_irregularity] ?? 1,
    PROX_MAP[v.building_proximity] ?? 1,
    v.number_of_stories >= 3 ? 3 : v.number_of_stories,
    getMaxScore(v.structural_material, MAT_MAP, 2),
    v.number_of_bays >= 5 ? 1 : v.number_of_bays >= 3 ? 2 : 3,
    v.column_spacing_m < 3 ? 1 : v.column_spacing_m <= 5 ? 2 : 3,
    getMaxScore(v.building_enclosure, ENCL_MAP, 1),
    getMaxScore(v.wall_material, WALL_MAP, 2),
    getMaxScore(v.structural_framing_type, FRAME_MAP, 3),
    getMaxScore(v.flooring_material, FLOOR_MAP, 1)
  ];
  const c1_weights = [0.092, 0.053, 0.057, 0.063, 0.031, 0.098, 0.051, 0.082, 0.146, 0.113, 0.102, 0.069];
  const c1 = c1_scores.reduce((sum, s, i) => sum + s * c1_weights[i], 0);

  const crackScore = !v.maximum_crack || v.maximum_crack === "-" ? 1 : parseFloat(v.maximum_crack) < 1 ? 1 : parseFloat(v.maximum_crack) <= 3 ? 2 : 3;
  const c2_scores = [
    crackScore,
    v.uneven_settlement ? 3 : 1,
    v.beam_column_deformations ? 3 : 1,
    v.finishing_condition ? 3 : 1,
    v.decay_of_structural_member ? 3 : 1,
    v.additional_loads ? 3 : 1
  ];
  const c2_weights = [0.158, 0.147, 0.213, 0.124, 0.133, 0.225];
  const c2 = c2_scores.reduce((sum, s, i) => sum + s * c2_weights[i], 0);

  const c3 = (getMaxScore(v.roof_design, ROOF_DESIGN_MAP, 2)) * 0.344 + (ROOF_SLOPE_MAP[v.roof_slope] ?? 1) * 0.424 + (getMaxScore(v.roofing_material, ROOF_MAT_MAP, 2)) * 0.232;
  
  const fastenerDist = v.roof_fastener_distance_mm <= 225 ? 1 : v.roof_fastener_distance_mm <= 450 ? 2 : 3;
  const c4 = (getMaxScore(v.roof_fastener, FAST_TYPE_MAP, 2)) * 0.632 + fastenerDist * 0.368;

  const vulnerabilityRating = (c1 + c2 + c3 + c4) / 4;

  // --- FINAL RISK INDEX ---
  const riskRating = hazardRating * exposureRating * vulnerabilityRating;
  const riskIndex = (riskRating / 27) * 10;

  const riskDescription = riskIndex <= 3.58 ? "LOW RISK" : riskIndex <= 6.79 ? "MODERATE RISK" : "HIGH RISK";

  return {
    building_id: "",
    risk_index: Math.round(riskIndex * 1000) / 1000,
    risk_description: riskDescription as any,
    hazard_rating: Math.round(hazardRating * 1000) / 1000,
    vulnerability_rating: Math.round(vulnerabilityRating * 1000) / 1000,
    exposure_rating: Math.round(exposureRating * 1000) / 1000,
    risk_rating: Math.round(riskRating * 1000) / 1000,
  };
}
