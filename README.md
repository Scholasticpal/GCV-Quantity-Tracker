# GCV & Quantity Tracker

An interactive, Excel-like spreadsheet application for managing coal/energy lots with GCV (Gross Calorific Value) and Quantity tracking across 30 sets.

## Features
* **30-Set Spreadsheet:** Manage 30 distinct lots divided into 6 color-coded "Piles" (Pile 1 to 6), each with sub-categories A through E.
* **Weighted Average GCV Calculation:** Automatically calculates new GCV when adding lots with different energy values.
* **Quantity Subtraction:** Reduces quantity while keeping GCV unchanged.
* **Date History Panel:** Calendar-based snapshot system to save, preview, and load daily data.
* **Pile Summaries:** Aggregated statistics for each pile (Total Quantity, Average GCV).
* **Local Persistence:** Data automatically saves to the browser's `localStorage` (with Supabase backend integration pending).

---

## Local Development Setup

**1. Clone and Install**
\`\`\`bash
git clone <your-repo-url>
cd gcv-manager
npm install
\`\`\`

**2. VS Code Configuration**
Create `.vscode/settings.json`:
\`\`\`json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
\`\`\`

**3. Environment Variables**
Create `.env.local` in the root directory:
\`\`\`text
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

**4. Run Development Server**
\`\`\`bash
npm run dev
\`\`\`
Open `http://localhost:5173` in your browser.

---

## Supabase Backend Integration (Next Steps)

Currently, the app uses `localStorage`. To enable cross-device usage and secure authentication, we will migrate to Supabase.

**1. Database Schema (Run in Supabase SQL Editor)**
\`\`\`sql
-- Create lots table
CREATE TABLE lots (
  id SERIAL PRIMARY KEY,
  gcv NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 0,
  original_gcv NUMERIC NOT NULL DEFAULT 0,
  original_quantity NUMERIC NOT NULL DEFAULT 0,
  lots_added INTEGER NOT NULL DEFAULT 0,
  lots_subtracted INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create saved_states table for historical calendar data
CREATE TABLE saved_states (
  id SERIAL PRIMARY KEY,
  state_date DATE NOT NULL UNIQUE,
  lots_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
\`\`\`

**2. Install Supabase Client**
\`\`\`bash
npm install @supabase/supabase-js
\`\`\`

---

## Vercel Deployment

**1. Deploy via Dashboard**
* Go to Vercel and import your GitHub repository.
* **Framework Preset:** Vite
* **Build Command:** `npm run build`
* **Output Directory:** `dist`

**2. Environment Variables**
Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel Dashboard under Settings > Environment Variables.

**3. Optional `vercel.json`**
Create this in the root to handle client-side routing properly:
\`\`\`json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
\`\`\`