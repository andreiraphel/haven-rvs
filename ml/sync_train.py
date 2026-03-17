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
SYNTHETIC_SAMPLES = 1500000
np.random.seed(RANDOM_SEED)

# --- LOAD WEIGHTS FROM SUPABASE ---
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env.local'))

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

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
data = response.json()

if not data:
    raise Exception("❌ No active weights found in the database. Please run schema.sql to seed the weights first.")

weights = data[0]['weights']
print("✅ Successfully loaded weights from DB.")

H_W = weights['hazard']
E_W = weights['exposure']
V_W = weights['vulnerability']

def compute_manual_index(r):
    a1 = (r['a1_0'] * H_W['earthquake_intensity']) + (r['a1_1'] * H_W['fault_distance']) + (r['a1_2'] * H_W['seismic_source']) + (r['a1_3'] * H_W['liquefaction'])
    a2 = (r['a2_0'] * H_W['wind_speed']) + (r['a2_1'] * H_W['terrain'])
    a3 = (r['a3_0'] * H_W['slope']) + (r['a3_1'] * H_W['elevation']) + (r['a3_2'] * H_W['water_distance']) + (r['a3_3'] * H_W['runoff']) + (r['a3_4'] * H_W['base_height']) + (r['a3_5'] * H_W['drainage'])
    H = np.mean([a1, a2, a3])

    b1 = (r['b1_0'] * E_W['b11']) + (r['b1_1'] * E_W['b12']) + (r['b1_2'] * E_W['b13']) + (r['b1_3'] * E_W['b14'])
    b2 = (r['b2_0'] * E_W['b21']) + (r['b2_1'] * E_W['b22']) + (r['b2_2'] * E_W['b23']) + (r['b2_3'] * E_W['b24']) + (r['b2_4'] * E_W['b25'])
    b3 = (r['b3_0'] * E_W['b31']) + (r['b3_1'] * E_W['b32']) + (r['b3_2'] * E_W['b33']) + (r['b3_3'] * E_W['b34'])
    b4 = (r['b4_0'] * E_W['b41']) + (r['b4_1'] * E_W['b42']) + (r['b4_2'] * E_W['b43']) + (r['b4_3'] * E_W['b44'])
    E = np.mean([b1, b2, b3, b4])

    c1 = (r['c1_0'] * V_W['building_code']) + (r['c1_1'] * V_W['plan_irregularity']) + (r['c1_2'] * V_W['vertical_irregularity']) + (r['c1_3'] * V_W['building_proximity']) + (r['c1_4'] * V_W['stories']) + (r['c1_5'] * V_W['material']) + (r['c1_6'] * V_W['bays']) + (r['c1_7'] * V_W['column_spacing']) + (r['c1_8'] * V_W['enclosure']) + (r['c1_9'] * V_W['wall_material']) + (r['c1_10'] * V_W['framing']) + (r['c1_11'] * V_W['flooring'])
    c2 = (r['c2_0'] * V_W['crack']) + (r['c2_1'] * V_W['settlement']) + (r['c2_2'] * V_W['deformations']) + (r['c2_3'] * V_W['finishing']) + (r['c2_4'] * V_W['decay']) + (r['c2_5'] * V_W['loads'])
    c3 = (r['c3_0'] * V_W['roof_design']) + (r['c3_1'] * V_W['roof_slope']) + (r['c3_2'] * V_W['roof_material'])
    c4 = (r['c4_0'] * V_W['roof_fastener_type']) + (r['c4_1'] * V_W['roof_fastener_dist'])
    V = np.mean([c1, c2, c3, c4])

    return (H * E * V / 27) * 10
def get_risk_label(idx):
    if idx <= 3.58: return 0 # LOW
    if idx <= 6.79: return 1 # MODERATE
    return 2 # HIGH

