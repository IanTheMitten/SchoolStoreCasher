# School Store Backend API

REST API backend for the School Store Cashier System.

## Features

- **Products Management**: CRUD operations for products, stock adjustments
- **Students Management**: CRUD operations for students, purchase history
- **Sales/Transactions**: Atomic transaction processing with stock validation
- **Grades & Reports**: Aggregated spending by grade and student
- **Expenses**: Track and manage expenses
- **File-based Database**: JSON file storage for development (zero setup)
- **Production Ready**: Docker support, logging, error handling

## Quick Start

### Development (File-based DB)

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:4000`

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
PORT=4000
NODE_ENV=development
DB_FILE=./db.json
CORS_ORIGIN=http://localhost:5173
API_KEY=  # Optional, leave empty to disable
LOG_LEVEL=info
```

### Docker

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## API Endpoints

### Products

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `POST /api/products/:id/adjust` - Adjust stock

### Students

- `GET /api/students` - List all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/:id/purchases` - Get student purchase history

### Sales/Transactions

- `POST /api/sales` - Create a sale (atomic stock update)
- `GET /api/transactions` - List transactions (supports `?studentId=`, `?start=`, `?end=`)

### Grades

- `GET /api/grades` - Get spending totals by grade
- `GET /api/grades/:grade/students` - Get students in grade with spending

### Expenses

- `GET /api/expenses` - List expenses (supports `?start=`, `?end=`)
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense by ID
- `DELETE /api/expenses/:id` - Delete expense

### Health

- `GET /api/ping` - Health check

## Example Requests

### Create Product

```bash
curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Water Bottle",
    "price": 20.00,
    "unit_cost": 10.00,
    "stock": 100,
    "category": "Drink"
  }'
```

### Create Sale

```bash
curl -X POST http://localhost:4000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "S-100",
    "studentName": "Alice Kim",
    "items": [
      {
        "productId": "P-1",
        "quantity": 2,
        "unitPrice": 20.00
      }
    ],
    "paymentMethod": "cash"
  }'
```

### Get Grades

```bash
curl http://localhost:4000/api/grades
```

## Testing

```bash
npm test
```

Tests use a separate test database file (`db.test.json`) that is cleaned up after each test run.

## Database

### Development Mode (File-based)

Data is stored in `db.json` (or path specified in `DB_FILE`). The file is automatically created if it doesn't exist.

Structure:
```json
{
  "products": [],
  "students": [],
  "transactions": [],
  "transactionItems": [],
  "inventoryAdjustments": [],
  "expenses": []
}
```

### Production Mode (PostgreSQL)

For production, you can migrate to PostgreSQL. The schema is documented in the main specification. Update `DATABASE_URL` environment variable and implement database adapter in `lib/dbFile.js`.

## Security

- **API Key Authentication**: Set `API_KEY` environment variable to enable. Clients must send `x-api-key` header.
- **CORS**: Configure `CORS_ORIGIN` to restrict frontend origins in production.
- **Input Validation**: All endpoints validate request bodies.
- **Atomic Operations**: Sales operations are atomic to prevent race conditions.

## Logging

Logs are written using Pino. In development, logs are prettified. In production, use structured JSON logging.

Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

## Error Handling

All errors return JSON format:
```json
{
  "error": "Error message"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Not Found
- `409` - Conflict (duplicate ID)
- `500` - Internal Server Error

## Architecture

- **File-based DB with Locking**: Uses in-memory mutex to prevent race conditions on file writes
- **Atomic Transactions**: Sales operations validate stock, update products, and create transaction records atomically
- **Modular Routes**: Each resource has its own route file
- **Middleware**: Request logging, CORS, authentication, error handling

## Migration to PostgreSQL

1. Set up PostgreSQL database
2. Run schema migrations (see SQL schema in main spec)
3. Update `lib/dbFile.js` to use PostgreSQL client instead of file operations
4. Use database transactions for atomic operations
5. Update `DATABASE_URL` environment variable

## Deployment

### Docker

```bash
docker-compose up -d
```

### PM2

```bash
pm2 start index.js --name school-store-api
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=4000
DB_FILE=/app/data/db.json
CORS_ORIGIN=https://your-frontend-domain.com
API_KEY=your-secure-api-key
LOG_LEVEL=info
```

## License

ISC

