# Dashboard Modal Tabbed Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the existing Dashboard BuildingModal to use a clean, tabbed interface for better data organization and readability.

**Architecture:** We will introduce local state (`activeTab`) to `BuildingModal` and conditionally render the main content sections based on the selected tab. The header, quick info, and footer will remain persistent.

**Tech Stack:** React (Next.js App Router), Tailwind CSS, Lucide Icons

---

### Task 1: Add State and Tab Navigation UI

**Files:**
- Modify: `src/app/dashboard/Dashboard.tsx`

- [ ] **Step 1: Import `useState` and add state to `BuildingModal`**
  Add `useState` from React to the top of the file if not already present.
  Inside `BuildingModal`, add `const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'actions'>('overview');`

- [ ] **Step 2: Add Tab Navigation UI**
  Directly below the Quick Info Grid, add a tab navigation bar.
  ```tsx
  <div className="flex border-b border-[var(--border)] mb-6">
    {(['overview', 'ai', 'actions'] as const).map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          activeTab === tab
            ? 'border-ink text-ink'
            : 'border-transparent text-[var(--ink-lt)] hover:text-ink hover:border-[var(--border)]'
        }`}
      >
        {tab === 'overview' ? 'Overview' : tab === 'ai' ? 'AI Analysis' : 'Action Plan'}
      </button>
    ))}
  </div>
  ```

### Task 2: Implement Tab Content Rendering

**Files:**
- Modify: `src/app/dashboard/Dashboard.tsx`

- [ ] **Step 1: Wrap existing content in conditional blocks**
  Restructure the layout below the new tab bar to only show the relevant section based on `activeTab`.

  ```tsx
  <div className="min-h-[300px]"> {/* Ensure consistent height */}
    {activeTab === 'overview' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Risk Score Card (Left Side originally) */}
        <div className={`rounded-xl border p-6 flex flex-col items-center text-center h-full justify-center ${riskCls}`}>
          {/* ... existing risk score content ... */}
        </div>
        {/* Placeholder for future overview content or stretch the risk score */}
      </div>
    )}

    {activeTab === 'ai' && (
      <div className="space-y-6 mb-8">
        {/* AI Narrative Block */}
        {a.result.narrative ? (
           {/* ... existing AI narrative content ... */}
        ) : (
           {/* ... existing empty AI state ... */}
        )}
      </div>
    )}

    {activeTab === 'actions' && (
      <div className="space-y-6 mb-8">
        {/* Course of Action Block */}
        {coa.length > 0 ? (
          <div>
            <div className="label-sm mb-3">🛠 Recommended Actions</div>
            <div className="grid grid-cols-1 gap-2">
              {/* ... existing COA list ... */}
            </div>
          </div>
        ) : (
          <div className="card p-5 bg-sand text-center text-[var(--ink-lt)] text-xs italic">
            No recommended actions available.
          </div>
        )}
      </div>
    )}
  </div>
  ```

- [ ] **Step 2: Relocate the Address Block**
  Move the address block (`<div className="bg-sand p-4 rounded-lg border border-[var(--border)] text-center">...</div>`) to be either inside the "Overview" tab, or keep it persistent at the bottom just above the footer. A persistent location above the footer is recommended for consistent context.

### Task 3: Verify and Commit

- [ ] **Step 1: Build the project to verify no syntax errors**
  Run: `npm run build` or `npm run dev` and test the UI manually if possible.

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git add src/app/dashboard/Dashboard.tsx
  git commit -m "feat: implement tabbed layout for dashboard building modal"
  ```