def generate_data(n):
    target_per_class = n // 3
    print(f"🎯 Generating balanced dataset using vectorized computation...")
    
    cols = [f'a1_{i}' for i in range(4)] + [f'a2_{i}' for i in range(2)] + [f'a3_{i}' for i in range(6)] + \
           [f'b1_{i}' for i in range(4)] + [f'b2_{i}' for i in range(5)] + [f'b3_{i}' for i in range(4)] + [f'b4_{i}' for i in range(4)] + \
           [f'c1_{i}' for i in range(12)] + [f'c2_{i}' for i in range(6)] + [f'c3_{i}' for i in range(3)] + [f'c4_{i}' for i in range(2)]
    
    all_dfs = []
    # With the new weights, generating exact 0 and 2 classes is statistically harder.
    # We must aggressively skew the probability arrays to force the math to hit extremes.
    for p_dist in [
        [0.85, 0.10, 0.05], # Aggressively force 1s for LOW risk
        [0.10, 0.80, 0.10], # Force 2s for MODERATE risk
        [0.01, 0.04, 0.95], # Aggressively force 3s for HIGH risk
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
    
    # Sub-sample to get exactly target_per_class for each
    balanced_dfs = []
    for i in range(3):
        class_df = full_df[full_df['risk_label'] == i]
        if len(class_df) < target_per_class:
            print(f"⚠️ Warning: Not enough samples for class {i} (Got {len(class_df)}, need {target_per_class}). Bootstrapping...")
            class_df = class_df.sample(target_per_class, replace=True)
        else:
            class_df = class_df.sample(target_per_class, replace=False)
        balanced_dfs.append(class_df)
        
    balanced_df = pd.concat(balanced_dfs).sample(frac=1).reset_index(drop=True)
    return balanced_df

# 1. DATA PREP
print(f'📊 Generating {SYNTHETIC_SAMPLES} samples...')
df = generate_data(SYNTHETIC_SAMPLES)
X = df.drop(['risk_index', 'risk_label'], axis=1)
y_idx = df['risk_index']
y_lbl = df['risk_label']

X_train, X_test, y_idx_train, y_idx_test, y_lbl_train, y_lbl_test = train_test_split(X, y_idx, y_lbl, test_size=0.2, random_state=RANDOM_SEED)

scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# 2. TRAIN REGRESSOR (For Precise Index)
print('🚀 Training Index Regressor...')
reg = XGBRegressor(n_estimators=500, max_depth=6, learning_rate=0.05, random_state=RANDOM_SEED, n_jobs=-1)
reg.fit(X_train_scaled, y_idx_train)

# 3. TRAIN CLASSIFIER (For Direct Category Prediction)
print('🚀 Training Category Classifier...')
clf = XGBClassifier(n_estimators=500, max_depth=6, learning_rate=0.05, random_state=RANDOM_SEED, n_jobs=-1)
clf.fit(X_train_scaled, y_lbl_train)

from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression

# ... (previous code same until Evaluation)

# 4. EVALUATION
idx_preds = reg.predict(X_test_scaled)
lbl_preds = clf.predict(X_test_scaled)

print("\n--- PERFORMANCE REPORT ---")
r2 = r2_score(y_idx_test, idx_preds)
acc = accuracy_score(y_lbl_test, lbl_preds)
print(f"XGBoost Index Prediction (R2): {r2:.4f}")
print(f"XGBoost Category Prediction (Accuracy): {acc:.4f}")

# Visualizations
os.makedirs('figures', exist_ok=True)

# 1. Confusion Matrix
plt.figure(figsize=(8, 6))
cm = confusion_matrix(y_lbl_test, lbl_preds)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['LOW', 'MOD', 'HIGH'], yticklabels=['LOW', 'MOD', 'HIGH'])
plt.title(f'XGBoost Risk Category Confusion Matrix (Acc: {acc:.2%})')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.savefig('figures/confusion_matrix.png')
plt.close()

# 2. Feature Importance
plt.figure(figsize=(12, 8))
feat_importances = pd.Series(reg.feature_importances_, index=X.columns)
feat_importances.nlargest(20).plot(kind='barh')
plt.title('Top 20 Features (XGBoost Importance)')
plt.xlabel('Relative Importance')
plt.tight_layout()
plt.savefig('figures/feature_importance.png')
plt.close()

# 3. Accuracy Plot (XGBoost)
plt.figure(figsize=(10, 6))
plt.scatter(y_idx_test, idx_preds, alpha=0.3, color='green')
plt.plot([y_idx.min(), y_idx.max()], [y_idx.min(), y_idx.max()], 'r--', lw=2)
plt.title(f'XGBoost: Predicted vs Actual Risk Index (R2: {r2:.4f})')
plt.xlabel('Actual Index')
plt.ylabel('Predicted Index')
plt.savefig('figures/xgboost_accuracy.png')
plt.close()

# 5. EXPORT
os.makedirs('model_exports', exist_ok=True)
reg.save_model('model_exports/best_model.json') # Regressor
clf.save_model('model_exports/classifier_model.json') # Classifier
pickle.dump(scaler, open('model_exports/scaler.pkl', 'wb'))
le = LabelEncoder().fit(['LOW RISK', 'MODERATE RISK', 'HIGH RISK'])
pickle.dump(le, open('model_exports/label_encoder.pkl', 'wb'))

print(f'\n✅ Dual-Model Training Complete.')
print(f'✅ Artifacts saved: best_model.json (Index) and classifier_model.json (Category)')
