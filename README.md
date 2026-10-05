# SchoolStoreCasher

Offline-first cashier and inventory app for a school store. React + Vite + TypeScript; all data is stored locally in the browser's IndexedDB, so no server is needed.

## Run

```bash
npm install
npm run dev      # dev server
npm run build    # production build into build/
npm run preview  # serve the production build
```

## Configuration

Optional `.env` variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_APP_PASSWORD` | Login password | `schoolstore` |
| `VITE_SCAN_BURST_MAX_INTERVAL_MS` | Anti-burst interval for barcode scans | |
| `VITE_BARCODE_ALLOWED_PATTERN` | Regex for valid barcodes | `^\d+$` |
| `VITE_BARCODE_ALLOWED_LENGTHS` | Comma-separated valid barcode lengths | `8,13` |

See `CLAUDE.md` for architecture notes.
