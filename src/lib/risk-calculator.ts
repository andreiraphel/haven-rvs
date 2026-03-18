import type { HazardIndicators, VulnerabilityIndicators, RiskResult, ExposureIndicators } from "@/types";
import { PEIS_MAP, LIQ_MAP, TERRAIN_MAP, SLOPE_MAP, RUNOFF_MAP, BASE_MAP, DRAIN_MAP, CODE_MAP, PLAN_MAP, VERT_MAP, PROX_MAP, MAT_MAP, FRAME_MAP, ENCL_MAP, WALL_MAP, FLOOR_MAP, ROOF_DESIGN_MAP, ROOF_SLOPE_MAP, ROOF_MAT_MAP, FAST_TYPE_MAP } from "./maps";

export interface RiskWeights {
  hazard: {
    earthquake_intensity: number; fault_distance: number; seismic_source: number; liquefaction: number;
    wind_speed: number; terrain: number;
    slope: number; elevation: number; water_distance: number; runoff: number; base_height: number; drainage: number;
  };
  exposure: {
    b11: number; b12: number; b13: number; b14: number;
    b21: number; b22: number; b23: number; b24: number; b25: number;
    b31: number; b32: number; b33: number; b34: number;
    b41: number; b42: number; b43: number; b44: number;
  };
  vulnerability: {
    building_code: number; plan_irregularity: number; vertical_irregularity: number; building_proximity: number;
    stories: number; material: number; bays: number; column_spacing: number;
    enclosure: number; wall_material: number; framing: number; flooring: number;
    crack: number; settlement: number; deformations: number; finishing: number; decay: number; loads: number;
    roof_design: number; roof_slope: number; roof_material: number;
    roof_fastener_type: number; roof_fastener_dist: number;
  };
}

