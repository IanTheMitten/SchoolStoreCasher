import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import app from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a test database file
const TEST_DB_FILE = path.join(__dirname, '../db.test.json');

// Set test environment
process.env.DB_FILE = TEST_DB_FILE;
process.env.NODE_ENV = 'test';
process.env.API_KEY = '';

// Clean up test DB before and after tests
const cleanTestDB = () => {
  if (fs.existsSync(TEST_DB_FILE)) {
    fs.unlinkSync(TEST_DB_FILE);
  }
};

// Jest globals are available in Node.js test environment
const { describe, it, expect, beforeEach, afterEach } = global;

beforeEach(() => {
  cleanTestDB();
});

afterEach(() => {
  cleanTestDB();
});

describe('Health Check', () => {
  it('should return ok on /api/ping', async () => {
    const res = await request(app)
      .get('/api/ping')
      .expect(200);
    
    expect(res.body.ok).toBe(true);
  });
});

describe('Products API', () => {
  let productId;

  it('should create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 10.50,
        unit_cost: 5.00,
        stock: 100,
        category: 'Test'
      })
      .expect(201);
    
    expect(res.body.name).toBe('Test Product');
    expect(res.body.price).toBe(10.50);
    productId = res.body.id;
  });

  it('should get all products', async () => {
    await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 10.50,
        stock: 100
      });
    
    const res = await request(app)
      .get('/api/products')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should get a product by id', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 10.50,
        stock: 100
      });
    
    const res = await request(app)
      .get(`/api/products/${createRes.body.id}`)
      .expect(200);
    
    expect(res.body.id).toBe(createRes.body.id);
    expect(res.body.name).toBe('Test Product');
  });

  it('should update a product', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 10.50,
        stock: 100
      });
    
    const res = await request(app)
      .put(`/api/products/${createRes.body.id}`)
      .send({
        name: 'Updated Product',
        stock: 150
      })
      .expect(200);
    
    expect(res.body.name).toBe('Updated Product');
    expect(res.body.stock).toBe(150);
  });

  it('should adjust product stock', async () => {
    const createRes = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 10.50,
        stock: 100
      });
    
    const res = await request(app)
      .post(`/api/products/${createRes.body.id}/adjust`)
      .send({
        change: -10,
        reason: 'sale',
        user: 'test-user'
      })
      .expect(200);
    
    expect(res.body.stock).toBe(90);
  });
});

describe('Students API', () => {
  let studentId;

  it('should create a student', async () => {
    const res = await request(app)
      .post('/api/students')
      .send({
        name: 'John Doe',
        grade: 'Grade 9'
      })
      .expect(201);
    
    expect(res.body.name).toBe('John Doe');
    expect(res.body.grade).toBe('Grade 9');
    studentId = res.body.id;
  });

  it('should require name when creating student', async () => {
    const res = await request(app)
      .post('/api/students')
      .send({
        grade: 'Grade 9'
      })
      .expect(400);
    
    expect(res.body.error).toContain('name');
  });

  it('should get all students', async () => {
    await request(app)
      .post('/api/students')
      .send({
        name: 'John Doe',
        grade: 'Grade 9'
      });
    
    const res = await request(app)
      .get('/api/students')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should delete a student', async () => {
    const createRes = await request(app)
      .post('/api/students')
      .send({
        name: 'John Doe',
        grade: 'Grade 9'
      });
    
    const res = await request(app)
      .delete(`/api/students/${createRes.body.id}`)
      .expect(200);
    
    expect(res.body.ok).toBe(true);
    
    // Verify student is deleted
    await request(app)
      .get(`/api/students/${createRes.body.id}`)
      .expect(404);
  });
});

describe('Sales API', () => {
  let productId;
  let studentId;

  beforeEach(async () => {
    // Create a product for testing
    const productRes = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 10.00,
        stock: 100
      });
    productId = productRes.body.id;

    // Create a student for testing
    const studentRes = await request(app)
      .post('/api/students')
      .send({
        name: 'Test Student',
        grade: 'Grade 9'
      });
    studentId = studentRes.body.id;
  });

  it('should create a sale', async () => {
    const res = await request(app)
      .post('/api/sales')
      .send({
        studentId: studentId,
        studentName: 'Test Student',
        items: [
          {
            productId: productId,
            quantity: 2,
            unitPrice: 10.00
          }
        ],
        paymentMethod: 'cash'
      })
      .expect(200);
    
    expect(res.body.ok).toBe(true);
    expect(res.body.transaction.total).toBe(20.00);
    expect(res.body.transaction.items.length).toBe(1);
    
    // Verify stock was decremented
    const productRes = await request(app)
      .get(`/api/products/${productId}`);
    expect(productRes.body.stock).toBe(98);
  });

  it('should reject sale with insufficient stock', async () => {
    const res = await request(app)
      .post('/api/sales')
      .send({
        items: [
          {
            productId: productId,
            quantity: 200, // More than available stock
            unitPrice: 10.00
          }
        ],
        paymentMethod: 'cash'
      })
      .expect(400);
    
    expect(res.body.error).toContain('Insufficient stock');
  });

  it('should get transactions', async () => {
    // Create a sale first
    await request(app)
      .post('/api/sales')
      .send({
        studentId: studentId,
        items: [
          {
            productId: productId,
            quantity: 1,
            unitPrice: 10.00
          }
        ],
        paymentMethod: 'cash'
      });
    
    const res = await request(app)
      .get('/api/transactions')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].items).toBeDefined();
  });
});

describe('Grades API', () => {
  beforeEach(async () => {
    // Create students in different grades
    const student1 = await request(app)
      .post('/api/students')
      .send({ name: 'Student 1', grade: 'Grade 9' });
    
    const student2 = await request(app)
      .post('/api/students')
      .send({ name: 'Student 2', grade: 'Grade 10' });

    // Create products
    const product = await request(app)
      .post('/api/products')
      .send({ name: 'Product', price: 10.00, stock: 100 });

    // Create transactions
    await request(app)
      .post('/api/sales')
      .send({
        studentId: student1.body.id,
        items: [{ productId: product.body.id, quantity: 1, unitPrice: 10.00 }],
        paymentMethod: 'cash'
      });
  });

  it('should get grades with totals', async () => {
    const res = await request(app)
      .get('/api/grades')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    const grade9 = res.body.find(g => g.grade === 'Grade 9');
    expect(grade9).toBeDefined();
    expect(grade9.totalSpent).toBeGreaterThan(0);
  });

  it('should get students in a grade', async () => {
    const res = await request(app)
      .get('/api/grades/Grade 9/students')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].totalSpent).toBeDefined();
  });
});

describe('Expenses API', () => {
  it('should create an expense', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({
        amount: 50.00,
        category: 'Supplies',
        note: 'Test expense'
      })
      .expect(201);
    
    expect(res.body.amount).toBe(50.00);
    expect(res.body.category).toBe('Supplies');
  });

  it('should get all expenses', async () => {
    await request(app)
      .post('/api/expenses')
      .send({
        amount: 50.00,
        category: 'Supplies'
      });
    
    const res = await request(app)
      .get('/api/expenses')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

