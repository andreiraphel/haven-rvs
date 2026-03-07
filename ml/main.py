from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import os

app = FastAPI(title="HAVEN-RVS High-Precision ML Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORTS  = os.path.join(BASE_DIR, "model_exports")

try:
    model  = pickle.load(open(os.path.join(EXPORTS, "best_model.pkl"),    "rb"))
    scaler = pickle.load(open(os.path.join(EXPORTS, "scaler.pkl"),        "rb"))
    le     = pickle.load(open(os.path.join(EXPORTS, "label_encoder.pkl"), "rb"))
    print("✅ High-Precision Model artifacts loaded.")
except Exception as e:
    print(f"⚠️ Warning: Model artifacts not found: {e}")
    model = scaler = le = None

# --- MAPPINGS FROM EXCEL ---
def get_peis_score(v):
    if v in ["I", "II", "III", "IV"]: return 1
    if v in ["V", "VI"]: return 2
    return 3
def get_fault_score(v):
    try:
        d = float(v)
        return 1 if d > 10 else 2 if d > 5 else 3
    except: return 2
def get_source_score(v):
    try:
        m = float(v)
        return 1 if m < 6.5 else 2 if m < 7.0 else 3
    except: return 2
LIQ_MAP  = {"Safe": 1, "Least Susceptible": 1, "Moderately Susceptible": 2, "Highly Susceptible": 3}
def get_wind_score(v):
    try:
        w = float(v)
        return 1 if w <= 225 else 2 if w <= 279 else 3
    except: return 1
TERRAIN_MAP = {"Numerous Obstruction": 1, "Minimal Obstruction": 2, "Flat Terrain": 3}
SLOPE_MAP = {"1-8 degrees": 1, "9-30 degrees": 2, "31-60 degrees": 3, "above 60 degrees": 3}
def get_elevation_score(v):
    try:
        e = float(v)
        return 1 if e > 10 else 2 if e >= 5 else 3
    except: return 1
def get_water_dist_score(v):
    try:
        d = float(v)
        return 1 if d > 500 else 2 if d >= 200 else 3
    except: return 1
RUNOFF_MAP = {"Soil": 1, "Grass": 1, "Grass/Soil": 1, "Grass/Concrete": 2, "Concrete": 3}
BASE_MAP = {"Base is higher": 1, "Same Level": 2, "Base is lower": 3}
DRAIN_MAP = {"Closed drainage system": 1, "Open drainage system": 2, "No Drainage System": 3}
def get_age_score(year):
    try:
        age = 2024 - int(year)
        return 1 if age <= 75 else 2 if age <= 125 else 3
    except: return 1
CODE_MAP = {"New Code (1992-present)": 1, "Post-Code (1972-1991)": 2, "Pre-Code (before 1972)": 3}
PLAN_MAP = {"Rectangular": 1, "Square": 1, "T- shaped": 2, "Irregular Shaped": 2, "L-shaped": 3}
VERT_MAP = {"No vertical irregularity": 1, "1 Vertical Irregularity": 2, "2 Vertical Irregularities": 3}
PROX_MAP = {"No adjacent buildings": 1, "6 inches and above": 2, "below 6 inches": 3}
MAT_MAP = {"Timber Frame": 1, "Light Steel Frame": 1, "Reinforced Concrete": 2, "Steel": 2, "Unreinforced Masonry": 3}
FRAME_MAP = {"Braced": 1, "Special Moment-Resisting Frame": 1, "Shearwall": 2, "Ordinary Frame": 3}
ENCL_MAP = {"Enclosed": 1, "Partially Open": 2, "Open": 3}
WALL_MAP = {"Reinforced Concrete": 1, "Reinforced Masonry": 2, "Unreinforced Masonry": 3, "Wood": 3, "Bamboo": 3, "Glass": 3, "Masonry": 2}
FLOOR_MAP = {"Concrete": 1, "Tiles": 1, "Hardwood": 2, "Bamboo": 2, "Earth Mud": 3}
def get_crack_score(v):
    if not v or v == "-": return 1
    try:
        num = float(str(v).split()[0])
        return 1 if num < 1 else 2 if num <= 3 else 3
    except: return 1
ROOF_DESIGN_MAP = {"Hip": 1, "Dutch Hip": 2, "Gable": 2, "Cross Hip Roof": 2, "Monoslope": 3}
ROOF_SLOPE_MAP = {"30 to 45 degrees": 1, "above 45 degrees": 2, "below 30 degrees": 3}
ROOF_MAT_MAP = {"Tiles": 1, "Concrete": 1, "Galvanized Iron Sheets": 2, "Metals": 2, "Asphalt Shingles": 2, "Wood": 3, "Thatch": 3, "Shingles": 3}
FAST_TYPE_MAP = {"Metal Screw": 1, "Nails": 2, "Staples": 3, "Hazel Spars": 3}

class PredictRequest(BaseModel):
    hazard: dict
    vulnerability: dict
    exposure: dict = None
    year_built: int = 1950
    isStub: bool = False

class PredictResponse(BaseModel):
    risk_index: float
    risk_description: str
    hazard_rating: float
    vulnerability_rating: float
    exposure_rating: float
    risk_rating: float
    ml_prediction: float

def encode_inputs(hazard: dict, vulnerability: dict, exposure: dict = None, year_built: int = 1950, isStub: bool = False) -> list[float]:
    h = hazard; v = vulnerability; e = exposure
    def_score = 3 if isStub else 2
    
    # Hazard (12)
    peis = get_peis_score(h.get("earthquake_intensity"))
    fault = get_fault_score(h.get("fault_distance_km", 10))
    source = get_source_score(h.get("seismic_source_type", 7.0))
    liq = LIQ_MAP.get(h.get("potential_liquefaction"), 2)
    wind = get_wind_score(h.get("basic_wind_speed_kph", 260))
    terrain = TERRAIN_MAP.get(h.get("terrain"), 2)
    slope = SLOPE_MAP.get(h.get("slope_degrees"), 1)
    elev = get_elevation_score(h.get("elevation_m", 12))
    water = get_water_dist_score(h.get("distance_to_water_m", 500))
    runoff = RUNOFF_MAP.get(h.get("surface_runoff"), 2)
    base = BASE_MAP.get(h.get("base_height"), 2)
    drain = DRAIN_MAP.get(h.get("drainage_system"), 3)
    
    # Exposure (17)
    if e:
        b11=e.get("b11", def_score); b12=e.get("b12", def_score); b13=e.get("b13", def_score); b14=e.get("b14", def_score)
        b22=e.get("b22", def_score); b23=e.get("b23", (3 if isStub else 1)); b24=e.get("b24", def_score); b25=e.get("b25", def_score)
        b31=e.get("b31", def_score); b32=e.get("b32", def_score); b33=e.get("b33", def_score); b34=e.get("b34", def_score)
        b41=e.get("b41", def_score); b42=e.get("b42", def_score); b43=e.get("b43", def_score); b44=e.get("b44", def_score)
    else:
        b11=def_score; b12=def_score; b13=def_score; b14=def_score
        b22=def_score; b23=(3 if isStub else 1); b24=def_score; b25=def_score
        b31=def_score; b32=def_score; b33=def_score; b34=def_score
        b41=def_score; b42=def_score; b43=def_score; b44=def_score
    
    age_s = get_age_score(year_built)
    
    # Vulnerability (23)
    c1_0 = CODE_MAP.get(v.get("building_code"), 2)
    c1_1 = PLAN_MAP.get(v.get("plan_irregularity"), 1)
    c1_2 = VERT_MAP.get(v.get("vertical_irregularity"), 1)
    c1_3 = PROX_MAP.get(v.get("building_proximity"), 1)
    c1_4 = 3 if int(v.get("number_of_stories", 1)) >= 3 else int(v.get("number_of_stories", 1))
    c1_5 = MAT_MAP.get(v.get("structural_material"), 2)
    c1_6 = FRAME_MAP.get(v.get("structural_framing_type"), 3)
    c1_7 = 1 if int(v.get("number_of_bays", 5)) >= 5 else 2 if int(v.get("number_of_bays", 5)) >= 3 else 3
    c1_8 = 1 if float(v.get("column_spacing_m", 2)) < 3 else 2 if float(v.get("column_spacing_m", 2)) <= 5 else 3
    c1_9 = ENCL_MAP.get(v.get("building_enclosure"), 1)
    c1_10 = WALL_MAP.get(v.get("wall_material"), 2)
    c1_11 = FLOOR_MAP.get(v.get("flooring_material"), 1)
    
    c2_0 = get_crack_score(v.get("maximum_crack"))
    c2_1 = 3 if v.get("uneven_settlement") else 1
    c2_2 = 3 if v.get("beam_column_deformations") else 1
    c2_3 = 3 if v.get("finishing_condition") else 1
    c2_4 = 3 if v.get("decay_of_structural_member") else 1
    c2_5 = 3 if v.get("additional_loads") else 1
    
    r_design = ROOF_DESIGN_MAP.get(v.get("roof_design"), 2)
    r_slope = ROOF_SLOPE_MAP.get(v.get("roof_slope"), 1)
    r_mat = ROOF_MAT_MAP.get(v.get("roofing_material"), 2)
    f_type = FAST_TYPE_MAP.get(v.get("roof_fastener"), 2)
    try:
        f_dist_val = float(v.get("roof_fastener_distance_mm", 200))
    except: f_dist_val = 200
    f_dist = 1 if f_dist_val <= 225 else 2 if f_dist_val <= 450 else 3

    return [
        peis, fault, source, liq, wind, terrain, slope, elev, water, runoff, base, drain,
        b11, b12, b13, b14, 
        age_s, b22, b23, b24, b25, 
        b31, b32, b33, b34, 
        b41, b42, b43, b44,
        c1_0, c1_1, c1_2, c1_3, c1_4, c1_5, c1_6, c1_7, c1_8, c1_9, c1_10, c1_11,
        c2_0, c2_1, c2_2, c2_3, c2_4, c2_5,
        r_design, r_slope, r_mat, f_type, f_dist
    ]

def compute_manual_ratings(hazard: dict, vulnerability: dict, exposure: dict = None, year_built: int = 1950, isStub: bool = False):
    h = hazard; v = vulnerability; e = exposure
    def_score = 3 if isStub else 2
    
    # H
    a1 = (get_peis_score(h.get("earthquake_intensity")) * 0.224) + (get_fault_score(h.get("fault_distance_km", 10)) * 0.185) + (get_source_score(h.get("seismic_source_type", 7.0)) * 0.364) + (LIQ_MAP.get(h.get("potential_liquefaction"), 2) * 0.227)
    a2 = (get_wind_score(h.get("basic_wind_speed_kph", 260)) * 0.657) + (TERRAIN_MAP.get(h.get("terrain"), 2) * 0.343)
    a3 = (SLOPE_MAP.get(h.get("slope_degrees"), 1) * 0.087) + (get_elevation_score(h.get("elevation_m", 12)) * 0.211) + (get_water_dist_score(h.get("distance_to_water_m", 500)) * 0.175) + (RUNOFF_MAP.get(h.get("surface_runoff"), 2) * 0.269) + (BASE_MAP.get(h.get("base_height"), 2) * 0.14) + (DRAIN_MAP.get(h.get("drainage_system"), 3) * 0.118)
    h_rating = np.mean([a1, a2, a3])
    
    # E
    if e:
        b1 = (e.get("b11", def_score)*0.159) + (e.get("b12", def_score)*0.168) + (e.get("b13", def_score)*0.344) + (e.get("b14", def_score)*0.329)
        b2 = (get_age_score(year_built)*0.401) + (e.get("b22", def_score)*0.125) + (e.get("b23", (3 if isStub else 1))*0.093) + (e.get("b24", def_score)*0.158) + (e.get("b25", def_score)*0.223)
        b3 = (e.get("b31", def_score)*0.378) + (e.get("b32", def_score)*0.217) + (e.get("b33", def_score)*0.133) + (e.get("b34", def_score)*0.272)
        b4 = (e.get("b41", def_score)*0.244) + (e.get("b42", def_score)*0.361) + (e.get("b43", def_score)*0.115) + (e.get("b44", def_score)*0.28)
    else:
        b1 = (def_score*0.159) + (def_score*0.168) + (def_score*0.344) + (def_score*0.329)
        b2 = (get_age_score(year_built)*0.401) + (def_score*0.125) + ((3 if isStub else 1)*0.093) + (def_score*0.158) + (def_score*0.223)
        b3 = (def_score*0.378) + (def_score*0.217) + (def_score*0.133) + (def_score*0.272)
        b4 = (def_score*0.244) + (def_score*0.361) + (def_score*0.115) + (def_score*0.28)
    e_rating = np.mean([b1, b2, b3, b4])
    
    # V
    try: stories = int(v.get("number_of_stories", 1))
    except: stories = 1
    try: bays = int(v.get("number_of_bays", 5))
    except: bays = 5
    try: spacing = float(v.get("column_spacing_m", 2))
    except: spacing = 2
    
    c1_s = [
        CODE_MAP.get(v.get("building_code"), 2), 
        PLAN_MAP.get(v.get("plan_irregularity"), 1), 
        VERT_MAP.get(v.get("vertical_irregularity"), 1), 
        PROX_MAP.get(v.get("building_proximity"), 1), 
        3 if stories >= 3 else stories, 
        MAT_MAP.get(v.get("structural_material"), 2), 
        FRAME_MAP.get(v.get("structural_framing_type"), 3), 
        1 if bays >= 5 else 2 if bays >= 3 else 3, 
        1 if spacing < 3 else 2 if spacing <= 5 else 3, 
        ENCL_MAP.get(v.get("building_enclosure"), 1), 
        WALL_MAP.get(v.get("wall_material"), 2), 
        FLOOR_MAP.get(v.get("flooring_material"), 1)
    ]
    c1 = sum(s * w for s, w in zip(c1_s, [0.092, 0.053, 0.057, 0.063, 0.031, 0.098, 0.051, 0.082, 0.146, 0.113, 0.102, 0.069]))
    
    c2_s = [
        get_crack_score(v.get("maximum_crack")), 
        3 if v.get("uneven_settlement") else 1, 
        3 if v.get("beam_column_deformations") else 1, 
        3 if v.get("finishing_condition") else 1, 
        3 if v.get("decay_of_structural_member") else 1, 
        3 if v.get("additional_loads") else 1
    ]
    c2 = sum(s * w for s, w in zip(c2_s, [0.158, 0.147, 0.213, 0.124, 0.133, 0.225]))
    
    c3 = (ROOF_DESIGN_MAP.get(v.get("roof_design"), 2)*0.344) + (ROOF_SLOPE_MAP.get(v.get("roof_slope"), 1)*0.424) + (ROOF_MAT_MAP.get(v.get("roofing_material"), 2)*0.232)
    
    try: f_dist_val = float(v.get("roof_fastener_distance_mm", 200))
    except: f_dist_val = 200
    f_score = 1 if f_dist_val <= 225 else 2 if f_dist_val <= 450 else 3
    c4 = (FAST_TYPE_MAP.get(v.get("roof_fastener"), 2)*0.632) + (f_score*0.368)
    
    v_rating = np.mean([c1, c2, c3, c4])
    risk_rating = h_rating * e_rating * v_rating
    manual_index = (risk_rating / 27) * 10
    
    return manual_index, h_rating, e_rating, v_rating, risk_rating

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        # 1. COMPUTE MANUAL INDEX
        manual_idx, h_val, e_val, v_val, risk_rating = compute_manual_ratings(req.hazard, req.vulnerability, req.exposure, req.year_built, req.isStub)
        
        # 2. ML PREDICTION
        ml_val = 0.0
        if model and scaler:
            features = encode_inputs(req.hazard, req.vulnerability, req.exposure, req.year_built, req.isStub)
            ml_val = round(float(model.predict(scaler.transform([features]))[0]), 4)

        desc = "LOW RISK" if manual_idx <= 3.58 else "MODERATE RISK" if manual_idx <= 6.79 else "HIGH RISK"

        return PredictResponse(
            risk_index=round(float(manual_idx), 4), 
            risk_description=desc,
            hazard_rating=round(float(h_val), 4),
            vulnerability_rating=round(float(v_val), 4),
            exposure_rating=round(float(e_val), 4),
            risk_rating=round(float(risk_rating), 4),
            ml_prediction=ml_val
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Cloud Run provides the PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
