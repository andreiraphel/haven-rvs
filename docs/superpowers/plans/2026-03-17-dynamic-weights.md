# Dynamic Weights Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dynamic weight configuration system allowing users to adjust risk calculation coefficients via the UI, persisted in the database.

**Architecture:**
- **Database:** New `risk_weights` table storing coefficients as JSON.
- **Backend:** Next.js API route (`/api/weights`) to GET/PUT weights.
- **Logic:** Refactored `risk-calculator.ts` to use injected weights with fallback to defaults.
- **Frontend:**
  - `Weights.tsx`: Form to edit and save weights.
  - `Questionnaire.tsx`: Fetch weights and pass to calculator.

**Tech Stack:** Next.js, Supabase, TypeScript.

---

## Chunk 1: Database & API

### Task 1: Update Schema
**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Add `profiles` and `risk_weights` tables**
  - Add `risk_weights` table with `weights` jsonb column.
  - Add seed data for default weights matching `risk-calculator.ts`.
  - Include `profiles` table and triggers (ensuring completeness).

### Task 2: Create Weights API
**Files:**
- Create: `src/app/api/weights/route.ts`

- [ ] **Step 1: Implement GET/POST**
  - GET: Fetch latest weights from `risk_weights` (order by created_at desc limit 1).
  - POST: Insert new weights row.

## Chunk 2: Calculator Logic

### Task 3: Refactor Calculator
**Files:**
- Modify: `src/lib/risk-calculator.ts`

- [ ] **Step 1: Extract Default Weights**
  - Define `DEFAULT_WEIGHTS` constant object.
  - Export `RiskWeights` type.

- [ ] **Step 2: Update Function Signature**
  - Update `calculateAssessmentRisk` to accept optional `weights: RiskWeights`.
  - Use `weights ?? DEFAULT_WEIGHTS`.

## Chunk 3: Frontend Implementation

### Task 4: Implement Weights Editor
**Files:**
- Modify: `src/app/weights/Weights.tsx`

- [ ] **Step 1: Implement Editor**
  - Fetch weights on mount.
  - Render inputs for all coefficients (grouped by Hazard, Exposure, Vulnerability).
  - Implement Save handler (POST to API).

### Task 5: Integrate Questionnaire
**Files:**
- Modify: `src/app/questionnaire/Questionnaire.tsx`

- [ ] **Step 1: Fetch and Pass Weights**
  - Fetch weights on mount.
  - Pass retrieved weights to `calculateAssessmentRisk`.
