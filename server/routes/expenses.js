import express from 'express';
import { withDB, readDB } from '../lib/dbFile.js';
import { validateExpense } from '../lib/validators.js';

const router = express.Router();

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await readDB(async (db) => {
      let filtered = [...db.expenses];
      
      // Filter by date range if provided
      if (req.query.start) {
        const start = new Date(req.query.start);
        filtered = filtered.filter(e => new Date(e.datetime) >= start);
      }
      
      if (req.query.end) {
        const end = new Date(req.query.end);
        filtered = filtered.filter(e => new Date(e.datetime) <= end);
      }
      
      // Sort by date descending
      return filtered.sort((a, b) => 
        new Date(b.datetime) - new Date(a.datetime)
      );
    });
    
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const errors = validateExpense(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    
    const expense = await withDB(async (db) => {
      const { amount, category, note, related_product_id } = req.body;
      
      const id = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const datetime = req.body.datetime || new Date().toISOString();
      
      const newExpense = {
        id,
        datetime,
        category: category || '',
        amount,
        note: note || '',
        related_product_id: related_product_id || null
      };
      
      db.expenses.push(newExpense);
      return newExpense;
    });
    
    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const expense = await readDB((db) => 
      db.expenses.find(e => e.id === req.params.id)
    );
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await withDB(async (db) => {
      const index = db.expenses.findIndex(e => e.id === req.params.id);
      
      if (index === -1) {
        return null;
      }
      
      const removed = db.expenses.splice(index, 1)[0];
      return removed;
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json({ ok: true, removed: result });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

