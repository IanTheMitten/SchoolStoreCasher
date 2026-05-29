# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SchoolStoreCasher** is a standalone, offline-first cashier and inventory management web application designed for school stores. All data is stored locally in IndexedDB with no server connectivity required.

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with class-variance-authority for component variants
- **UI Components**: Radix UI primitives (30+ components)
- **Charts**: Recharts for analytics visualizations
- **Local Database**: IndexedDB via browser-native API
- **Notifications**: Sonner for toast notifications
- **Barcode Scanning**: Multi-modal scanner support (keyboard wedge, HID, Serial)

### Application Structure

**Single-Page Application** with page-based routing controlled by React state in `App.tsx`. The main component renders different "pages" based on the `currentPage` state:

```typescript
// Pages available: 'cashier' | 'inventory' | 'budget' | 'students' | 'grades' | 'statistic'
```

**Data Flow Architecture:**
1. **API Layer** (`services/api.ts`): Abstracts all data operations, provides clean async functions
2. **Database Layer** (`services/localDb.ts`): Direct IndexedDB operations using native browser API
3. **Application State**: Main state lives in `App.tsx`, fetched on initial load and updated optimistically
4. **Component Communication**: Props drilling for data/methods, no global state management library
5. **Contexts** (`contexts/`): Two React contexts — `CurrencyContext` for currency formatting, `ScannerContext` for shared barcode scanner state across components

### Key Data Models

**Core entities stored in IndexedDB:**
- **Products**: Inventory items with price, cost, stock levels, barcodes
- **Students**: Customer records with grade, gender, barcode
- **Teachers**: Staff customer records
- **Transactions**: Sales records with line items, payment method, customer linkage
- **Expenses**: Operational costs and inventory purchases
- **Stock Adjustments**: Inventory change history (restock, damage, correction)
- **Categories**: Product categorization

### Authentication & Session Management

- **Password-based auth** with session timeout based on inactivity
- Default password from `VITE_APP_PASSWORD` env var or "schoolstore"
- Session state persisted in localStorage
- **Session timeouts**: 10 minutes (40 minutes during lunch hour 12:00-12:40)

### Scanner System

Multi-modal barcode scanning managed via `contexts/ScannerContext.tsx`:
- **Keyboard wedge**: Standard barcode scanners that emulate keyboard input
- **HID**: WebHID API for direct scanner communication
- **Serial**: Web Serial API for serial barcode scanners

`ScannerContext` wraps `services/scanner.ts` and exposes a priority-based handler registry. Components register/unregister handlers; the highest-priority registered handler receives each scan. Scanner capability detection and automatic mode selection happens on mount. Includes anti-burst protection to prevent duplicate scans.

## Development Commands

```bash
# Install dependencies
npm i

# Development server (runs on port 3000)
npm run dev

# Production build (output to 'build' directory)
npm run build

# Preview production build
npm run preview
```

**No test suite or linting commands exist** - be careful when making changes.

## Environment Variables

Configuration via VITE environment variables:
- `VITE_APP_PASSWORD`: Login password (default: "schoolstore")
- `VITE_SCAN_BURST_MAX_INTERVAL_MS`: Anti-burst interval for barcode scanning
- `VITE_BARCODE_ALLOWED_PATTERN`: Regex pattern for valid barcodes (default: '^\d+$')
- `VITE_BARCODE_ALLOWED_LENGTHS`: Comma-separated valid barcode lengths (default: '8,13')

## Data Storage & IndexedDB

All data is stored locally in IndexedDB. The database structure is defined in `services/localDb.ts`:

- **Database Name**: `schoolstore-db`
- **Version**: 3 (increment when changing schema)
- **Object Stores**: products, students, teachers, transactions, expenses, categories, inventoryAdjustments

All data access happens through the service layer. Never access IndexedDB directly outside of `localDb.ts`.

### Optimistic Updates Pattern

The application uses optimistic updates for UI responsiveness:
1. Update local state immediately
2. Make API call in background
3. Revert state on error and show toast notification

