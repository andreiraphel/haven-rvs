import pandas as pd
import numpy as np
import pickle
import os
import requests
from dotenv import load_dotenv
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score, classification_report, confusion_matrix
from xgboost import XGBRegressor, XGBClassifier

# --- CONFIGURATION ---
RANDOM_SEED = 42
SYNTHETIC_SAMPLES = 100000
np.random.seed(RANDOM_SEED)

# --- LOAD ENVIRONMENT ---
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env.local'))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("❌ Missing Supabase credentials in environment variables.")

# --- MAPPINGS (MAPPING FROM main.py) ---
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
RUNOFF_MAP = {"Soil": 1, "Lawn": 1, "Grass": 1, "Clay": 2, "Concrete": 3, "Asphalt": 3, "Brick": 3}
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
ROOF_SLOPE_MAP = {"30 to 45 degrees": 1, "between 30 to 45 degrees": 1, "above 45 degrees": 2, "below 30 degrees": 3}
ROOF_MAT_MAP = {"Tiles": 1, "Concrete": 1, "Galvanized Iron Sheets": 2, "Metals": 2, "Asphalt Shingles": 2, "Wood": 3, "Thatch": 3, "Shingles": 3}
FAST_TYPE_MAP = {"Metal Screw": 1, "Nails": 2, "Staples": 3, "Hazel Spars": 3}

# --- LOAD WEIGHTS FROM SUPABASE ---
print("🔄 Fetching latest weights from Supabase...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/risk_weights?select=weights&active=eq.true&order=created_at.desc&limit=1",
    headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
)
response.raise_for_status()
weights_data = response.json()

if not weights_data:
    raise Exception("❌ No active weights found in the database.")

weights = weights_data[0]['weights']
H_W = weights['hazard']
E_W = weights['exposure']
V_W = weights['vulnerability']
print("✅ Successfully loaded weights from DB.")

# --- FETCH REAL DATA FROM SUPABASE ---
print("🔄 Fetching real buildings from Supabase...")
# Fetch buildings joined with their indicators
# We'll fetch them individually to avoid complex joins and handle the mapping easily
def fetch_supabase_table(table):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}?select=*",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json"
        }
    )
    resp.raise_for_status()
    return resp.json()

real_buildings = fetch_supabase_table("buildings")
real_hazards = {h['building_id']: h for h in fetch_supabase_table("hazard_indicators")}
real_vulns = {v['building_id']: v for v in fetch_supabase_table("vulnerability_indicators")}
real_exposures = {e['building_id']: e for e in fetch_supabase_table("exposure_indicators")}

