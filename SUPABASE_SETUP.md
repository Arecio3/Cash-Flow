# Supabase Cloud Database & Auth Setup Guide

Follow these steps to configure your Supabase backend and link it to your Cash Flow application.

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for a free account.
2. In the Supabase Dashboard, click **New Project**.
3. Choose an organization, choose a project name (e.g. `Cash-Flow`), enter a secure database password, and choose a region closest to you.
4. Click **Create new project** and wait for database provisioning to finish (usually takes 1–2 minutes).

---

## Step 2: Retrieve API Keys

Once the project is created:
1. Navigate to the **Project Settings** (the cog icon in the bottom left sidebar) → **API**.
2. Locate the **Project API keys** section.
3. Copy the **Project URL** (labeled `URL`).
4. Copy the **Anon Public Key** (labeled `anon public`).

---

## Step 3: Create Local Environment Variables

1. In the root directory of your project, create a new file named `.env.local`.
2. Add the following lines, replacing the values with your copied credentials:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-public-key
```

> [!NOTE]
> The `.env.local` file is listed in `.gitignore` and will never be committed to Git. This prevents your secrets from leaking.

---

## Step 4: Run the Database Schema DDL

1. In the Supabase Dashboard left sidebar, click on **SQL Editor** (the terminal icon).
2. Click **New query** (or **New Blank Query**).
3. Open the [schema.sql](file:///c:/Users/cuba2/.gemini/antigravity-ide/scratch/Cash-Flow/schema.sql) file in this repository.
4. Copy the entire contents of `schema.sql` and paste it into the Supabase SQL editor.
5. Click **Run** in the bottom right of the editor.
6. Verify the query executes successfully with `"Success. No rows returned."` — your tables, relational foreign keys, indexes, and Row Level Security (RLS) policies are now active!

---

## Step 5: Enable Google OAuth (Optional)

If you want to use the Google Sign-In button:
1. Go to **Authentication** (the user icon in the sidebar) → **Providers** → **Google**.
2. Enable the Google provider.
3. Follow the instructions to paste your **Client ID** and **Client Secret** from the Google Cloud Console.
4. Set the redirect URI to your Supabase Auth callback URI.
