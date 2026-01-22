Local standalone (Android) setup

Goal: run the frontend entirely on-device (Android pad) with all data stored locally in the browser via IndexedDB. The app is now able to run without the Node/Express server — `src/services/api.ts` delegates to `src/services/localDb.ts` by default.

How it works
- The app uses an in-browser IndexedDB database (`schoolstore-db`) to store products, students, transactions, and expenses.
- On first run the DB is seeded with `src/data/mockData.ts`.
- All API calls are routed to the local DB when the environment variable `VITE_USE_LOCAL` is not set to `false` (default: local mode enabled).

Recommended run options

1) Development (requires Node + npm on a development machine)

- Create a `.env` file at project root if you need to override settings:

  VITE_USE_LOCAL=true
  VITE_API_URL=http://localhost:4000  # only used if VITE_USE_LOCAL=false

- Install and run locally (desktop):

```bash
npm install
npm run dev
```

- Open the app in the Android tablet browser by pointing it at your dev machine IP: e.g. `http://192.168.x.y:5173` and add to home screen (PWA-style) if desired.

2) Production build and static hosting (recommended for offline install)

- Build a static bundle:

```bash
npm run build
```

- Serve the `dist`/`build` output with a simple static server (you can use `serve`, `python -m http.server`, or any static host). Example:

```bash
npx serve build
# or
python3 -m http.server 8080 --directory build
```

- Open the app in Android browser at `http://<host-ip>:8080` and choose "Add to Home screen" to install.

Notes about fully offline operation on Android
- For true offline-first PWA behavior (loading app shell and assets when offline), you should add a Service Worker and manifest.json. This repository does not yet include an automated service worker; add Workbox or configure Vite PWA plugin for production.
- IndexedDB (used for local storage) persists between sessions and works in Android browsers (Chrome, Chromium-based WebViews). Data lifetime subject to browser storage policies but generally persistent for installed PWAs.

Limitations & caveats
- No server-side authentication or multi-user sync — data is device-local only.
- If you plan to distribute to multiple tablets, you will need replication or export/import of DB (not implemented here).
- Some features that expected server-side behavior (e.g., advanced reporting across devices) will be local-only.

What I changed
- `src/services/localDb.ts` — IndexedDB-backed data layer with seed data
- `src/services/api.ts` — delegates to `localDb` when `VITE_USE_LOCAL` is not false
- `src/App.tsx` — initializes `localDb` on startup when local mode enabled

Next steps I can do (pick any):
- Add a PWA service worker + `manifest.json` for reliable offline installation
- Add export/import for the IndexedDB data (JSON) to move data between devices
- Add automatic backup to a file (downloadable backup/restore flow)

If you want, I can implement an export/import feature next so you can copy a JSON backup to another device or to cloud storage.
