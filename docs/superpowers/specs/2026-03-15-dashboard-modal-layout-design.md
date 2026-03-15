# Brainstorming: Dashboard Risk Summary Modal Layout Update

## 1. Context & Goal
The user feels the current layout of the "Detail Modal" (the `BuildingModal` in `src/app/dashboard/Dashboard.tsx`) is unbalanced and wants to improve it.
We've agreed to try a "Tabbed" approach to break the content up and make it less cluttered.

## 2. Approach: Tabbed Modal

We will restructure the `BuildingModal` component to use simple inline tabs.

### State
We'll introduce a new state variable inside the modal:
```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'ai' | 'actions'>('overview');
```

### Layout Structure
1. **Header (Persistent):** The `Modal` title remains the building name.
2. **Quick Info Bar (Persistent):** Just below the header, we'll keep a compact version of the address and the 4 key stats (Code, Year Built, Floors, Use) visible across all tabs so context is never lost.
3. **Tab Navigation:** A row of simple, stylized buttons to switch views.
   - `Overview` (Risk Score & Breakdown)
   - `AI Analysis` (Narrative)
   - `Action Plan` (Recommended Actions)
4. **Tab Content Area:**
   - **Overview Tab:** The large Risk Score card, alongside the Hazard/Vulnerability/Exposure breakdown.
   - **AI Analysis Tab:** The AI narrative block, given more breathing room.
   - **Action Plan Tab:** The list of recommended courses of action.
5. **Footer (Persistent):** The existing buttons (Close, Edit Assessment, View Full Summary).

## 3. Implementation Details

- Add `useState` to `BuildingModal`.
- Create a simple tab navigation UI using Tailwind classes (e.g., flex row, borders, active state styling using existing variables like `--ink` and `--border`).
- Move the existing layout blocks into conditionally rendered blocks based on `activeTab`.
- Ensure the quick info grid and address are integrated cleanly at the top so they don't consume too much vertical space.

## 4. User Validation
The user has requested to try this "Tabbed" approach first. If they don't like it, we can pivot to the Top-to-Bottom Story approach later.
