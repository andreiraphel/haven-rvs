from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import os
from xgboost import XGBRegressor

# Initialize FastAPI
app = FastAPI(title="HAVEN-RVS ML Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MEMORY OPTIMIZED LOADING ---
model = None
scaler = None
le = None

def load_artifacts():
    global model, scaler, le
    if model is not None: return
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXPORTS = os.path.join(BASE_DIR, "model_exports")
    if not os.path.exists(EXPORTS):
        EXPORTS = "model_exports"

    try:
        scaler = pickle.load(open(os.path.join(EXPORTS, "scaler.pkl"), "rb"))
        le     = pickle.load(open(os.path.join(EXPORTS, "label_encoder.pkl"), "rb"))
        model = XGBRegressor()
        model.load_model(os.path.join(EXPORTS, "best_model.json"))
        print(f"✅ Optimized Model artifacts loaded successfully")
    except Exception as e:
        print(f"❌ CRITICAL: Failed to load artifacts: {e}")

# --- SCHEMAS ---
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

# --- MAPPINGS FROM SPREADSHEET ---
def get_peis_score(v):
    if v in ["I", "II", "III", "IV"]: return 1
    if v in ["V", "VI"]: return 2
    return 3
def get_fault_score(v):
    try: return 1 if float(v) > 10 else 2 if float(v) > 5 else 3
    except: return 2
def get_source_score(v):
    try: return 1 if float(v) < 6.5 else 2 if float(v) < 7.0 else 3
    except: return 2
LIQ_MAP = {"Safe": 1, "Least Susceptible": 1, "Moderately Susceptible": 2, "Highly Susceptible": 3}
def get_wind_score(v):
    try: return 1 if float(v) <= 225 else 2 if float(v) <= 279 else 3
    except: return 1
TERRAIN_MAP = {"Numerous Obstruction": 1, "Minimal Obstruction": 2, "Flat Terrain": 3}
SLOPE_MAP = {"1-8 degrees": 1, "9-30 degrees": 2, "31-60 degrees": 3, "above 60 degrees": 3}
def get_elevation_score(v):
    try: return 1 if float(v) > 10 else 2 if float(v) >= 5 else 3
    except: return 1
def get_water_dist_score(v):
    try: return 1 if float(v) > 500 else 2 if float(v) >= 200 else 3
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
    try: return 1 if float(str(v).split()[0]) < 1 else 2 if float(str(v).split()[0]) <= 3 else 3
    except: return 1
ROOF_DESIGN_MAP = {"Hip": 1, "Dutch Hip": 2, "Gable": 2, "Cross Hip Roof": 2, "Monoslope": 3}
ROOF_SLOPE_MAP = {"30 to 45 degrees": 1, "above 45 degrees": 2, "below 30 degrees": 3}
ROOF_MAT_MAP = {"Tiles": 1, "Concrete": 1, "Galvanized Iron Sheets": 2, "Metals": 2, "Asphalt Shingles": 2, "Wood": 3, "Thatch": 3, "Shingles": 3}
FAST_TYPE_MAP = {"Metal Screw": 1, "Nails": 2, "Staples": 3, "Hazel Spars": 3}

# --- ROUTES ---
@app.get("/")
def home():
    return {"status": "online", "message": "HAVEN-RVS ML Server is Live"}

def encode_inputs(hazard: dict, vulnerability: dict, exposure: dict = None, year_built: int = 1950, isStub: bool = False) -> list[float]:
    h = hazard; v = vulnerability; e = exposure
    def_score = 3 if isStub else 2
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
    if e:
        b11=e.get("b11", def_score); b12=e.get("b12", def_score); b13=e.get("b13", def_score); b14=e.get("b14", def_score)
        age_s = get_age_score(year_built)
        b22=e.get("b22", def_score); b23=e.get("b23", (3 if isStub else 1)); b24=e.get("b24", def_score); b25=e.get("b25", def_score)
        b31=e.get("b31", def_score); b32=e.get("b32", def_score); b33=e.get("b33", def_score); b34=e.get("b34", def_score)
        b41=e.get("b41", def_score); b42=e.get("b42", def_score); b43=e.get("b43", def_score); b44=e.get("b44", def_score)
    else:
        b11=def_score; b12=def_score; b13=def_score; b14=def_score
        age_s = get_age_score(year_built)
        b22=def_score; b23=(3 if isStub else 1); b24=def_score; b25=def_score
        b31=def_score; b32=def_score; b33=def_score; b34=def_score
        b41=def_score; b42=def_score; b43=def_score; b44=def_score
    stories = int(v.get("number_of_stories", 1))
    bays = int(v.get("number_of_bays", 5)); spacing = float(v.get("column_spacing_m", 2))
    f_dist = 1 if float(v.get("roof_fastener_distance_mm", 200)) <= 225 else 2 if float(v.get("roof_fastener_distance_mm", 200)) <= 450 else 3
    return [
        peis, fault, source, liq, wind, terrain, slope, elev, water, runoff, base, drain,
        b11, b12, b13, b14, age_s, b22, b23, b24, b25, b31, b32, b33, b34, b41, b42, b43, b44,
        CODE_MAP.get(v.get("building_code"), 2), PLAN_MAP.get(v.get("plan_irregularity"), 1), VERT_MAP.get(v.get("vertical_irregularity"), 1), PROX_MAP.get(v.get("building_proximity"), 1), (3 if stories >= 3 else stories), MAT_MAP.get(v.get("structural_material"), 2), FRAME_MAP.get(v.get("structural_framing_type"), 3), (1 if bays >= 5 else 2 if bays >= 3 else 3), (1 if spacing < 3 else 2 if spacing <= 5 else 3), ENCL_MAP.get(v.get("building_enclosure"), 1), WALL_MAP.get(v.get("wall_material"), 2), FLOOR_MAP.get(v.get("flooring_material"), 1),
        get_crack_score(v.get("maximum_crack")), (3 if v.get("uneven_settlement") else 1), (3 if v.get("beam_column_deformations") else 1), (3 if v.get("finishing_condition") else 1), (3 if v.get("decay_of_structural_member") else 1), (3 if v.get("additional_loads") else 1),
        ROOF_DESIGN_MAP.get(v.get("roof_design"), 2), ROOF_SLOPE_MAP.get(v.get("roof_slope"), 1), ROOF_MAT_MAP.get(v.get("roofing_material"), 2),
        FAST_TYPE_MAP.get(v.get("roof_fastener"), 2), f_dist
    ]

def compute_manual_ratings(hazard: dict, vulnerability: dict, exposure: dict = None, year_built: int = 1950, isStub: bool = False):
    h = hazard; v = vulnerability; e = exposure
    def_score = 3 if isStub else 2
    
    # EXACT SPREADSHEET WEIGHTS
    a1 = (get_peis_score(h.get("earthquake_intensity")) * 0.224) + (get_fault_score(h.get("fault_distance_km", 10)) * 0.185) + (get_source_score(h.get("seismic_source_type", 7.0)) * 0.364) + (LIQ_MAP.get(h.get("potential_liquefaction"), 2) * 0.227)
    a2 = (get_wind_score(h.get("basic_wind_speed_kph", 260)) * 0.657) + (TERRAIN_MAP.get(h.get("terrain"), 2) * 0.343)
    a3 = (SLOPE_MAP.get(h.get("slope_degrees"), 1) * 0.087) + (get_elevation_score(h.get("elevation_m", 12)) * 0.211) + (get_water_dist_score(h.get("distance_to_water_m", 500)) * 0.175) + (RUNOFF_MAP.get(h.get("surface_runoff"), 2) * 0.269) + (BASE_MAP.get(h.get("base_height"), 2) * 0.140) + (DRAIN_MAP.get(h.get("drainage_system"), 3) * 0.118)
    h_rating = np.mean([a1, a2, a3])
    
    if e:
        b1 = (e.get("b11", def_score)*0.159) + (e.get("b12", def_score)*0.168) + (e.get("b13", def_score)*0.344) + (e.get("b14", def_score)*0.329)
        b2 = (get_age_score(year_built)*0.401) + (e.get("b22", def_score)*0.125) + (e.get("b23", (3 if isStub else 1))*0.093) + (e.get("b24", def_score)*0.158) + (e.get("b25", def_score)*0.223)
        b3 = (e.get("b31", def_score)*0.378) + (e.get("b32", def_score)*0.217) + (e.get("b33", def_score)*0.133) + (e.get("b34", def_score)*0.272)
        b4 = (e.get("b41", def_score)*0.244) + (e.get("b42", def_score)*0.361) + (e.get("b43", def_score)*0.115) + (e.get("b44", def_score)*0.280)
    else:
        b1 = (def_score*0.159) + (def_score*0.168) + (def_score*0.344) + (def_score*0.329)
        b2 = (get_age_score(year_built)*0.401) + (def_score*0.125) + ((3 if isStub else 1)*0.093) + (def_score*0.158) + (def_score*0.223)
        b3 = (def_score*0.378) + (def_score*0.217) + (def_score*0.133) + (def_score*0.272)
        b4 = (def_score*0.244) + (def_score*0.361) + (def_score*0.115) + (def_score*0.280)
    e_rating = np.mean([b1, b2, b3, b4])
    
    stories = int(v.get("number_of_stories", 1))
    bays = int(v.get("number_of_bays", 5)); spacing = float(v.get("column_spacing_m", 2))
    c1_s = [CODE_MAP.get(v.get("building_code"), 2), PLAN_MAP.get(v.get("plan_irregularity"), 1), VERT_MAP.get(v.get("vertical_irregularity"), 1), PROX_MAP.get(v.get("building_proximity"), 1), 3 if stories >= 3 else stories, MAT_MAP.get(v.get("structural_material"), 2), FRAME_MAP.get(v.get("structural_framing_type"), 3), 1 if bays >= 5 else 2 if bays >= 3 else 3, 1 if spacing < 3 else 2 if spacing <= 5 else 3, ENCL_MAP.get(v.get("building_enclosure"), 1), WALL_MAP.get(v.get("wall_material"), 2), FLOOR_MAP.get(v.get("flooring_material"), 1)]
    c1 = sum(s * w for s, w in zip(c1_s, [0.092, 0.053, 0.057, 0.063, 0.031, 0.098, 0.051, 0.082, 0.146, 0.113, 0.102, 0.069]))
    c2 = sum(s * w for s, w in zip([get_crack_score(v.get("maximum_crack")), 3 if v.get("uneven_settlement") else 1, 3 if v.get("beam_column_deformations") else 1, 3 if v.get("finishing_condition") else 1, 3 if v.get("decay_of_structural_member") else 1, 3 if v.get("additional_loads") else 1], [0.158, 0.147, 0.213, 0.124, 0.133, 0.225]))
    c3 = (ROOF_DESIGN_MAP.get(v.get("roof_design"), 2)*0.344) + (ROOF_SLOPE_MAP.get(v.get("roof_slope"), 1)*0.424) + (ROOF_MAT_MAP.get(v.get("roofing_material"), 2)*0.232)
    f_score = 1 if float(v.get("roof_fastener_distance_mm", 200)) <= 225 else 2 if float(v.get("roof_fastener_distance_mm", 200)) <= 450 else 3
    c4 = (FAST_TYPE_MAP.get(v.get("roof_fastener"), 2)*0.632) + (f_score*0.368)
    v_rating = np.mean([c1, c2, c3, c4])
    
    risk_rating = h_rating * e_rating * v_rating
    manual_idx = (risk_rating / 27) * 10
    return manual_idx, h_rating, e_rating, v_rating, risk_rating

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        load_artifacts()
        manual_idx, h_val, e_val, v_val, risk_rating = compute_manual_ratings(req.hazard, req.vulnerability, req.exposure, req.year_built, req.isStub)
        ml_val = 0.0
        if model and scaler:
            features = encode_inputs(req.hazard, req.vulnerability, req.exposure, req.year_built, req.isStub)
            ml_val = round(float(model.predict(scaler.transform([features]))[0]), 4)
        desc = "LOW RISK" if manual_idx <= 3.58 else "MODERATE RISK" if manual_idx <= 6.79 else "HIGH RISK"
        return PredictResponse(
            risk_index=round(float(manual_idx), 4), risk_description=desc,
            hazard_rating=round(float(h_val), 4), vulnerability_rating=round(float(v_val), 4),
            exposure_rating=round(float(e_val), 4), risk_rating=round(float(risk_rating), 4),
            ml_prediction=ml_val
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=str(e))