export const DEFAULT_WEIGHTS: RiskWeights = {
  hazard: {
    earthquake_intensity: 0.0578, fault_distance: 0.402, seismic_source: 0.1455, liquefaction: 0.3947,
    wind_speed: 0.6586, terrain: 0.3414,
    slope: 0.1119, elevation: 0.1656, water_distance: 0.1376, runoff: 0.2844, base_height: 0.1184, drainage: 0.182
  },
  exposure: {
    b11: 0.2461, b12: 0.2299, b13: 0.3621, b14: 0.1619,
    b21: 0.1432, b22: 0.1341, b23: 0.3931, b24: 0.2441, b25: 0.0854,
    b31: 0.0589, b32: 0.2439, b33: 0.6313, b34: 0.0659,
    b41: 0.0807, b42: 0.229, b43: 0.1478, b44: 0.5426
  },
  vulnerability: {
    building_code: 0.023, plan_irregularity: 0.031, vertical_irregularity: 0.048, building_proximity: 0.023,
    stories: 0.049, material: 0.2, bays: 0.074, column_spacing: 0.141,
    enclosure: 0.04, wall_material: 0.108, framing: 0.221, flooring: 0.042,
    crack: 0.103, settlement: 0.2495, deformations: 0.1758, finishing: 0.0555, decay: 0.2755, loads: 0.1408,
    roof_design: 0.1445, roof_slope: 0.6693, roof_material: 0.186,
    roof_fastener_type: 0.3006, roof_fastener_dist: 0.6994
  }
};

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
  e?: ExposureIndicators,
  weights: RiskWeights = DEFAULT_WEIGHTS
): RiskResult {
  const wh = weights.hazard;
  const we = weights.exposure;
  const wv = weights.vulnerability;

  // --- 1. HAZARD RATING (H) ---
  const a1 = (PEIS_MAP[h.earthquake_intensity] ?? 1) * wh.earthquake_intensity +
             (h.fault_distance_km > 10 ? 1 : h.fault_distance_km > 5 ? 2 : 3) * wh.fault_distance +
             (h.seismic_source_type < 6.5 ? 1 : h.seismic_source_type < 7.0 ? 2 : 3) * wh.seismic_source +
             (LIQ_MAP[h.potential_liquefaction] ?? 1) * wh.liquefaction;

  const a2 = (h.basic_wind_speed_kph <= 225 ? 1 : h.basic_wind_speed_kph <= 279 ? 2 : 3) * wh.wind_speed +
             (TERRAIN_MAP[h.terrain] ?? 2) * wh.terrain;

  const a3 = (SLOPE_MAP[h.slope_degrees] ?? 1) * wh.slope +
             (h.elevation_m > 10 ? 1 : h.elevation_m >= 5 ? 2 : 3) * wh.elevation +
             (h.distance_to_water_m > 500 ? 1 : h.distance_to_water_m >= 200 ? 2 : 3) * wh.water_distance +
             (getMaxScore(h.surface_runoff, RUNOFF_MAP, 1)) * wh.runoff +
             (BASE_MAP[h.base_height] ?? 2) * wh.base_height +
             (DRAIN_MAP[h.drainage_system] ?? 2) * wh.drainage;

  const hazardRating = (a1 + a2 + a3) / 3;

  // --- 2. EXPOSURE RATING (E) ---
  const score = isDangerStub ? 3 : 2;
  const b1 = (e?.b11 ?? score) * we.b11 + (e?.b12 ?? score) * we.b12 + (e?.b13 ?? score) * we.b13 + (e?.b14 ?? score) * we.b14;
  
  const age = 2024 - yearBuilt;
  const ageScore = age <= 75 ? 1 : age <= 125 ? 2 : 3;
  const b2 = ageScore * we.b21 + (e?.b22 ?? score) * we.b22 + (e?.b23 ?? score) * we.b23 + (e?.b24 ?? score) * we.b24 + (e?.b25 ?? score) * we.b25;
  
  const b3 = (e?.b31 ?? score) * we.b31 + (e?.b32 ?? score) * we.b32 + (e?.b33 ?? score) * we.b33 + (e?.b34 ?? score) * we.b34;
  const b4 = (e?.b41 ?? score) * we.b41 + (e?.b42 ?? score) * we.b42 + (e?.b43 ?? score) * we.b43 + (e?.b44 ?? score) * we.b44;

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
  const c1_weights = [
    wv.building_code, wv.plan_irregularity, wv.vertical_irregularity, wv.building_proximity,
    wv.stories, wv.material, wv.bays, wv.column_spacing,
    wv.enclosure, wv.wall_material, wv.framing, wv.flooring
  ];
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
  const c2_weights = [
    wv.crack, wv.settlement, wv.deformations, wv.finishing, wv.decay, wv.loads
  ];
  const c2 = c2_scores.reduce((sum, s, i) => sum + s * c2_weights[i], 0);

  const c3 = (getMaxScore(v.roof_design, ROOF_DESIGN_MAP, 2)) * wv.roof_design + 
             (ROOF_SLOPE_MAP[v.roof_slope] ?? 1) * wv.roof_slope + 
             (getMaxScore(v.roofing_material, ROOF_MAT_MAP, 2)) * wv.roof_material;
  
  const fastenerDist = v.roof_fastener_distance_mm <= 225 ? 1 : v.roof_fastener_distance_mm <= 450 ? 2 : 3;
  const c4 = (getMaxScore(v.roof_fastener, FAST_TYPE_MAP, 2)) * wv.roof_fastener_type + 
             fastenerDist * wv.roof_fastener_dist;

  const vulnerabilityRating = (c1 + c2 + c3 + c4) / 4;

  // --- FINAL RISK INDEX ---
  const riskRating = hazardRating * exposureRating * vulnerabilityRating;
  const riskIndex = (riskRating / 27) * 10;

  const riskDescription = riskIndex <= 3.58 ? "LOW RISK" : riskIndex <= 6.79 ? "MODERATE RISK" : "HIGH RISK";

  return {
    building_id: "",
    risk_index: Math.round(riskIndex * 1000000) / 1000000,
    risk_description: riskDescription as any,
    hazard_rating: Math.round(hazardRating * 1000000) / 1000000,
    vulnerability_rating: Math.round(vulnerabilityRating * 1000000) / 1000000,
    exposure_rating: Math.round(exposureRating * 1000000) / 1000000,
    risk_rating: Math.round(riskRating * 1000000) / 1000000,
  };
}
