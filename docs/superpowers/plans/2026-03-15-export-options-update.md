# Export Options Update Plan

## Goal
Improve the Export functionality on the Risk Summary page by consolidating it into a single button that opens an Export Options Modal, allowing users to pick format (PDF/Excel) and select specific assessments. Also, fix missing columns and bad layout in the exported PDF and Excel files.

## Scope
1. **`src/app/risk-summary/RiskSummary.tsx`**
   - Add state for the Export Modal (`isExportModalOpen`).
   - Add state for selected assessments to export (e.g. `selectedForExport: Set<string>`).
   - Add state for selected format (`exportFormat: 'excel' | 'pdf'`).
   - Replace the two export buttons with a single "Export Options" button.
   - Create an `ExportModal` component inside the file.
   - The modal should have:
     - A toggle/radio group for Excel vs PDF.
     - A list of all assessments with checkboxes to select which ones to export (plus a "Select All" option).
     - A "Download" button to trigger the export using the selected format and data.

2. **`src/lib/export.ts`**
   - **Excel:** Ensure the layout is clean, text wraps properly, and all columns have appropriate widths. Make sure all necessary columns are there.
   - **PDF:** The PDF currently only shows Name, Code, Town, Index, Manual, Level, Hazard, Vuln, and Exp. I will add year, type, and AI fields. Because PDF width is constrained (even in landscape), we might need to adjust the autoTable config or omit very verbose AI text (or put it on a new line). I'll try to add Type, Year, and structural info (Material, Stories) without breaking the table.

## Steps
1. Modify `src/lib/export.ts` to improve PDF columns and Excel layout.
2. Modify `src/app/risk-summary/RiskSummary.tsx` to add the ExportModal and its states.
3. Test locally.