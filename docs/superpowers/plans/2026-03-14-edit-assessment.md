# Edit Risk Assessment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to seamlessly edit and re-evaluate existing building assessments directly from the Risk Summary page.

**Architecture:** We will leverage URL query parameters (`?editId=`) to pass the target building ID to the `QuestionnairePage`. The `QuestionnairePage` will fetch the existing structural assessment records (Hazard, Vulnerability, Exposure, Building) and pre-populate the local React state. The submit function will dynamically switch from an `INSERT` operation to an `UPDATE` operation when in edit mode.

**Tech Stack:** Next.js 14 (App Router), React, Supabase, TypeScript

---

### Task 1: Update Risk Summary Detail Modal

**Files:**
- Modify: `src/app/risk-summary/RiskSummary.tsx`

- [ ] **Step 1: Update `DetailModal` to accept a router reference and include the Edit button**
  Add a button to the `footer` of the `Modal` that pushes the user to `/questionnaire?editId={a.building.id}`.
  
- [ ] **Step 2: Commit**
  Run: `git add src/app/risk-summary/RiskSummary.tsx`
  Run: `git commit -m "feat: add edit assessment button to risk summary modal"`

### Task 2: Implement Edit Mode State Population in Questionnaire

**Files:**
- Modify: `src/app/questionnaire/page.tsx` (To wrap the component in `Suspense` for `useSearchParams`)
- Modify: `src/app/questionnaire/Questionnaire.tsx`

- [ ] **Step 1: Wrap `QuestionnairePage` in a `Suspense` boundary in `page.tsx`**
  Since `Questionnaire.tsx` will use `useSearchParams`, Next.js requires it to be wrapped in a `Suspense` boundary.

- [ ] **Step 2: Read `editId` parameter in `Questionnaire.tsx`**
  Import `useSearchParams` and extract the `editId`. Create a boolean `isEditing` flag. Add an empty `[buildingId, setBuildingId] = useState<string|null>(null)` to track the record being updated.

- [ ] **Step 3: Fetch existing data on mount if `editId` is present**
  Add a `useEffect` hook to fetch `buildings`, `hazard_indicators`, `vulnerability_indicators`, and `exposure_indicators` where `building_id === editId`. Then populate `building`, `hazard`, `vuln`, and `exposure` state objects with the retrieved data. Set the `buildingId` state. Ensure `numInputs` is also populated so numeric inputs show correctly.

- [ ] **Step 4: Commit**
  Run: `git add src/app/questionnaire/page.tsx src/app/questionnaire/Questionnaire.tsx`
  Run: `git commit -m "feat: support loading existing assessment data into questionnaire state"`

### Task 3: Implement Update Logic in Questionnaire Submission

**Files:**
- Modify: `src/app/questionnaire/Questionnaire.tsx`
- Modify: `src/app/api/buildings/route.ts`

- [ ] **Step 1: Update `/api/buildings` route to support PUT**
  The current endpoint only supports POST. Add a `PUT` handler to update a building based on the provided `id`.

- [ ] **Step 2: Refactor `computeAndShow` to handle Upsert/Update**
  If `isEditing` is true, perform a `PUT` request to `/api/buildings` instead of `POST`.
  Instead of `.insert()` for the indicators, use `.update().eq('building_id', buildingId)`.
  Update the `questionnaire_responses` and `risk_results` in the same manner.

- [ ] **Step 3: Test and build**
  Run: `npm run build` to ensure no TypeScript regressions.

- [ ] **Step 4: Commit**
  Run: `git add src/app/questionnaire/Questionnaire.tsx src/app/api/buildings/route.ts`
  Run: `git commit -m "feat: handle assessment updates during form submission"`