def encode_real_building(b, h, v, e):
    # This logic must match main.py encode_inputs
    def get_max(val, mapping, default_val=1):
        if not val: return default_val
        if isinstance(val, str): return mapping.get(val, default_val)
        return max([mapping.get(x, default_val) for x in val]) if val else default_val

    peis = get_peis_score(h.get("earthquake_intensity"))
    fault = get_fault_score(h.get("fault_distance_km", 10))
    source = get_source_score(h.get("seismic_source_type", 7.0))
    liq = LIQ_MAP.get(h.get("potential_liquefaction"), 2)
    wind = get_wind_score(h.get("basic_wind_speed_kph", 260))
    terrain = TERRAIN_MAP.get(h.get("terrain"), 2)
    slope = SLOPE_MAP.get(h.get("slope_degrees"), 1)
    elev = get_elevation_score(h.get("elevation_m", 12))
    water = get_water_dist_score(h.get("distance_to_water_m", 500))
    
    sr = h.get("surface_runoff", [])
    if isinstance(sr, str): sr = [sr]
    runoff = max([RUNOFF_MAP.get(x, 1) for x in sr]) if sr else 1
    
    base = BASE_MAP.get(h.get("base_height"), 2)
    drain = DRAIN_MAP.get(h.get("drainage_system"), 3)
    
    def_score = 2 # Assuming not a stub
    year_built = b.get("year_built", 1950)
    
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
    bays = int(v.get("number_of_bays", 5))
    spacing = float(v.get("column_spacing_m", 2))
    f_dist = 1 if float(v.get("roof_fastener_distance_mm", 200)) <= 225 else 2 if float(v.get("roof_fastener_distance_mm", 200)) <= 450 else 3

    return [
        peis, fault, source, liq, wind, terrain, slope, elev, water, runoff, base, drain,
        b11, b12, b13, b14, age_s, b22, b23, b24, b25, b31, b32, b33, b34, b41, b42, b43, b44,
        CODE_MAP.get(v.get("building_code"), 2), get_max(v.get("plan_irregularity"), PLAN_MAP, 1), VERT_MAP.get(v.get("vertical_irregularity"), 1), PROX_MAP.get(v.get("building_proximity"), 1), (3 if stories >= 3 else stories), get_max(v.get("structural_material"), MAT_MAP, 2), (1 if bays >= 5 else 2 if bays >= 3 else 3), (1 if spacing < 3 else 2 if spacing <= 5 else 3), get_max(v.get("building_enclosure"), ENCL_MAP, 1), get_max(v.get("wall_material"), WALL_MAP, 2), get_max(v.get("structural_framing_type"), FRAME_MAP, 3), get_max(v.get("flooring_material"), FLOOR_MAP, 1),
        get_crack_score(v.get("maximum_crack")), (3 if v.get("uneven_settlement") else 1), (3 if v.get("beam_column_deformations") else 1), (3 if v.get("finishing_condition") else 1), (3 if v.get("decay_of_structural_member") else 1), (3 if v.get("additional_loads") else 1),
        get_max(v.get("roof_design"), ROOF_DESIGN_MAP, 2), ROOF_SLOPE_MAP.get(v.get("roof_slope"), 1), get_max(v.get("roofing_material"), ROOF_MAT_MAP, 2),
        get_max(v.get("roof_fastener"), FAST_TYPE_MAP, 2), f_dist
    ]

def compute_label(feats):
    # feats is a list of 52 values (1-3)
    # Mapping must match index positions from generate_data
    # a1: 0-3, a2: 4-5, a3: 6-11
    # b1: 12-15, b2: 16-20, b3: 21-24, b4: 25-28
    # c1: 29-40, c2: 41-46, c3: 47-49, c4: 50-51
    
    a1 = np.array(feats[0:4]) @ np.array([H_W['earthquake_intensity'], H_W['fault_distance'], H_W['seismic_source'], H_W['liquefaction']])
    a2 = np.array(feats[4:6]) @ np.array([H_W['wind_speed'], H_W['terrain']])
    a3 = np.array(feats[6:12]) @ np.array([H_W['slope'], H_W['elevation'], H_W['water_distance'], H_W['runoff'], H_W['base_height'], H_W['drainage']])
    H = (a1 + a2 + a3) / 3.0
    
    b1 = np.array(feats[12:16]) @ np.array([E_W['b11'], E_W['b12'], E_W['b13'], E_W['b14']])
    b2 = np.array(feats[16:21]) @ np.array([E_W['b21'], E_W['b22'], E_W['b23'], E_W['b24'], E_W['b25']])
    b3 = np.array(feats[21:25]) @ np.array([E_W['b31'], E_W['b32'], E_W['b33'], E_W['b34']])
    b4 = np.array(feats[25:29]) @ np.array([E_W['b41'], E_W['b42'], E_W['b43'], E_W['b44']])
    E = (b1 + b2 + b3 + b4) / 4.0
    
    c1 = np.array(feats[29:41]) @ np.array([V_W['building_code'], V_W['plan_irregularity'], V_W['vertical_irregularity'], V_W['building_proximity'], V_W['stories'], V_W['material'], V_W['bays'], V_W['column_spacing'], V_W['enclosure'], V_W['wall_material'], V_W['framing'], V_W['flooring']])
    c2 = np.array(feats[41:47]) @ np.array([V_W['crack'], V_W['settlement'], V_W['deformations'], V_W['finishing'], V_W['decay'], V_W['loads']])
    c3 = np.array(feats[47:50]) @ np.array([V_W['roof_design'], V_W['roof_slope'], V_W['roof_material']])
    c4 = np.array(feats[50:52]) @ np.array([V_W['roof_fastener_type'], V_W['roof_fastener_dist']])
    V = (c1 + c2 + c3 + c4) / 4.0
    
    idx = (H * E * V / 27.0) * 10.0
    lbl = 0 if idx <= 3.58 else 1 if idx <= 6.79 else 2
    return idx, lbl

