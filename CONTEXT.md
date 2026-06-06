# Application Context & Architecture

## Overview
This application is a specialized tracker for the energy/coal sector. It allows users to track Gross Calorific Value (GCV) and Quantity (MT) across 30 storage locations, calculating weighted averages on the fly as new inventory is merged.

## Domain Terminology
* **GCV:** Gross Calorific Value (kcal/kg) - The energy content of the material.
* **Quantity (MT):** Metric Tonnes.
* **Lot:** A specific batch/entry with a defined GCV and Quantity.
* **Pile:** A group of 5 sub-entries (A through E). The 30 sets are divided into 6 Piles.
* **Weighted Average:** The formula used when merging lots: `New GCV = (Current GCV × Current Qty + New GCV × New Qty) / Total Qty`
* **Deduction:** Subtracting quantity. This *never* alters the GCV.

## Project Structure
\`\`\`text
src/
├── App.tsx                 # Main layout, routing, and state management
├── components/
│   ├── ControlPanel.tsx    # Forms for adding/subtracting lots
│   ├── DateHistoryPanel.tsx# Calendar history and snapshot previews
│   ├── PileSummary.tsx     # 6 cards displaying aggregated pile stats
│   ├── SpreadsheetTable.tsx# Main 30-row data grid
│   └── SummaryCards.tsx    # Global statistics dashboard
├── types/
│   └── lot.ts              # Core TypeScript interfaces
└── utils/
    └── lotUtils.ts         # Pure functions for business logic and calculations
\`\`\`

## Visual & Styling Guidelines (Strict)
The 30 sets are organized into 6 Piles. Each Pile uses a strict color theme with progressive shading for its sub-labels (A being the lightest, E being the darkest).

| Pile Number | Assigned Color Theme | Sub-label Shading (A → E) | Sets Covered |
| :--- | :--- | :--- | :--- |
| **Pile 1** | Emerald (Green) | `100` → `200` → `300` → `400` → `500` | Sets 1 - 5 |
| **Pile 2** | Blue | `100` → `200` → `300` → `400` → `500` | Sets 6 - 10 |
| **Pile 3** | Amber (Yellow) | `100` → `200` → `300` → `400` → `500` | Sets 11 - 15 |
| **Pile 4** | Purple | `100` → `200` → `300` → `400` → `500` | Sets 16 - 20 |
| **Pile 5** | Rose (Pink) | `100` → `200` → `300` → `400` → `500` | Sets 21 - 25 |
| **Pile 6** | Teal | `100` → `200` → `300` → `400` → `500` | Sets 26 - 30 |

## Technical Constraints for Code Generation
1.  **TypeScript Only:** No standard `.js` or `.jsx` files.
2.  **Relative Imports:** Use standard relative paths (e.g., `../utils/lotUtils`), do not use `@/` path aliases.
3.  **UI Library:** We are currently using native HTML elements styled with **Tailwind CSS v4**. Do not import external Shadcn UI components unless they have been explicitly initialized in the `src/components/ui` folder.
4.  **No Arbitrary Tailwind:** Stick to standard Tailwind utility classes. Do not generate arbitrary values like `bg-[#123456]`.
5.  **Data Flow:** All GCV and Quantity calculations must be routed through the pure functions inside `lotUtils.ts` to prevent logic duplication.

## Pending Architecture Work
* Initialize `src/lib/supabase.ts` to establish the database client.
* Migrate state management in `App.tsx` from `localStorage` to Supabase REST/Realtime APIs.
* Implement Supabase Auth to restrict app access.