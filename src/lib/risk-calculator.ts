import type { HazardIndicators, VulnerabilityIndicators, RiskResult, ExposureIndicators } from "@/types";

/**
 * MANUAL COMPUTATION LOGIC
 * Derived directly from the provided spreadsheet data.
 */

// ─── HAZARD MAPPINGS ──────────────────────────────────────────
const PEIS_MAP: Record<string, number> = { "I":1,"II":1,"III":1,"IV":1,"V":2,"VI":2,"VII":3,"VIII":3,"IX":3,"X":3 };
const LIQ_MAP: Record<string, number>  = { "Safe":1, "Least Susceptible":1, "Moderately Susceptible":2, "Highly Susceptible":3 };
const TERRAIN_MAP: Record<string, number> = { "Numerous Obstruction":1, "Minimal Obstruction":2, "Flat Terrain":3 };
const SLOPE_MAP: Record<string, number>   = { "1-8 degrees":1, "9-30 degrees":2, "31-60 degrees":3, "above 60 degrees":3 };
const RUNOFF_MAP: Record<string, number>  = { "Soil":1, "Grass":1, "Grass/Soil":1, "Grass/Concrete":2, "Concrete":3 };
const BASE_MAP: Record<string, number>    = { "Base is higher":1, "Same Level":2, "Base is lower":3 };
const DRAIN_MAP: Record<string, number>   = { "Closed drainage system":1, "Open drainage system":2, "No Drainage System":3 };

// ─── VULNERABILITY MAPPINGS ────────────────────────────────────
const CODE_MAP: Record<string, number>  = { "New Code (1992-present)":1, "Post-Code (1972-1991)":2, "Pre-Code (before 1972)":3 };
const PLAN_MAP: Record<string, number>  = { "Rectangular":1, "Square":1, "T- shaped":2, "Irregular Shaped":2, "L-shaped":3 };
const VERT_MAP: Record<string, number>  = { "No vertical irregularity":1, "1 Vertical Irregularity":2, "2 Vertical Irregularities":3 };
const PROX_MAP: Record<string, number>  = { "No adjacent buildings":1, "6 inches and above":2, "below 6 inches":3 };
const MAT_MAP: Record<string, number>   = { "Timber Frame":1, "Light Steel Frame":1, "Reinforced Concrete":2, "Steel":2, "Unreinforced Masonry":3 };
const FRAME_MAP: Record<string, number> = { "Braced":1, "Special Moment-Resisting Frame":1, "Shearwall":2, "Ordinary Frame":3 };
const ENCL_MAP: Record<string, number>  = { "Enclosed":1, "Partially Open":2, "Open":3 };
const WALL_MAP: Record<string, number>  = { "Reinforced Concrete":1, "Reinforced Masonry":2, "Unreinforced Masonry":3, "Wood":3, "Bamboo":3, "Glass":3, "Masonry":2 };
const FLOOR_MAP: Record<string, number> = { "Concrete":1, "Tiles":1, "Hardwood":2, "Bamboo":2, "Earth Mud":3 };
const ROOF_DESIGN_MAP: Record<string, number> = { "Hip":1, "Dutch Hip":2, "Gable":2, "Cross Hip Roof":2, "Monoslope":3 };
const ROOF_SLOPE_MAP: Record<string, number>  = { "30 to 45 degrees":1, "above 45 degrees":2, "below 30 degrees":3 };
const ROOF_MAT_MAP: Record<string, number>    = { "Tiles":1, "Concrete":1, "Galvanized Iron Sheets":2, "Metals":2, "Asphalt Shingles":2, "Wood":3, "Thatch":3, "Shingles":3 };
const FAST_TYPE_MAP: Record<string, number>   = { "Metal Screw":1, "Nails":2, "Staples":3, "Hazel Spars":3 };

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
             (RUNOFF_MAP[h.surface_runoff] ?? 1) * 0.269 +
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
    PLAN_MAP[v.plan_irregularity] ?? 1,
    VERT_MAP[v.vertical_irregularity] ?? 1,
    PROX_MAP[v.building_proximity] ?? 1,
    v.number_of_stories >= 3 ? 3 : v.number_of_stories,
    MAT_MAP[v.structural_material] ?? 2,
    v.number_of_bays >= 5 ? 1 : v.number_of_bays >= 3 ? 2 : 3,
    v.column_spacing_m < 3 ? 1 : v.column_spacing_m <= 5 ? 2 : 3,
    ENCL_MAP[v.building_enclosure] ?? 1,
    WALL_MAP[v.wall_material] ?? 2,
    FRAME_MAP[v.structural_framing_type] ?? 3,
    FLOOR_MAP[v.flooring_material] ?? 1
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

  const c3 = (ROOF_DESIGN_MAP[v.roof_design] ?? 2) * 0.344 + (ROOF_SLOPE_MAP[v.roof_slope] ?? 1) * 0.424 + (ROOF_MAT_MAP[v.roofing_material] ?? 2) * 0.232;
  
  const fastenerDist = v.roof_fastener_distance_mm <= 225 ? 1 : v.roof_fastener_distance_mm <= 450 ? 2 : 3;
  const c4 = (FAST_TYPE_MAP[v.roof_fastener] ?? 2) * 0.632 + fastenerDist * 0.368;

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
