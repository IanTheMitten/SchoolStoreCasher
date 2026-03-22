# Frontend API Integration

The frontend has been updated to connect to the Render backend API.

## Configuration

### Production (Default)
The frontend is configured to use the Render backend by default:
- API URL: `https://schoolstorecasher.onrender.com`

### Local Development
To use a local backend, create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:4000
```

Then restart the dev server.

## What's Been Updated

### 1. API Service (`src/services/api.ts`)
- Created centralized API service with all endpoints
- Handles all API calls to the backend
- Includes error handling

### 2. App.tsx
- Fetches products, students, transactions, and expenses on mount
- All CRUD operations now use API calls
- Added loading state
- Error handling with toast notifications

### 3. Components Updated
- **StudentManagement**: Create, update, delete students via API
- **AddProductModal**: Create products via API
- **Transaction handling**: Sales are sent to API
- **Stock adjustments**: Use API for stock changes
- **Expenses**: Create expenses via API

## Features

### Automatic Data Sync
- Data is fetched from API on app load
- All changes are synced to the backend
- Real-time updates after operations

### Error Handling
- Network errors show user-friendly messages
- Failed operations display error toasts
- Console logging for debugging

### Loading States
- Loading spinner while fetching initial data
- Optimistic UI updates where appropriate

## API Endpoints Used

- `GET /api/products` - Fetch all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `POST /api/products/:id/adjust` - Adjust stock
- `GET /api/students` - Fetch all students
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `POST /api/sales` - Create sale/transaction
- `GET /api/transactions` - Fetch transactions
- `GET /api/expenses` - Fetch expenses
- `POST /api/expenses` - Create expense

## Testing

1. **Local Testing**: 
   - Start backend: `cd server && npm start`
   - Create `.env` with `VITE_API_URL=http://localhost:4000`
   - Start frontend: `npm run dev`

2. **Production Testing**:
   - Frontend automatically uses Render backend
   - No configuration needed

## Notes

- The backend uses snake_case (e.g., `unit_cost`) while frontend uses camelCase (e.g., `unitCost`)
- Data transformation happens automatically in App.tsx
- All timestamps are converted from ISO strings to Date objects
- Transaction items are enriched with product information



