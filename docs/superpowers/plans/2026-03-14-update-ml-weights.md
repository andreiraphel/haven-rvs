# HAVEN-RVS: Plan for Updating Machine Learning Weights

This document outlines the exact procedure to follow when the temporary structural weights are replaced with the final, real weights. 

## The Challenge: Synchronization
The application is designed for "Dual-Engine" synchronization. This means the instantaneous calculation in the UI must perfectly match the manual fallback calculation in the Python API, which must both perfectly match the trained ML model predictions. 

If you update weights in one place and not the others, the system will output conflicting risk scores.

## Step-by-Step Update Procedure

### Phase 1: Update the Python Training Script (`ml/sync_train.py`)
1. Open `ml/sync_train.py`.
2. Locate the `WEIGHTS` configuration around line 15:
   ```python
   # --- WEIGHTS (Same as Spreadsheet) ---
   H_W = {'a1': [0.224, 0.185, 0.364, 0.227], 'a2': [0.657, 0.343], 'a3': [0.087, 0.211, 0.175, 0.269, 0.14, 0.118]}
   E_W = {'b1': [0.159, 0.168, 0.344, 0.329], 'b2': [0.401, 0.125, 0.093, 0.158, 0.223], 'b3': [0.378, 0.217, 0.133, 0.272], 'b4': [0.244, 0.361, 0.115, 0.28]}
   V_W = {'c1': [0.092, 0.053, 0.057, 0.063, 0.031, 0.098, 0.051, 0.082, 0.146, 0.113, 0.102, 0.069], 'c2': [0.158, 0.147, 0.213, 0.124, 0.133, 0.225], 'c3': [0.344, 0.424, 0.232], 'c4': [0.632, 0.368]}
   ```
3. Update these lists with the new decimal weights provided by your engineers. Note: Ensure the arrays map exactly to the number of options for that indicator section.

### Phase 2: Retrain the ML Models
1. Open a terminal and navigate to the `ml/` directory.
2. Run the training script:
   ```bash
   python sync_train.py
   ```
3. This script will automatically:
   - Generate 150,000 new synthetic data points using your *new* weights.
   - Retrain both XGBoost models.
   - Overwrite the 4 artifacts in `ml/model_exports/`.
   - Generate new feature importance graphs in `ml/figures/`.

### Phase 3: Update the Python API Fallback (`ml/main.py`)
1. Open `ml/main.py`.
2. Locate the `predict(req: PredictRequest)` function around line 125.
3. Update the hardcoded multiplication weights to match your new weights. 
   *(e.g., change `(get_peis_score(...) * 0.224)` to `(get_peis_score(...) * NEW_WEIGHT)`)*.
4. Ensure the `c1_s` zip array weights at the bottom of the function are also updated.

### Phase 4: Update the Frontend UI Calculator (`src/lib/risk-calculator.ts`)
1. Open `src/lib/risk-calculator.ts`.
2. Locate the `calculateAssessmentRisk` function.
3. Update the exact same mathematical weights here as you did in `ml/main.py`.
   *(e.g., `(PEIS_MAP[h.earthquake_intensity] ?? 1) * 0.224` becomes `... * NEW_WEIGHT`)*.
4. If the new formula changes the threshold boundaries for LOW, MODERATE, and HIGH risk (currently `3.58` and `6.79`), update those thresholds in both `risk-calculator.ts` and `ml/main.py` (`get_risk_label` / `desc` logic).

### Phase 5: Test and Deploy
1. Run the Next.js development server and the FastAPI server.
2. Use the "Fill Test Data" button on the Edit Assessment page.
3. Click "Compute Index" and verify that the "Statistical Risk Index" (ML) perfectly matches the "Manual Verification" score. If they differ by more than `0.01`, a weight was typed incorrectly in one of the files.
4. Commit your code and the new `.json`/`.pkl` files to Git.