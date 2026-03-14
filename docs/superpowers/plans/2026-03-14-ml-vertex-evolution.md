# HAVEN-RVS: Machine Learning Evolution & Vertex AI Integration Plan

This document outlines the strategic roadmap for evolving the HAVEN-RVS Machine Learning engine from its current synthetic-data baseline to a production-grade, continuously learning system utilizing **Google Cloud Vertex AI**.

---

## 1. Current State: The Synthetic Baseline

Currently, the HAVEN-RVS ML system is trained via `ml/sync_train.py` using **150,000 synthetic data points**. 

**Why we did this:**
Because we lack a massive database of *real* historical building assessments, we used the engineering mathematical formula to generate a perfectly balanced synthetic dataset. We then trained an XGBoost model to "reverse-engineer" the formula. 
*   **Result:** The model acts as a highly optimized, non-linear function approximator with an **R² of 0.9991**. It proves the architecture works flawlessly.

**The Limitation:**
The model currently only knows what the mathematical formula tells it. It doesn't yet know about real-world nuances (e.g., how specific weather patterns in a specific province uniquely degrade timber over time).

---

## 2. The Next Step: Integrating Real-World Data

To improve the model beyond the mathematical formula, we must introduce empirical data collected by engineers in the field.

### Data Strategy:
1.  **Collection:** Engineers use the HAVEN-RVS web app to submit real building assessments into Supabase.
2.  **Ground Truth Labeling:** Expert engineers review a subset of these assessments and assign a "True Risk Score" based on their professional judgment, regardless of what the standard mathematical formula outputted.
3.  **Hybrid Training:** We will merge the synthetic data (to maintain structural baseline knowledge) with the real-world expert-labeled data (to teach the model real-world nuance).

---

## 3. The Ultimate Goal: Google Cloud Vertex AI

Managing a hybrid dataset and continuously retraining an XGBoost model on a local machine (`sync_train.py`) is not scalable. To achieve true MLOps (Machine Learning Operations), we will migrate the training and deployment pipeline to **Vertex AI**.

### Why Vertex AI?
1.  **AutoML & Hyperparameter Tuning:** Vertex AI can automatically test thousands of XGBoost configurations (depth, learning rate, regularizations) to squeeze out the final percentage points of accuracy, something that is incredibly tedious to do manually.
2.  **Continuous Training (CT):** We can set up a pipeline where every time 500 new real building assessments are added to Supabase, Vertex AI automatically triggers a new training job, evaluates the new model against the old one, and deploys the winner.
3.  **Managed Endpoints:** Instead of running the model inside our own FastAPI Cloud Run container (`ml/main.py`), we can host the XGBoost `.json` files directly on a Vertex AI Endpoint. This provides out-of-the-box scaling, versioning, and latency monitoring.
4.  **Feature Store:** Vertex AI allows us to store and reuse calculated features (like the `c1`, `c2`, `b3` mathematical groupings) efficiently.

### Implementation Roadmap for Vertex AI

**Phase 1: Pipeline Setup (The Bridge)**
*   Create a Google Cloud Storage (GCS) bucket.
*   Write a script that automatically exports the joined Supabase data (Buildings + Hazard + Vuln + Exposure) to this GCS bucket weekly.

**Phase 2: Vertex Training Migration**
*   Adapt `sync_train.py` to become a Vertex AI Custom Training Job.
*   Instead of saving `best_model.json` to the local `ml/model_exports/` folder, the training job will save the artifacts directly to the GCS bucket.
*   Implement Vertex AI Hyperparameter Tuning to automatically optimize the `max_depth` and `learning_rate` based on the newly introduced real-world data.

**Phase 3: Vertex Endpoint Deployment**
*   Create a Vertex AI Model resource pointing to the GCS bucket artifacts.
*   Deploy the Model to a Vertex AI Endpoint.
*   **Code Change:** Update the Next.js API route (`src/app/api/predict/route.ts`). Instead of calling our custom FastAPI server (`http://localhost:8000/predict`), it will securely authenticate and send the JSON payload directly to the Google Cloud Vertex AI Endpoint URL.

**Phase 4: Deprecating the Custom FastAPI Server**
*   Once the Vertex AI Endpoint is stable and handling predictions, the custom `ml/main.py` FastAPI server and its associated Cloud Run deployment can be safely retired, significantly reducing infrastructure complexity and maintenance overhead.