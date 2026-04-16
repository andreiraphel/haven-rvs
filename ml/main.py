from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import numpy as np
import pandas as pd
import os
import requests
from dotenv import load_dotenv
from xgboost import XGBRegressor, XGBClassifier
from contextlib import asynccontextmanager
import datetime

if os.path.exists('.env'):
    load_dotenv('.env')
elif os.path.exists('../.env.local'):
    load_dotenv(dotenv_path='../.env.local')

# --- MEMORY OPTIMIZED LOADING ---
model_idx = None # Regressor
model_clf = None # Classifier
scaler = None
le = None

def load_artifacts():
    global model_idx, model_clf, scaler, le
    if model_idx is not None: return

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    EXPORTS = os.path.join(BASE_DIR, "model_exports")
    if not os.path.exists(EXPORTS):
        EXPORTS = "model_exports"

    try:
        m_path = os.path.join(EXPORTS, "best_model.json")
        s_path = os.path.join(EXPORTS, "scaler.pkl")
        l_path = os.path.join(EXPORTS, "label_encoder.pkl")
        c_path = os.path.join(EXPORTS, "classifier_model.json")

        scaler = pickle.load(open(s_path, "rb"))
        le     = pickle.load(open(l_path, "rb"))
        model_idx = XGBRegressor()
        model_idx.load_model(m_path)
        model_clf = XGBClassifier()
        model_clf.load_model(c_path)
        print(f"✅ Model artifacts loaded successfully")
    except Exception as e:
        print(f"❌ CRITICAL ERROR during loading: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models on startup to avoid race conditions during concurrent requests
    load_artifacts()
    yield

# Initialize FastAPI with lifespan
app = FastAPI(
    title="HAVEN-RVS Dual-Engine ML Server",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    ml_category: str

# --- MAPPINGS ---
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
FLOOD_MAP = {"Low Susceptibility": 1, "Moderate Susceptibility": 2, "High Susceptibility": 3}
STORM_SURGE_MAP = {"1.0 m- 2.0 m": 1, "2.1 m- 3.0 m": 2, "3.0 m and above": 3}
SLOPE_MAP = {"1-8 degrees": 1, "9-30 degrees": 2, "31-60 degrees": 3, "above 60 degrees": 3}
def get_elevation_score(v):
    try: return 1 if float(v) > 10 else 2 if float(v) >= 5 else 3
    except: return 1
def get_water_dist_score(v):
    try: return 1 if float(v) > 500 else 2 if float(v) >= 200 else 3
    except: return 1
RUNOFF_MAP = {"Soil": 1, "Lawn": 1, "Grass": 1, "Clay": 2, "Concrete": 3, "Asphalt": 3, "Brick": 3}
BASE_MAP = {"Base is higher": 1, "Same Level": 2, "Base is lower": 3}
DRAIN_MAP = {"Closed drainage system": 1, "Open drainage system": 2, "No Drainage System": 3}
def get_age_score(year):
    try:
        age = datetime.datetime.now().year - int(year)
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
ROOF_SLOPE_MAP = {"30 to 45 degrees": 1, "between 30 to 45 degrees": 1, "above 45 degrees": 2, "below 30 degrees": 3}
ROOF_MAT_MAP = {"Tiles": 1, "Concrete": 1, "Galvanized Iron Sheets": 2, "Metals": 2, "Asphalt Shingles": 2, "Wood": 3, "Thatch": 3, "Shingles": 3}
FAST_TYPE_MAP = {"Metal Screw": 1, "Nails": 2, "Staples": 3, "Hazel Spars": 3}

def get_active_weights():
    SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise Exception("Missing Supabase credentials in environment variables.")

    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/risk_weights?select=weights&active=eq.true&order=created_at.desc&limit=1",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
    )
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]['weights']
    raise Exception("Failed to fetch active weights from database.")

# --- ROUTES ---
@app.get("/")
def home():
    return {"status": "online", "message": "HAVEN-RVS Dual-Engine Server is Live"}