real_data_list = []
for b in real_buildings:
    bid = b['id']
    h = real_hazards.get(bid)
    v = real_vulns.get(bid)
    e = real_exposures.get(bid)
    
    if h and v:
        f = encode_real_building(b, h, v, e)
        idx, lbl = compute_label(f)
        real_data_list.append(f + [idx, lbl])

print(f"✅ Found {len(real_data_list)} real building records.")

# --- SYNTHETIC DATA GENERATION ---
def generate_synthetic_data(n):
    target_per_class = n // 3
    print(f"🎯 Generating balanced synthetic dataset using vectorized computation...")
    
    cols = [f'feat_{i}' for i in range(52)]
    all_dfs = []
    
    for p_dist in [
        [0.85, 0.10, 0.05], # LOW risk
        [0.10, 0.80, 0.10], # MODERATE risk
        [0.01, 0.04, 0.95], # HIGH risk
        [0.40, 0.40, 0.20], # Mixed
        [0.20, 0.40, 0.40], # Mixed
    ]:
        batch_size = target_per_class * 2
        X_block = np.random.choice([1, 2, 3], size=(batch_size, len(cols)), p=p_dist).astype(np.int8)
        
        # Vectorized Risk Calculation
        a1 = X_block[:, 0:4] @ np.array([H_W['earthquake_intensity'], H_W['fault_distance'], H_W['seismic_source'], H_W['liquefaction']])
        a2 = X_block[:, 4:6] @ np.array([H_W['wind_speed'], H_W['terrain']])
        a3 = X_block[:, 6:12] @ np.array([H_W['slope'], H_W['elevation'], H_W['water_distance'], H_W['runoff'], H_W['base_height'], H_W['drainage']])
        H = (a1 + a2 + a3) / 3.0
        
        b1 = X_block[:, 12:16] @ np.array([E_W['b11'], E_W['b12'], E_W['b13'], E_W['b14']])
        b2 = X_block[:, 16:21] @ np.array([E_W['b21'], E_W['b22'], E_W['b23'], E_W['b24'], E_W['b25']])
        b3 = X_block[:, 21:25] @ np.array([E_W['b31'], E_W['b32'], E_W['b33'], E_W['b34']])
        b4 = X_block[:, 25:29] @ np.array([E_W['b41'], E_W['b42'], E_W['b43'], E_W['b44']])
        E = (b1 + b2 + b3 + b4) / 4.0
        
        c1 = X_block[:, 29:41] @ np.array([V_W['building_code'], V_W['plan_irregularity'], V_W['vertical_irregularity'], V_W['building_proximity'], V_W['stories'], V_W['material'], V_W['bays'], V_W['column_spacing'], V_W['enclosure'], V_W['wall_material'], V_W['framing'], V_W['flooring']])
        c2 = X_block[:, 41:47] @ np.array([V_W['crack'], V_W['settlement'], V_W['deformations'], V_W['finishing'], V_W['decay'], V_W['loads']])
        c3 = X_block[:, 47:50] @ np.array([V_W['roof_design'], V_W['roof_slope'], V_W['roof_material']])
        c4 = X_block[:, 50:52] @ np.array([V_W['roof_fastener_type'], V_W['roof_fastener_dist']])
        V = (c1 + c2 + c3 + c4) / 4.0
        
        idx = (H * E * V / 27.0) * 10.0
        labels = np.where(idx <= 3.58, 0, np.where(idx <= 6.79, 1, 2))
        
        df_block = pd.DataFrame(X_block, columns=cols)
        df_block['risk_index'] = idx
        df_block['risk_label'] = labels
        all_dfs.append(df_block)
        
    full_df = pd.concat(all_dfs)
    
    balanced_dfs = []
    for i in range(3):
        class_df = full_df[full_df['risk_label'] == i]
        if len(class_df) < target_per_class:
            class_df = class_df.sample(target_per_class, replace=True)
        else:
            class_df = class_df.sample(target_per_class, replace=False)
        balanced_dfs.append(class_df)
        
    return pd.concat(balanced_dfs).sample(frac=1).reset_index(drop=True)

