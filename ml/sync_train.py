import pandas as pd
import numpy as np
import pickle
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score, classification_report, confusion_matrix
from xgboost import XGBRegressor, XGBClassifier

# --- CONFIGURATION ---
RANDOM_SEED = 42
SYNTHETIC_SAMPLES = 150000 
np.random.seed(RANDOM_SEED)

# --- WEIGHTS (Same as Spreadsheet) ---
H_W = {'a1': [0.224, 0.185, 0.364, 0.227], 'a2': [0.657, 0.343], 'a3': [0.087, 0.211, 0.175, 0.269, 0.14, 0.118]}
E_W = {'b1': [0.159, 0.168, 0.344, 0.329], 'b2': [0.401, 0.125, 0.093, 0.158, 0.223], 'b3': [0.378, 0.217, 0.133, 0.272], 'b4': [0.244, 0.361, 0.115, 0.28]}
V_W = {'c1': [0.092, 0.053, 0.057, 0.063, 0.031, 0.098, 0.051, 0.082, 0.146, 0.113, 0.102, 0.069], 'c2': [0.158, 0.147, 0.213, 0.124, 0.133, 0.225], 'c3': [0.344, 0.424, 0.232], 'c4': [0.632, 0.368]}

def compute_manual_index(r):
    a1 = sum(r[f'a1_{i}'] * H_W['a1'][i] for i in range(4))
    a2 = sum(r[f'a2_{i}'] * H_W['a2'][i] for i in range(2))
    a3 = sum(r[f'a3_{i}'] * H_W['a3'][i] for i in range(6))
    H = np.mean([a1, a2, a3])
    b1 = sum(r[f'b1_{i}'] * E_W['b1'][i] for i in range(4))
    b2 = sum(r[f'b2_{i}'] * E_W['b2'][i] for i in range(5))
    b3 = sum(r[f'b3_{i}'] * E_W['b3'][i] for i in range(4))
    b4 = sum(r[f'b4_{i}'] * E_W['b4'][i] for i in range(4))
    E = np.mean([b1, b2, b3, b4])
    c1 = sum(r[f'c1_{i}'] * V_W['c1'][i] for i in range(12))
    c2 = sum(r[f'c2_{i}'] * V_W['c2'][i] for i in range(6))
    c3 = sum(r[f'c3_{i}'] * V_W['c3'][i] for i in range(3))
    c4 = sum(r[f'c4_{i}'] * V_W['c4'][i] for i in range(2))
    V = np.mean([c1, c2, c3, c4])
    return (H * E * V / 27) * 10

def get_risk_label(idx):
    if idx <= 3.58: return 0 # LOW
    if idx <= 6.79: return 1 # MODERATE
    return 2 # HIGH

def generate_data(n):
    target_per_class = n // 3
    rows = []
    counts = {0: 0, 1: 0, 2: 0}
    
    print(f"🎯 Generating balanced dataset ({target_per_class} per class)...")
    
    while len(rows) < n:
        r = {}
        # Adaptive sampling: If we need more HIGH risk, we push the random range higher
        if counts[2] < target_per_class:
            low, high = 2, 3
        elif counts[1] < target_per_class:
            low, high = 1, 3
        else:
            low, high = 1, 2
            
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
        
        idx = compute_manual_index(r)
        label = get_risk_label(idx)
        
        if counts[label] < target_per_class:
            r['risk_index'] = idx
            r['risk_label'] = label
            rows.append(r)
            counts[label] += 1
            
    return pd.DataFrame(rows)

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

# COMPARISON WITH OTHER MODELS
print("\n--- MODEL COMPARISON ---")
lr = LinearRegression().fit(X_train_scaled, y_idx_train)
lr_preds = lr.predict(X_test_scaled)
print(f"Linear Regression R2: {r2_score(y_idx_test, lr_preds):.4f}")

rf = RandomForestRegressor(n_estimators=100, random_state=RANDOM_SEED, n_jobs=-1).fit(X_train_scaled, y_idx_train)
rf_preds = rf.predict(X_test_scaled)
print(f"Random Forest R2: {r2_score(y_idx_test, rf_preds):.4f}")

# Visualizations
os.makedirs('ml/figures', exist_ok=True)

# 1. Confusion Matrix
plt.figure(figsize=(8, 6))
cm = confusion_matrix(y_lbl_test, lbl_preds)
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['LOW', 'MOD', 'HIGH'], yticklabels=['LOW', 'MOD', 'HIGH'])
plt.title(f'XGBoost Risk Category Confusion Matrix (Acc: {acc:.2%})')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.savefig('ml/figures/confusion_matrix.png')
plt.close()

# 2. Feature Importance
plt.figure(figsize=(12, 8))
feat_importances = pd.Series(reg.feature_importances_, index=X.columns)
feat_importances.nlargest(20).plot(kind='barh')
plt.title('Top 20 Features (XGBoost Importance)')
plt.xlabel('Relative Importance')
plt.tight_layout()
plt.savefig('ml/figures/feature_importance.png')
plt.close()

# 3. Accuracy Plot (XGBoost)
plt.figure(figsize=(10, 6))
plt.scatter(y_idx_test, idx_preds, alpha=0.3, color='green')
plt.plot([y_idx.min(), y_idx.max()], [y_idx.min(), y_idx.max()], 'r--', lw=2)
plt.title(f'XGBoost: Predicted vs Actual Risk Index (R2: {r2:.4f})')
plt.xlabel('Actual Index')
plt.ylabel('Predicted Index')
plt.savefig('ml/figures/xgboost_accuracy.png')
plt.close()

# 4. Accuracy Plot (Random Forest)
plt.figure(figsize=(10, 6))
plt.scatter(y_idx_test, rf_preds, alpha=0.3, color='blue')
plt.plot([y_idx.min(), y_idx.max()], [y_idx.min(), y_idx.max()], 'r--', lw=2)
plt.title(f'Random Forest: Predicted vs Actual (R2: {r2_score(y_idx_test, rf_preds):.4f})')
plt.savefig('ml/figures/random_forest_accuracy.png')
plt.close()

# 5. Accuracy Plot (Linear Regression)
plt.figure(figsize=(10, 6))
plt.scatter(y_idx_test, lr_preds, alpha=0.3, color='gray')
plt.plot([y_idx.min(), y_idx.max()], [y_idx.min(), y_idx.max()], 'r--', lw=2)
plt.title(f'Linear Regression: Predicted vs Actual (R2: {r2_score(y_idx_test, lr_preds):.4f})')
plt.savefig('ml/figures/linear_regression_accuracy.png')
plt.close()

# 5. EXPORT
os.makedirs('ml/model_exports', exist_ok=True)
reg.save_model('ml/model_exports/best_model.json') # Regressor
clf.save_model('ml/model_exports/classifier_model.json') # Classifier
pickle.dump(scaler, open('ml/model_exports/scaler.pkl', 'wb'))
le = LabelEncoder().fit(['LOW RISK', 'MODERATE RISK', 'HIGH RISK'])
pickle.dump(le, open('ml/model_exports/label_encoder.pkl', 'wb'))

print(f'\n✅ Dual-Model Training Complete.')
print(f'✅ Artifacts saved: best_model.json (Index) and classifier_model.json (Category)')
