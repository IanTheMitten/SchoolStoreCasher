# Quick Start Guide

## Installation

```bash
cd server
npm install
```

## Run Development Server

```bash
npm start
```

Server will start on `http://localhost:4000`

## Test the API

```bash
# Health check
curl http://localhost:4000/api/ping

# Create a product
curl -X POST http://localhost:4000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Water Bottle",
    "price": 20.00,
    "unit_cost": 10.00,
    "stock": 100,
    "category": "Drink"
  }'

# List products
curl http://localhost:4000/api/products

# Create a student
curl -X POST http://localhost:4000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Kim",
    "grade": "Grade 9"
  }'

# Create a sale
curl -X POST http://localhost:4000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "S-...",
    "studentName": "Alice Kim",
    "items": [
      {
        "productId": "P-...",
        "quantity": 2,
        "unitPrice": 20.00
      }
    ],
    "paymentMethod": "cash"
  }'
```

## Run Tests

```bash
npm test
```

## Docker

```bash
docker-compose up -d
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=4000
NODE_ENV=development
DB_FILE=./db.json
CORS_ORIGIN=http://localhost:5173
API_KEY=
LOG_LEVEL=info
```