print(f'📊 Generating {SYNTHETIC_SAMPLES} synthetic samples...')
df_syn = generate_synthetic_data(SYNTHETIC_SAMPLES)

# COMBINE REAL AND SYNTHETIC
if real_data_list:
    df_real = pd.DataFrame(real_data_list, columns=df_syn.columns)
    # Upsample real data to give it more weight (optional, here we just mix it)
    df = pd.concat([df_real, df_syn]).sample(frac=1).reset_index(drop=True)
else:
    df = df_syn

X = df.drop(['risk_index', 'risk_label'], axis=1)
y_idx = df['risk_index']
y_lbl = df['risk_label']

X_train, X_test, y_idx_train, y_idx_test, y_lbl_train, y_lbl_test = train_test_split(X, y_idx, y_lbl, test_size=0.2, random_state=RANDOM_SEED)

scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# --- TRAINING ---
print('🚀 Training Index Regressor...')
reg = XGBRegressor(n_estimators=2000, max_depth=8, learning_rate=0.05, random_state=RANDOM_SEED, n_jobs=-1)
reg.fit(X_train_scaled, y_idx_train)

print('🚀 Training Category Classifier...')
clf = XGBClassifier(n_estimators=500, max_depth=6, learning_rate=0.05, random_state=RANDOM_SEED, n_jobs=-1)
clf.fit(X_train_scaled, y_lbl_train)

# --- EVALUATION ---
idx_preds = reg.predict(X_test_scaled)
lbl_preds = clf.predict(X_test_scaled)

print("\n--- PERFORMANCE REPORT ---")
r2 = r2_score(y_idx_test, idx_preds)
mae = mean_absolute_error(y_idx_test, idx_preds)
acc = accuracy_score(y_lbl_test, lbl_preds)
print(f"XGBoost Index Prediction (R2): {r2:.4f}")
print(f"XGBoost Index Prediction (MAE): {mae:.4f}")
print(f"XGBoost Category Prediction (Accuracy): {acc:.4f}")

# Visualizations
os.makedirs('figures', exist_ok=True)
plt.figure(figsize=(8, 6))
cm = confusion_matrix(y_lbl_test, lbl_preds)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['LOW', 'MOD', 'HIGH'], yticklabels=['LOW', 'MOD', 'HIGH'])
plt.title(f'XGBoost Risk Category Confusion Matrix (Acc: {acc:.2%})')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.savefig('figures/confusion_matrix.png')
plt.close()

plt.figure(figsize=(12, 8))
feat_importances = pd.Series(reg.feature_importances_, index=X.columns)
feat_importances.nlargest(20).plot(kind='barh')
plt.title('Top 20 Features (XGBoost Importance)')
plt.xlabel('Relative Importance')
plt.tight_layout()
plt.savefig('figures/feature_importance.png')
plt.close()

# --- EXPORT ---
os.makedirs('model_exports', exist_ok=True)
reg.save_model('model_exports/best_model.json')
clf.save_model('model_exports/classifier_model.json')
pickle.dump(scaler, open('model_exports/scaler.pkl', 'wb'))
le = LabelEncoder().fit(['LOW RISK', 'MODERATE RISK', 'HIGH RISK'])
pickle.dump(le, open('model_exports/label_encoder.pkl', 'wb'))

print(f'\n✅ Hybrid Training Complete. (Real: {len(real_data_list)}, Synthetic: {SYNTHETIC_SAMPLES})')
