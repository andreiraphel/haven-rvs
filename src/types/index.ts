export type RiskLevel = "LOW RISK" | "MODERATE RISK" | "HIGH RISK";

export interface Building {
  id: string;
  name: string;
  unique_code: string;
  address: string;
  municipality: string;
  province: string;
  latitude: number;
  longitude: number;
  building_type: string;
  building_use: string;
  year_built: number;
  number_of_floors: number;
  photo_urls?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HazardIndicators {
  id?: string;
  building_id: string;
  // A1 – Seismic
  earthquake_intensity: string;       // PEIS value e.g. "VIII"
  fault_distance_km: number;
  fault_name: string;
  seismic_source_type: number;        // Mw magnitude
  potential_liquefaction: string;     // Safe / Least / Moderately / Highly Susceptible
  // A2 – Wind
  basic_wind_speed_kph: number;
  terrain: string;                    // Minimal / Numerous Obstruction
  // A3 – Geo
  flood_susceptibility: string;
  storm_surge_height: string;
  slope_degrees: string;              // "1-8 degrees" | "9-30 degrees" etc.
  elevation_m: number;
  distance_to_water_m: number;
  water_body_name?: string;
  surface_runoff: string | string[];
  base_height: string;
  drainage_system: string;
  created_at?: string;
}

export interface VulnerabilityIndicators {
  id?: string;
  building_id: string;
  // Structural
  building_code: string;
  plan_irregularity: string | string[];
  vertical_irregularity: string;
  building_proximity: string;
  number_of_stories: number;
  structural_material: string | string[];
  number_of_bays: number;
  column_spacing_m: number;
  building_enclosure: string | string[];
  wall_material: string | string[];
  structural_framing_type: string | string[];
  flooring_material: string | string[];
  // Condition
  maximum_crack: string;
  uneven_settlement: boolean;
  beam_column_deformations: boolean;
  finishing_condition: boolean;
  decay_of_structural_member: boolean;
  additional_loads: boolean;
  // Roof
  roof_design: string | string[];
  roof_slope: string;
  roofing_material: string | string[];
  roof_fastener: string | string[];
  roof_fastener_distance_mm: number;
  created_at?: string;
}

export interface RiskResult {
  id?: string;
  building_id: string;
  risk_index: number; // Primary (ML)
  risk_description: RiskLevel;
  hazard_rating: number;
  vulnerability_rating: number;
  exposure_rating: number;
  risk_rating: number;
  ml_prediction?: number;
  manual_index?: number; // Secondary (Manual)
  ai_course_of_action?: string;
  narrative?: string;
  assessed_at?: string;
  created_at?: string;
}

export interface ExposureIndicators {
  id?: string;
  building_id: string;
  b11: number; b12: number; b13: number; b14: number;
  b21: number; b22: number; b23: number; b24: number; b25: number;
  b31: number; b32: number; b33: number; b34: number;
  b41: number; b42: number; b43: number; b44: number;
  created_at?: string;
}

export interface Assessment {
  building: Building;
  hazard: HazardIndicators;
  vulnerability: VulnerabilityIndicators;
  exposure: ExposureIndicators;
  result: RiskResult;
}

export type QuestionnaireStep = "building-info" | "hazard" | "exposure" | "vulnerability" | "result";
