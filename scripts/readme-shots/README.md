# README screenshots

Regenerates every image in `docs/screenshots/` from invented demo data.

```bash
scripts/readme-shots/run.sh
```

What it does:

1. `gen-seed.mjs` writes a fake store (72 students, 6 teachers, 28 products, about 8 weeks of sales) to a temp folder. Every name and number is made up.
2. Starts the app on port 3100 with `vite.demo.config.ts`, which points the disk mirror at that temp folder. Your real `data/db.json` and the browser data on port 3000 are never touched.
3. `capture.mjs` drives the app with Playwright through every screen: a teacher self-checkout, a wallet charge, a full sale to receipt, then each page and dialog.
4. Copies the PNGs into `docs/screenshots/`, resized to 1800px wide.

Requirements: macOS (uses `sips` to resize) and Google Chrome. Playwright installs into this folder on first run; it uses your Chrome instead of downloading a browser.

The clock is pinned to `DEMO_NOW` in `demo-time.mjs` (a Friday lunch break) so the seed data and the app agree on "today". If a screen changes its labels, update the selectors in `capture.mjs`.
