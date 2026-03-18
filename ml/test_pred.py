import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.dirname(__file__))
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env.local'))

import main
import sync_train
import numpy as np

main.load_artifacts()
weights = main.get_active_weights()

# Test Case 1: Partial Data (Relying on defaults)
h = {"earthquake_intensity": "VIII"} 
v = {"building_code": "Pre-Code (before 1972)", "number_of_stories": 3} 
e = {}
yb = 1950

feats = main.encode_inputs(h, v, e, yb, False)
X_scaled = main.scaler.transform([feats])
ml_pred = main.model_idx.predict(X_scaled)[0]
math_idx, _ = sync_train.compute_label(feats)

print("--- Test Case 1 (Partial Data) ---")
print(f"Mathematical Ground Truth: {math_idx:.6f}")
print(f"ML Model Prediction      : {ml_pred:.6f}")
print(f"Difference               : {abs(math_idx - ml_pred):.6f}")

# Test Case 2: Full Data 
h2 = {
    "earthquake_intensity": "V", "fault_distance_km": 12, "seismic_source_type": 6.0,
    "potential_liquefaction": "Highly Susceptible", "basic_wind_speed_kph": 300,
    "terrain": "Flat Terrain", "slope_degrees": 45, "elevation_m": 2, 
    "distance_to_water_m": 100, "surface_runoff": ["Concrete", "Asphalt"], 
    "base_height": "Base is lower", "drainage_system": "No Drainage System"
}
v2 = {
    "building_code": "New Code (1992-present)", "number_of_stories": 5, "number_of_bays": 2,
    "column_spacing_m": 4.5, "structural_material": "Reinforced Concrete", 
    "structural_framing_type": "Shearwall", "plan_irregularity": "L-shaped",
    "vertical_irregularity": "1 Vertical Irregularity", "building_proximity": "below 6 inches",
    "building_enclosure": "Open", "wall_material": "Glass", "flooring_material": "Hardwood",
    "maximum_crack": "2 mm", "uneven_settlement": True, "beam_column_deformations": False,
    "finishing_condition": True, "decay_of_structural_member": False, "additional_loads": True,
    "roof_design": "Monoslope", "roof_slope": "below 30 degrees", "roofing_material": "Wood",
    "roof_fastener": "Staples", "roof_fastener_distance_mm": 500
}
e2 = {
    "b11": 3, "b12": 3, "b13": 3, "b14": 3,
    "b22": 3, "b23": 3, "b24": 3, "b25": 3,
    "b31": 3, "b32": 3, "b33": 3, "b34": 3,
    "b41": 3, "b42": 3, "b43": 3, "b44": 3
}

feats2 = main.encode_inputs(h2, v2, e2, 1900, False)
X_scaled2 = main.scaler.transform([feats2])
ml_pred2 = main.model_idx.predict(X_scaled2)[0]
math_idx2, _ = sync_train.compute_label(feats2)

print("\n--- Test Case 2 (Full High-Risk Data) ---")
print(f"Mathematical Ground Truth: {math_idx2:.6f}")
print(f"ML Model Prediction      : {ml_pred2:.6f}")
print(f"Difference               : {abs(math_idx2 - ml_pred2):.6f}")

