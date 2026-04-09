# SchoolStoreCasher – Agent Handoff Guide

## 1) Overview
- **Purpose**: School store cashier + inventory + student spending management app.
- **Primary mode**: Frontend runs as a standalone offline web app with browser IndexedDB as the system of record.
- **Secondary mode**: A separate Express backend exists under `server/` for API-based deployments.

## 2) Key Features
- Cashier checkout flow with cart, customer association, and payment handling.
- Inventory management (CRUD + stock adjustments + reorder metadata).
- Budget/expense tracking and analytics dashboards.
- Student and grade management views.
- Teacher/category management for reporting/grouping.
- Session password gate on frontend and optional API/site authentication on backend.

## 3) Architecture / Structure

### Root
- `src/`: React + Vite frontend app.
- `server/`: Node/Express backend API (optional for standalone mode).
- `build/`: Built frontend artifacts.
- `README.md`, `QUICK_START.md`, `LOCAL_SETUP.md`: setup and operating docs.

### Frontend (`src/`)
- `main.tsx`: React entrypoint; wraps app with `CurrencyProvider`.
- `App.tsx`: top-level state orchestration and page routing.
- `components/`
  - `cashier/`: checkout UI + payment modals.
  - `inventory/`: product/stock UI.
  - `budget/`, `statistic/`, `grades/`: analytics/reporting pages.
  - `ui/`: reusable Radix/Tailwind UI primitives.
- `services/`
  - `api.ts`: API facade consumed by UI.
  - `localDb.ts`: IndexedDB implementation used by `api.ts`.
- `data/mockData.ts`: seed/sample data source.
- `contexts/`: shared context providers (currency, etc.).

### Backend (`server/`)
- `index.js`: Express app wiring, middleware, routes, and error handlers.
- `routes/`: route handlers by domain (`products`, `students`, `sales`, `grades`, `expenses`, `auth`).
- `lib/`: auth/session/db helpers + validators.
- `migrations/`: SQL schema files.
- `tests/`: API integration tests.

## 4) Core Logic
1. App bootstraps and initializes IndexedDB (`localDb.init()`), then loads products/students/transactions/expenses/teachers/categories in parallel.
2. UI actions call service facades from `src/services/api.ts`.
3. `api.ts` delegates operations to `localDb.ts` (local-first behavior).
4. `localDb.ts` performs transactional IndexedDB operations across stores:
   - sale creation updates transactions and decrements product stock;
   - stock adjustments write both product updates and inventory adjustment audit entries;
   - expense entries may trigger inventory restock updates when category is inventory purchase.
5. `App.tsx` transforms storage records into frontend view models (date normalization, field mapping like `unit_cost -> unitCost`).

## 5) Inputs and Outputs

### Inputs
- User interactions: product edits, stock changes, cart checkout, student/teacher/category CRUD, expense submissions.
- Optional environment variables:
  - Frontend: `VITE_APP_PASSWORD`.
  - Backend: `PORT`, `CORS_ORIGIN`, `API_KEY`, `SITE_PASSWORD`, `DB_FILE`, `LOG_LEVEL`.

### Outputs
- Frontend-rendered pages/tables/charts.
- Persisted browser IndexedDB records in stores:
  - `products`, `students`, `teachers`, `categories`, `transactions`, `expenses`, `inventoryAdjustments`.
- Optional backend JSON API responses under `/api/*`.

## 6) Dependencies

### Frontend
- Runtime: React 18, Vite, Radix UI component packages, Recharts, Sonner, Lucide.
- Styling/utilities: Tailwind-oriented utility helpers (`clsx`, `tailwind-merge`, `class-variance-authority`).

### Backend
- Express, CORS, express-session, Pino logging.
- Testing: Jest + Supertest.

## 7) Setup & Usage

### Frontend (standalone local mode)
```bash
npm install
npm run dev
```
- Dev URL default: `http://localhost:5173`.

### Frontend production build
```bash
npm run build
npm run preview
```

### Backend (optional API server)
```bash
cd server
npm install
npm start
```
- API URL default: `http://localhost:4000`.

### Typical agent workflow
1. Start frontend dev server.
2. Validate key flows: checkout, stock adjust, expense add, student CRUD.
3. If backend changes are made, run backend tests under `server/`.

## 8) Important Notes
- Current implementation is **device-local first**; no built-in cross-device sync.
- IndexedDB is authoritative in frontend mode; clearing browser storage deletes local data.
- Some docs mention hybrid/server modes; verify target deployment mode before modifying data flow.
- There is a prebuilt `build/` bundle in repo; regenerate after UI/runtime changes.
- Backend exists and is functional, but frontend service layer is currently wired to local IndexedDB methods.
