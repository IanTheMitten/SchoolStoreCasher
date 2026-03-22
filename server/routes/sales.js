import express from 'express';
import { withDB } from '../lib/dbFile.js';
import { validateSale } from '../lib/validators.js';

const router = express.Router();

// POST /api/sales
router.post('/', async (req, res) => {
  try {
    const errors = validateSale(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    
    const { studentId, studentName, items, paymentMethod = 'cash', timestamp } = req.body;
    
    const result = await withDB(async (db) => {
      // Validate all products exist and have sufficient stock
      const productChecks = [];
      
      for (const item of items) {
        const product = db.products.find(p => p.id === item.productId);
        
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
        }
        
        productChecks.push({
          product,
          item,
          newStock: product.stock - item.quantity
        });
      }
      
      // Calculate total before validation (needed for student balance check)
      let transactionTotal = 0;
      for (const { product, item } of productChecks) {
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.price;
        transactionTotal += unitPrice * item.quantity;
      }
      
      // CRITICAL FIX: Validate student balance if payment method is student_balance
      if (paymentMethod === 'student_balance' && studentId) {
        const student = db.students.find(s => s.id === studentId);
        
        if (!student) {
          throw new Error(`Student ${studentId} not found`);
        }
        
        if (student.balance < transactionTotal) {
          throw new Error(`Insufficient student balance. Available: $${student.balance.toFixed(2)}, Required: $${transactionTotal.toFixed(2)}`);
        }
      }
      
      // All checks passed, now atomically update stock and create transaction
      const transactionId = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transactionTimestamp = timestamp || new Date().toISOString();
      
      // Calculate totals and update products
      let total = 0;
      const transactionItems = [];
      
      for (const { product, item } of productChecks) {
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.price;
        const lineTotal = unitPrice * item.quantity;
        total += lineTotal;
        
        // Update product stock
        product.stock -= item.quantity;
        
        // Create transaction item
        const transactionItem = {
          id: `TI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          transactionId,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          unitCostAtSale: product.unit_cost || 0,
          lineTotal
        };
        
        transactionItems.push(transactionItem);
      }
      
      // CRITICAL FIX: Deduct from student balance if payment method is student_balance
      if (paymentMethod === 'student_balance' && studentId) {
        const student = db.students.find(s => s.id === studentId);
        if (student) {
          student.balance -= total;
        }
      }
      
      // Create transaction
      const transaction = {
        id: transactionId,
        studentId: studentId || null,
        studentName: studentName || null,
        total,
        paymentMethod,
        timestamp: transactionTimestamp
      };
      
      db.transactions.push(transaction);
      db.transactionItems.push(...transactionItems);
      
      return {
        transaction: {
          ...transaction,
          items: transactionItems
        }
      };
    });
    
    res.json({ ok: true, ...result });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Insufficient')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await withDB(async (db) => {
      let filtered = [...db.transactions];
      
      // Filter by studentId if provided
      if (req.query.studentId) {
        filtered = filtered.filter(t => t.studentId === req.query.studentId);
      }
      
      // Filter by date range if provided
      if (req.query.start) {
        const start = new Date(req.query.start);
        filtered = filtered.filter(t => new Date(t.timestamp) >= start);
      }
      
      if (req.query.end) {
        const end = new Date(req.query.end);
        filtered = filtered.filter(t => new Date(t.timestamp) <= end);
      }
      
      // Enrich with transaction items
      return filtered.map(tx => {
        const items = db.transactionItems.filter(item => item.transactionId === tx.id);
        return {
          ...tx,
          items
        };
      });
    });
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

