# Project Context: GCV & Quantity Manager

## Project Overview

A specialized Excel-like spreadsheet application for managing **GCV (Gross Calorific Value)** and **Quantity** across **30 sets** of coal/energy lots. This is a domain-specific tool for energy/coal trading or inventory management.

## User Requirements (Original Request)

> "Excel sheet containing thirty set, with two data each (GCV, Quantity). The GCV and quantity of the one set varies with addition of another lot with different GCV value. while GCV remain same, quantity decrese for another set, with substraction of quantity from that set. The addition, substraction of quantity and GCV of new lots are variable."

### Key Business Logic

1. **30 Sets Structure**: Organized as Pile-1 to Pile-6, each containing 5 sub-labels (A-E)
2. **GCV Calculation**: When adding a lot with different GCV to an existing set, use **weighted average**:
   ```
   New GCV = (Current GCV × Current Qty + New GCV × New Qty) / Total Qty
   ```
3. **Quantity Subtraction**: When subtracting quantity, GCV remains unchanged
4. **Variable Operations**: Both GCV and Quantity values are user-defined inputs

## Current Implementation Status

### Completed Features
- ✅ 30-set spreadsheet table with all columns
- ✅ Add new lot to empty entries
- ✅ Add lot to existing entry (weighted GCV calculation)
- ✅ Subtract quantity from selected entry
- ✅ Visual pile/sub-label color coding (6 piles × 5 sub-labels)
- ✅ Summary cards (active sets, total quantity, weighted avg GCV, total energy)
- ✅ Pile-wise summary with sub-label breakdown
- ✅ Date history panel with calendar view
- ✅ Local storage persistence

### Architecture Decisions
- **Frontend Only**: Currently uses localStorage for persistence
- **Planned Backend**: Supabase for database, Vercel for deployment
- **UI Framework**: Shadcn UI components (Button, Input, Label)
- **Styling**: Tailwind CSS v4 with semantic color names
- **Date Handling**: date-fns library

## File Structure
