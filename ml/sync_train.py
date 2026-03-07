import pandas as pd
import numpy as np
import pickle
import os
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from xgboost import XGBRegressor

RANDOM_SEED = 42
SYNTHETIC_SAMPLES = 50000
np.random.seed(RANDOM_SEED)

# --- EXACT WEIGHTS FROM SPREADSHEET ---
H_W = {
    'a1': [0.224, 0.185, 0.364, 0.227], # PEIS, Fault, Source, Liq
    'a2': [0.657, 0.343],              # Wind, Terrain
    'a3': [0.087, 0.211, 0.175, 0.269, 0.14, 0.118] # Slope, Elev, Water, Runoff, Base, Drain
}
E_W = {
    'b1': [0.159, 0.168, 0.344, 0.329],
    'b2': [0.401, 0.125, 0.093, 0.158, 0.223],
    'b3': [0.378, 0.217, 0.133, 0.272],
    'b4': [0.244, 0.361, 0.115, 0.280]
}
V_W = {
    'c1': [0.092, 0.053, 0.057, 0.063, 0.031, 0.098, 0.051, 0.082, 0.146, 0.113, 0.102, 0.069],
    'c2': [0.158, 0.147, 0.213, 0.124, 0.133, 0.225],
    'c3': [0.344, 0.424, 0.232],
    'c4': [0.632, 0.368]
}

def compute_manual_index(r):
    # Hazard
    a1 = sum(r[f'a1_{i}'] * H_W['a1'][i] for i in range(4))
    a2 = sum(r[f'a2_{i}'] * H_W['a2'][i] for i in range(2))
    a3 = sum(r[f'a3_{i}'] * H_W['a3'][i] for i in range(6))
    H = np.mean([a1, a2, a3])
    
    # Exposure
    b1 = sum(r[f'b1_{i}'] * E_W['b1'][i] for i in range(4))
    b2 = sum(r[f'b2_{i}'] * E_W['b2'][i] for i in range(5))
    b3 = sum(r[f'b3_{i}'] * E_W['b3'][i] for i in range(4))
    b4 = sum(r[f'b4_{i}'] * E_W['b4'][i] for i in range(4))
    E = np.mean([b1, b2, b3, b4])
    
    # Vulnerability
    c1 = sum(r[f'c1_{i}'] * V_W['c1'][i] for i in range(12))
    c2 = sum(r[f'c2_{i}'] * V_W['c2'][i] for i in range(6))
    c3 = sum(r[f'c3_{i}'] * V_W['c3'][i] for i in range(3))
    c4 = sum(r[f'c4_{i}'] * V_W['c4'][i] for i in range(2))
    V = np.mean([c1, c2, c3, c4])
    
    risk_rating = H * E * V
    return (risk_rating / 27) * 10

def generate_data(n):
    rows = []
    for _ in range(n):
        r = {}
        dice = np.random.random()
        if dice < 0.25: low, high = 1, 2
        elif dice > 0.75: low, high = 2, 3
        else: low, high = 1, 3
        
        # Fill all 52 features
        for i in range(4): r[f'a1_{i}'] = np.random.randint(low, high+1)
        for i in range(2): r[f'a2_{i}'] = np.random.randint(low, high+1)
        for i in range(6): r[f'a3_{i}'] = np.random.randint(low, high+1)
        for i in range(4): r[f'b1_{i}'] = np.random.randint(low, high+1)
        for i in range(5): r[f'b2_{i}'] = np.random.randint(low, high+1)
        for i in range(4): r[f'b3_{i}'] = np.random.randint(low, high+1)
        for i in range(4): r[f'b4_{i}'] = np.random.randint(low, high+1)
        for i in range(12): r[f'c1_{i}'] = np.random.randint(low, high+1)
        for i in range(6): r[f'c2_{i}'] = np.random.randint(low, high+1)
        for i in range(3): r[f'c3_{i}'] = np.random.randint(low, high+1)
        for i in range(2): r[f'c4_{i}'] = np.random.randint(low, high+1)
        
        r['risk_index'] = compute_manual_index(r)
        rows.append(r)
    return pd.DataFrame(rows)

print(f'Generating {SYNTHETIC_SAMPLES} samples aligned with spreadsheet weights...')
df = generate_data(SYNTHETIC_SAMPLES)
X = df.drop('risk_index', axis=1)
y = df['risk_index']

scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

print('Training Memory-Optimized High-Fidelity model...')
model = XGBRegressor(
    n_estimators=500,
    max_depth=6,
    learning_rate=0.05,
    random_state=RANDOM_SEED,
    n_jobs=-1
)
model.fit(X_scaled, y)

os.makedirs('ml/model_exports', exist_ok=True)
model.save_model('ml/model_exports/best_model.json')
pickle.dump(scaler, open('ml/model_exports/scaler.pkl', 'wb'))
le = LabelEncoder().fit(['LOW RISK', 'MODERATE RISK', 'HIGH RISK'])
pickle.dump(le, open('ml/model_exports/label_encoder.pkl', 'wb'))

print(f'✅ Model re-trained and synchronized with spreadsheet. Samples: {len(df)}')