See `handleUpdateProducts` and `handleUpdateStudents` in `App.tsx` for examples.

### Transaction Normalization
Transactions store both `productId` and `productName` for data integrity and include `unitCostAtSale` for historical cost analysis. Customer association is normalized via `normalizeTransactionCustomer` function.

## Code Conventions

### Type Definitions
- Core types (Product, Student, Transaction, etc.) defined in `App.tsx`
- Import types directly when needed: `import type { Product } from '../App'`

### Function Naming
- API methods: `getAll`, `getById`, `create`, `update`, `delete` pattern
- Event handlers: Prefixed with `handle` (e.g., `handleAddTransaction`)
- Callback props: Prefixed with `on` (e.g., `onUpdateProducts`)

### Currency Handling
- Multi-currency support via `CurrencyContext` (KRW, USD, EUR)
- **Always** use the `useCurrency()` hook's `formatCurrency` function for display
- Never hardcode currency symbols or formatting

### UI Component Patterns
- Uses Radix UI + Tailwind for all components
- Component variants via `class-variance-authority` (see `components/ui/button.tsx` for example)
- Consistent styling via utility classes, no custom CSS
- Sonner toast notifications: `toast.success()`, `toast.error()`

## Critical Implementation Notes

### When Adding New Features
1. **Database changes**: Update schema version and upgrade logic in `localDb.ts`
2. **New API methods**: Add to appropriate service in `services/api.ts`
3. **Data fetching**: Add to initial data load in `App.tsx` `useEffect`
4. **Avoid backend dependencies** - this app must work offline

### Error Handling
- All async operations should have try/catch with user-facing error messages
- Use Sonner toast for errors: `toast.error('Descriptive error message')`
- Log errors to console for debugging

### Performance Considerations
- All data loads on initial app start (no pagination)
- Be mindful of IndexedDB operations - wrap in transactions when multiple ops needed
- Optimize re-renders - use `useCallback` for handler functions passed to child components

### Scanner Implementation
Use the `useScanner()` hook — do not call `services/scanner.ts` directly from components:

```typescript
import { useScanner } from '../../contexts/ScannerContext';

function MyComponent() {
  const { registerHandler, unregisterHandler } = useScanner();

  useEffect(() => {
    registerHandler({ id: 'my-component', priority: 10, handler: (barcode) => { /* handle */ } });
    return () => unregisterHandler('my-component');
  }, [registerHandler, unregisterHandler]);
}
```

Higher `priority` wins when multiple handlers are registered. The context manages the scanner stream lifecycle automatically.

## Common Tasks

### Adding a New Entity Type
1. Add new IndexedDB store in `localDb.ts` (increment DB_VERSION)
2. Create API service methods in `services/api.ts`
3. Add TypeScript interface in `App.tsx` or appropriate file
4. Add data loading to App.tsx's initial fetch
5. Create necessary CRUD UI components

### Modifying the Database Schema
1. Increment `DB_VERSION` in `localDb.ts`
2. Add upgrade logic in `onupgradeneeded` handler
3. Test in browser with existing data - IndexedDB will trigger upgrade

### Working with Transactions
- Always validate customer association before completing sales
- Transaction normalization happens in `normalizeTransactionCustomer`
- Items include both productId and productName for data integrity
- Store unitCostAtSale for historical cost analysis

### Adding New UI Components
**Use existing Radix UI components** from `components/ui/` if possible. New components should:
- Follow the existing pattern (separate .tsx file in components/ui/)
- Use class-variance-authority for variant management
- Support Tailwind's dark mode via `dark:` prefix
- Accept standard props spreading for ref/radix integration

### Path Aliases
The `@` alias resolves to `./src` (configured in `vite.config.ts`). Prefer `@/` imports over relative `../../` paths when deeply nested.

### Deprecated Components
- **StudentPaymentModal** (`components/cashier/StudentPaymentModal.tsx`): Kept for reference but superseded by cash-based customer association. Use `CashPaymentModal` with `normalizeTransactionCustomer` for new payment flows.