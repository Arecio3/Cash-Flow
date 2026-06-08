# Cash Flow – Personal Finance & Budgeting Dashboard

Cash Flow is a premium, real-time budgeting application built with **React**, **Vite**, **Recharts**, and **Supabase**. It provides users with a comprehensive view of their monthly cashflow, credit card utilization, scheduled bill routings, envelope budgets, and investment timelines, all backed by persistent cloud storage and secure user authentication.

## 🚀 Key Features

* **Real-time Metric Cards**: Visualizes monthly income, expenses, and net cashflow at a glance.
* **Supabase Cloud Syncing & Auth**: Secure login via Email/Password or Google OAuth, ensuring your data is private and scoped strictly to your account.
* **Credit Card Utilization Tracker**: Automatically calculates utilization percentages and estimates rewards, with a recommended payoff timeline (avalanche or snowball).
* **Scheduled Bill Calendar**: Visualizes recurring bills, statement close dates, and which card they route to, with automated due date charging.
* **Waterfall Cashflow Chart**: Recharts visualization illustrating your money's flow: *Income → Bills → Card Payoffs → Free Cash → Investment Goals → Daily Spend Allowance*.
* **Investment Goal Tracker**: Set monthly saving targets, track progress, and calculate projected completion dates dynamically.
* **Spend Envelope Budget**: Computes remaining discretionary allowance and daily spend caps.
* **Local Data Migration**: Detects any existing offline local storage data on login and offers to migrate it seamlessly to the cloud.

---

## 🛠️ Configuration & Setup

### 1. Configure the Environment

Create a `.env.local` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-public-key
```

> [!NOTE]
> `.env.local` is listed in `.gitignore` and will never be committed to Git.

### 2. Set Up Supabase

Follow the instructions in [SUPABASE_SETUP.md](file:///c:/Users/cuba2/.gemini/antigravity-ide/scratch/Cash-Flow/SUPABASE_SETUP.md) to initialize your database schema, Row Level Security (RLS) tables, and configure OAuth settings.

### 3. Local Development

Install dependencies and start the Vite dev server:

```bash
npm install
npm run dev
```

The app will start running on [http://localhost:5173](http://localhost:5173).

---

## 🌐 Deployment to Vercel

If you deploy this application to Vercel, make sure to add your production environment variables in the Vercel Project Settings:

1. Go to your project on Vercel -> **Settings** -> **Environment Variables**.
2. Add:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
3. Deploy the application.

---

## 🧑‍💻 Architecture Details

* **Custom Hooks**: Exposes optimistic states for transactions, bills, credit cards, and investment goals via custom hooks mapping Supabase database structures (`src/hooks/useTransactions.js`, etc.).
* **Migration logic**: Generates unique UUIDs and updates parent-child foreign key linkages during local storage imports (`src/lib/migrate.js`).
* **Design system**: Fully dark-themed custom CSS variables, glassmorphic card overlays, premium custom indicators, and dynamic micro-animations defined in `src/index.css`.

---

## 📱 Progressive Web App (PWA) Support

This application is fully configured as a PWA, enabling offline loading, asset caching, and home-screen installation.

### Local PWA Testing
1. Build the production application bundle:
   ```bash
   npm run build
   ```
2. Launch Vite's local preview server:
   ```bash
   npm run preview
   ```
3. Open the provided URL in Google Chrome.

### Verification
- Open Chrome Developer Tools -> **Application** -> **Manifest**.
- Ensure the name, short name, start URL, theme colors, and icons are loaded successfully.
- Check the **Service Workers** tab to confirm that `sw.js` is registered and active.
- Verify Chrome's PWA installability by clicking the Install icon in the browser address bar.

### Installing on Mobile Devices

#### iOS / iPhone Installation (Safari)
1. Open the app URL in **Safari** on iOS.
2. Tap the **Share** button (the square icon with an arrow pointing up at the bottom menu).
3. Scroll down and select **"Add to Home Screen"**.
4. Confirm the name and tap **Add** in the top right.

#### Android / Chrome Installation
1. Open the app URL in **Google Chrome** on Android.
2. Tap the **Three Dots** menu icon in the top-right corner.
3. Select **"Install App"** (or **"Add to Home Screen"**).
4. Confirm the prompt to install.

### How Updates Work
The service worker is configured in `autoUpdate` mode. When updates are pushed to production, the service worker downloads the updated build assets in the background. Once ready, the browser automatically reloads or prompts the user via a Toast message to refresh and load the latest version.
