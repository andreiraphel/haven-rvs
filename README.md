# HAVEN-RVS
## Heritage And Ancestral Houses Visual Evaluation Network — Rapid Visual Screening

A specialized Rapid Visual Screening tool for heritage and ancestral houses of the Philippines. Determines the **Risk Index** (0–10), **Risk Description**, and provides an AI-generated **Course of Action** for each evaluated structure.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend API | Next.js API Routes (+ FastAPI for ML inference later) |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| AI | Google Gemini API |
| ML | Python, scikit-learn, Jupyter Notebook |
| Deployment | Vercel (frontend), Render (FastAPI) |

---

## Quick Start

### 1. Install dependencies

```bash
cd haven-rvs
npm install
```

### 2. Configure environment variables

Copy `.env.local` (already created) and fill in your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
```

> **No keys yet?** The app runs fine in demo mode — just click **[DEV] Skip auth** on the login page. All 6 sample buildings from the research dataset are pre-loaded.

### 3. Initialize Supabase database

1. Go to your Supabase project → SQL Editor
2. Paste and run the contents of `supabase/schema.sql`
3. Done — tables, RLS policies, and triggers are created

### 4. Run the development server

```bash
npm run dev
```

Visit **http://localhost:3000** → redirects to `/login`

---

## Pages

| Route | Description |
|---|---|
| `/login` | Auth entry point with hero panel |
| `/register` | New evaluator registration |
| `/dashboard` | Stats cards + recent evaluations table |
| `/questionnaire` | 4-step assessment form (Building → Hazard → Vulnerability → Result) |
| `/risk-summary` | Sortable risk table with export to Excel & PDF |
| `/map` | Map view with risk-level filter buttons |
| `/about` | Research background, team, tech stack |
| `/contact` | Contact form + email addresses |

---

## Machine Learning

The ML pipeline lives in `/ml/`:

```
ml/
  haven_rvs_ml.ipynb         ← Main notebook
  FOR_MACHINE_LEARNING_1_.xlsx  ← Real dataset (100 buildings, Bohol)
  requirements.txt
```

### Running the notebook

```bash
cd ml
pip install -r requirements.txt
jupyter notebook haven_rvs_ml.ipynb
```

The notebook:
1. Loads 100 real heritage buildings from Excel
2. Generates ~5,000 synthetic samples
3. Trains Linear Regression, Random Forest, Gradient Boosting
4. Evaluates with RMSE, MAE, R²
5. Exports `haven_rvs_model.pkl` + `haven_rvs_scaler.pkl` for FastAPI

---

## Risk Index Formula

```
Risk Index = (Hazard Rating + Vulnerability Rating + Exposure Rating) / MAX × 10

LOW RISK:      Risk Index ≤ 3.58
MODERATE RISK: 3.58 < Risk Index ≤ 6.79
HIGH RISK:     Risk Index > 6.79
```

**Hazard Rating** = PEIS + Fault Distance + Seismic Mw + Liquefaction + Wind Speed + Terrain + Slope + Elevation + Water Distance

**Vulnerability Rating** = Plan Irregularity + Vertical Irregularity + Proximity + Material + Enclosure + Roof + Condition scores

**Exposure Rating** = Stories + Base Height + Drainage

---

## Deployment

### Frontend (Vercel)
```bash
# Connect repo to Vercel, add env vars in dashboard
vercel --prod
```

### FastAPI ML Backend (Render)
> Future: expose `/predict` endpoint using exported model. Connect via `NEXT_PUBLIC_ML_API_URL`.

---

## Folder Structure

```
haven-rvs/
├── src/
│   ├── app/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── questionnaire/page.tsx
│   │   ├── risk-summary/page.tsx
│   │   ├── map/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── api/
│   │   │   ├── buildings/route.ts
│   │   │   └── gemini/route.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/Topbar.tsx
│   │   └── ui/
│   │       ├── Modal.tsx
│   │       ├── RiskBadge.tsx
│   │       └── StatCard.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── risk-calculator.ts
│   │   ├── mock-data.ts
│   │   └── export.ts
│   └── types/index.ts
├── ml/
│   ├── haven_rvs_ml.ipynb
│   ├── FOR_MACHINE_LEARNING_1_.xlsx
│   └── requirements.txt
├── supabase/
│   └── schema.sql
├── .env.local
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## Research

**Author:** Engr. Joshua M. Gumia  
**Institution:** Universiti Teknologi PETRONAS, Perak, Malaysia  
**Supervisor:** AP IR Dr. Bashar S. Mohammed  

**Contact:** gumiajoshua@gmail.com | haven-rvs@gmail.com
