# PWA Installability Compliance Checklist

This document details Chrome's Progressive Web App (PWA) installability requirements and maps how the Cash Flow application satisfies each item.

---

### 1. Web App Manifest
* **Requirement**: The app must have a valid web app manifest containing a name, short name, start URL, display mode (standalone), and necessary app icons.
* **Cash Flow Implementation**:
  - The manifest is automatically generated and linked by the `vite-plugin-pwa` plugin.
  - The config registers:
    - `name`: "Budget App"
    - `short_name`: "Budget"
    - `display`: "standalone"
    - `orientation`: "portrait"
    - `start_url`: "/"
    - `theme_color` & `background_color`: "#0f1117"
  - Icons are generated at `64x64`, `192x192`, `512x512` (for general use), and a `512x512` `maskable` icon.

### 2. Service Worker Registration
* **Requirement**: The app must register a Service Worker that intercepts network requests and handles caching.
* **Cash Flow Implementation**:
  - `vite-plugin-pwa` injects service worker registration scripting into the build automatically.
  - The generated service worker handles offline caching of all static assets (HTML, CSS, JavaScript, icons, SVGs).

### 3. Offline Loading Capability (Offline support)
* **Requirement**: The app must return a valid 200 response when offline.
* **Cash Flow Implementation**:
  - The service worker caches the `index.html` shell and all JS/CSS chunks. When offline, these are loaded instantly from the browser's Cache Storage.
  - Runtime caching for Supabase requests uses a `NetworkFirst` strategy, catching connectivity dropouts, failing gracefully, and logging warning notifications using the custom toast system instead of freezing the UI.

### 4. Responsive Mobile Design
* **Requirement**: The layout must adjust elegantly to fit all viewport sizes without horizontal scroll bar breaking.
* **Cash Flow Implementation**:
  - All grids (`.metrics-grid`, `.charts-grid`, `.workspace-grid`) stack into a single column on viewport widths under `768px`.
  - Side/Top navigations and desktop actions collapse into a dedicated, clean fixed `.mobile-bottom-nav` tab bar.
  - The transaction input form slides up as a bottom sheet (`.transaction-form-card.mobile-active`) with a dimming backdrop overlay rather than rendering inline.
  - Charts (such as the waterfall capital flow) scroll horizontally using an `overflow-x: auto` wrapper on mobile.
  - All clickable links, calendar day cells, and form buttons are sized to at least `44x44px` to accommodate thumb taps.

### 5. Secure Context (HTTPS)
* **Requirement**: Served over HTTPS (except `localhost`).
* **Cash Flow Implementation**:
  - The app is hosted on Vercel, which provisions secure SSL certificates and redirects HTTP to HTTPS automatically.