def encode_inputs(hazard: dict, vulnerability: dict, exposure: dict = None, year_built: int = 1950, isStub: bool = False) -> list[float]:
    h = hazard; v = vulnerability; e = exposure
    def_score = 3 if isStub else 2
    peis = get_peis_score(h.get("earthquake_intensity"))
    fault = get_fault_score(h.get("fault_distance_km", 10))
    source = get_source_score(h.get("seismic_source_type", 7.0))
    liq = LIQ_MAP.get(h.get("potential_liquefaction"), 2)
    wind = get_wind_score(h.get("basic_wind_speed_kph", 260))
    terrain = TERRAIN_MAP.get(h.get("terrain"), 2)
    flood = FLOOD_MAP.get(h.get("flood_susceptibility"), 1)
    storm = STORM_SURGE_MAP.get(h.get("storm_surge_height"), 1)
    slope = SLOPE_MAP.get(h.get("slope_degrees"), 1)
    elev = get_elevation_score(h.get("elevation_m", 12))
    water = get_water_dist_score(h.get("distance_to_water_m", 500))

    sr = h.get("surface_runoff", [])
    if isinstance(sr, str): sr = [sr]
    runoff = max([RUNOFF_MAP.get(x, 1) for x in sr]) if sr else 1

    base = BASE_MAP.get(h.get("base_height"), 2)
    drain = DRAIN_MAP.get(h.get("drainage_system"), 3)
    if e:
        b11=e.get("b11", def_score); b12=e.get("b12", def_score); b13=e.get("b13", def_score); b14=e.get("b14", def_score)
        age_s = get_age_score(year_built)
        b22=e.get("b22", def_score); b23=e.get("b23", def_score); b24=e.get("b24", def_score); b25=e.get("b25", def_score)
        b31=e.get("b31", def_score); b32=e.get("b32", def_score); b33=e.get("b33", def_score); b34=e.get("b34", def_score)
        b41=e.get("b41", def_score); b42=e.get("b42", def_score); b43=e.get("b43", def_score); b44=e.get("b44", def_score)
    else:
        b11=def_score; b12=def_score; b13=def_score; b14=def_score
        age_s = get_age_score(year_built)
        b22=def_score; b23=def_score; b24=def_score; b25=def_score
        b31=def_score; b32=def_score; b33=def_score; b34=def_score
        b41=def_score; b42=def_score; b43=def_score; b44=def_score
    stories = int(v.get("number_of_stories", 1))
    bays = int(v.get("number_of_bays", 5)); spacing = float(v.get("column_spacing_m", 2))
    f_dist = 1 if float(v.get("roof_fastener_distance_mm", 200)) <= 225 else 2 if float(v.get("roof_fastener_distance_mm", 200)) <= 450 else 3

    def get_max(val, mapping, default_val=1):
        if not val: return default_val
        if isinstance(val, str): return mapping.get(val, default_val)
        return max([mapping.get(x, default_val) for x in val]) if val else default_val

    return [
        peis, fault, source, liq, wind, terrain, flood, storm, slope, elev, water, runoff, base, drain,
        b11, b12, b13, b14, age_s, b22, b23, b24, b25, b31, b32, b33, b34, b41, b42, b43, b44,
        CODE_MAP.get(v.get("building_code"), 2), get_max(v.get("plan_irregularity"), PLAN_MAP, 1), VERT_MAP.get(v.get("vertical_irregularity"), 1), PROX_MAP.get(v.get("building_proximity"), 1), (3 if stories >= 3 else stories), get_max(v.get("structural_material"), MAT_MAP, 2), (1 if bays >= 5 else 2 if bays >= 3 else 3), (1 if spacing < 3 else 2 if spacing <= 5 else 3), get_max(v.get("building_enclosure"), ENCL_MAP, 1), get_max(v.get("wall_material"), WALL_MAP, 2), get_max(v.get("structural_framing_type"), FRAME_MAP, 3), get_max(v.get("flooring_material"), FLOOR_MAP, 1),
        get_crack_score(v.get("maximum_crack")), (3 if v.get("uneven_settlement") else 1), (3 if v.get("beam_column_deformations") else 1), (3 if v.get("finishing_condition") else 1), (3 if v.get("decay_of_structural_member") else 1), (3 if v.get("additional_loads") else 1),
        get_max(v.get("roof_design"), ROOF_DESIGN_MAP, 2), ROOF_SLOPE_MAP.get(v.get("roof_slope"), 1), get_max(v.get("roofing_material"), ROOF_MAT_MAP, 2),
        get_max(v.get("roof_fastener"), FAST_TYPE_MAP, 2), f_dist
    ]

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        # load_artifacts() removed - handled by lifespan startup
        weights = get_active_weights()
        wh = weights['hazard']
        we = weights['exposure']
        wv = weights['vulnerability']

        h = req.hazard; v = req.vulnerability; e = req.exposure
        def_score = 3 if req.isStub else 2

        sr = h.get("surface_runoff", [])
        if isinstance(sr, str): sr = [sr]
        runoff = max([RUNOFF_MAP.get(x, 1) for x in sr]) if sr else 1

        a1 = (get_peis_score(h.get("earthquake_intensity")) * wh['earthquake_intensity']) + (get_fault_score(h.get("fault_distance_km", 10)) * wh['fault_distance']) + (get_source_score(h.get("seismic_source_type", 7.0)) * wh['seismic_source']) + (LIQ_MAP.get(h.get("potential_liquefaction"), 2) * wh['liquefaction'])
        a2 = (get_wind_score(h.get("basic_wind_speed_kph", 260)) * wh['wind_speed']) + (TERRAIN_MAP.get(h.get("terrain"), 2) * wh['terrain'])
        a3 = (FLOOD_MAP.get(h.get("flood_susceptibility"), 1) * wh.get('flood', 0.3576)) + (STORM_SURGE_MAP.get(h.get("storm_surge_height"), 1) * wh.get('storm_surge', 0.2332)) + (SLOPE_MAP.get(h.get("slope_degrees"), 1) * wh.get('slope', 0.0508)) + (get_elevation_score(h.get("elevation_m", 12)) * wh.get('elevation', 0.0681)) + (get_water_dist_score(h.get("distance_to_water_m", 500)) * wh.get('water_distance', 0.0762)) + (runoff * wh.get('runoff', 0.0920)) + (BASE_MAP.get(h.get("base_height"), 2) * wh.get('base_height', 0.0478)) + (DRAIN_MAP.get(h.get("drainage_system"), 3) * wh.get('drainage', 0.0742))
        h_rating = np.mean([a1, a2, a3])

        if e:
            b1 = (e.get("b11", def_score)*we['b11']) + (e.get("b12", def_score)*we['b12']) + (e.get("b13", def_score)*we['b13']) + (e.get("b14", def_score)*we['b14'])
            b2 = (get_age_score(req.year_built)*we['b21']) + (e.get("b22", def_score)*we['b22']) + (e.get("b23", def_score)*we['b23']) + (e.get("b24", def_score)*we['b24']) + (e.get("b25", def_score)*we['b25'])       
            b3 = (e.get("b31", def_score)*we['b31']) + (e.get("b32", def_score)*we['b32']) + (e.get("b33", def_score)*we['b33']) + (e.get("b34", def_score)*we['b34'])
            b4 = (e.get("b41", def_score)*we['b41']) + (e.get("b42", def_score)*we['b42']) + (e.get("b43", def_score)*we['b43']) + (e.get("b44", def_score)*we['b44'])
        else:
            b1 = (def_score*we['b11']) + (def_score*we['b12']) + (def_score*we['b13']) + (def_score*we['b14'])
            b2 = (get_age_score(req.year_built)*we['b21']) + (def_score*we['b22']) + (def_score*we['b23']) + (def_score*we['b24']) + (def_score*we['b25'])
            b3 = (def_score*we['b31']) + (def_score*we['b32']) + (def_score*we['b33']) + (def_score*we['b34'])
            b4 = (def_score*we['b41']) + (def_score*we['b42']) + (def_score*we['b43']) + (def_score*we['b44'])
        e_rating = np.mean([b1, b2, b3, b4])

        stories = int(v.get("number_of_stories", 1))
        bays = int(v.get("number_of_bays", 5)); spacing = float(v.get("column_spacing_m", 2))

        def get_max(val, mapping, default_val=1):
            if not val: return default_val
            if isinstance(val, str): return mapping.get(val, default_val)
            return max([mapping.get(x, default_val) for x in val]) if val else default_val

        c1_s = [CODE_MAP.get(v.get("building_code"), 2), get_max(v.get("plan_irregularity"), PLAN_MAP, 1), VERT_MAP.get(v.get("vertical_irregularity"), 1), PROX_MAP.get(v.get("building_proximity"), 1), 3 if stories >= 3 else stories, get_max(v.get("structural_material"), MAT_MAP, 2), 1 if bays >= 5 else 2 if bays >= 3 else 3, 1 if spacing < 3 else 2 if spacing <= 5 else 3, get_max(v.get("building_enclosure"), ENCL_MAP, 1), get_max(v.get("wall_material"), WALL_MAP, 2), get_max(v.get("structural_framing_type"), FRAME_MAP, 3), get_max(v.get("flooring_material"), FLOOR_MAP, 1)]
        c1 = sum(s * w for s, w in zip(c1_s, [wv['building_code'], wv['plan_irregularity'], wv['vertical_irregularity'], wv['building_proximity'], wv['stories'], wv['material'], wv['bays'], wv['column_spacing'], wv['enclosure'], wv['wall_material'], wv['framing'], wv['flooring']]))

        c2 = sum(s * w for s, w in zip([get_crack_score(v.get("maximum_crack")), 3 if v.get("uneven_settlement") else 1, 3 if v.get("beam_column_deformations") else 1, 3 if v.get("finishing_condition") else 1, 3 if v.get("decay_of_structural_member") else 1, 3 if v.get("additional_loads") else 1], [wv['crack'], wv['settlement'], wv['deformations'], wv['finishing'], wv['decay'], wv['loads']]))

        c3 = (get_max(v.get("roof_design"), ROOF_DESIGN_MAP, 2)*wv['roof_design']) + (ROOF_SLOPE_MAP.get(v.get("roof_slope"), 1)*wv['roof_slope']) + (get_max(v.get("roofing_material"), ROOF_MAT_MAP, 2)*wv['roof_material'])

        f_dist_val = float(v.get("roof_fastener_distance_mm", 200))
        f_score = 1 if f_dist_val <= 225 else 2 if f_dist_val <= 450 else 3
        c4 = (get_max(v.get("roof_fastener"), FAST_TYPE_MAP, 2)*wv['roof_fastener_type']) + (f_score*wv['roof_fastener_dist'])

        v_rating = np.mean([c1, c2, c3, c4])
        risk_rating = h_rating * e_rating * v_rating
        manual_idx = (risk_rating / 27) * 10

        ml_val = 0.0; ml_cat = "UNKNOWN"
        if model_idx and model_clf and scaler:
            feats = encode_inputs(req.hazard, req.vulnerability, req.exposure, req.year_built, req.isStub)
            X_df = pd.DataFrame([feats], columns=scaler.feature_names_in_)
            X_scaled = scaler.transform(X_df)
            ml_val = round(float(model_idx.predict(X_scaled)[0]), 6)
            cat_idx = int(model_clf.predict(X_scaled)[0])
            ml_cat = le.inverse_transform([cat_idx])[0]

        desc = "LOW RISK" if manual_idx <= 1.9 else "MODERATE RISK" if manual_idx <= 6.1 else "HIGH RISK"
        return {
            "risk_index": round(float(manual_idx), 6), "risk_description": desc,
            "hazard_rating": round(float(h_rating), 6), "vulnerability_rating": round(float(v_rating), 6),
            "exposure_rating": round(float(e_rating), 6), "risk_rating": round(float(risk_rating), 6),    
            "ml_prediction": ml_val, "ml_category": ml_cat
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=str(e))
