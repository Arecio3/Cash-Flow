# Cash Flow - Personal Budget Dashboard Patch

This patch adds advanced features, a mobile-first responsive design, and robust real-time database synchronization to the Budgeting App.

## Features Implemented

1. **Mobile Responsiveness Overhaul**
   - **Mobile-First CSS**: Built with a base width of `375px` scaling dynamically to tablets and desktop.
   - **Bottom Navigation Bar**: Mobile tab layout (5 tabs max: Dashboard, Cards, Bills, Investments, Statement Parser) with Lucide icons, even spacing, and an active indicator line on top.
   - **Optimized Padding**: Cards have a minimum `16px` padding on mobile and do not touch screen edges.
   - **2x2 Metrics Grid**: Summary metrics stack neatly in a 2x2 grid on mobile viewports.
   - **Adaptive Waterfall Chart**: Automatically simplifies to a 2-bar chart (Income vs Expenses) on mobile screens under `480px`, retaining the full 6-stage waterfall on desktop.
   - **Touch Targets**: Standardized buttons and controls to a minimum `44x44px` bound with `touch-action: manipulation`.

2. **Top Summary Cash Flow Bar**
   - Displays real-time calculations for **Income**, **Expenses**, and **Net Cash Flow** for the active month.
   - Floating/locked at the top of the viewport for persistent visibility.
   - Controls to navigate to previous or next months, featuring a warning indicator when viewing past data.
   - Expandable category dropdown breakdown showing exact category-wise debits and credits.

3. **Real-time Device Sync Indicator**
   - Integrates Postgres Changes via Supabase channels (`supabase.channel().on(...)`) on all major collections.
   - Displays a floating sync indicator dot showing **Live** (green) or **Reconnecting** (yellow/gray) statuses, responding dynamically to connection/network changes.
   - Implements optimistic updates on local state before writing to the DB for instant UI responsiveness.

4. **Credit Card Custom Notes & Direct Editing**
   - Added a collapsible custom notes field (`notes` TEXT column) to each credit card card.
   - Added inline editing activation to edit limits, apr, balance, statements, and notes.

5. **Multi-Format Statement Parser (PDF, CSV, OFX/QFX)**
   - **CSV Statement Import**: Automates parsing, handles custom column assignments if auto-mapping fails, and routes entries.
   - **OFX/QFX Import**: Parses bank standard XML files.
   - **PDF Statement Parsing**: Extracts statement text via `pdfjs-dist` and leverages the Claude Messages API (`claude-sonnet-4-20250514`) to parse transactions accurately.
   - **Duplicate Detection**: Flags transactions matching existing database records by date, description, and amount with warning indicators.
   - **Linked Routing**: Enables assigning individual or bulk transactions to specific credit cards or cash accounts directly before confirming imports.

---

## Technical Setup & Replication

### 1. Database Migrations

Run the following DDL script inside the Supabase SQL editor to add the new credit card notes column:

```sql
-- Add notes column to credit_cards table
ALTER TABLE credit_cards ADD COLUMN notes TEXT;
```

### 2. Environment Configuration

Ensure your `.env.local` file contains the required credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ANTHROPIC_API_KEY=your-anthropic-key
```

*Note: The Anthropic API Key is required specifically for parsing PDF statements.*

### 3. Installation

Install dependencies (including `pdfjs-dist` and `date-fns` added in this patch):

```bash
npm install
```

### 4. Running Locally

Start the Vite development server:

```bash
npm run dev
```

### 5. Running the Linter & Production Build

Ensure quality checks pass:

```bash
# Run ESLint validation
npm run lint

# Compile production bundles
npm run build
```
