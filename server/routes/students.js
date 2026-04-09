import express from 'express';
import { withDB, readDB } from '../lib/dbFile.js';
import { validateStudent } from '../lib/validators.js';

const router = express.Router();

// GET /api/students
router.get('/', async (req, res) => {
  try {
    const students = await readDB((db) => db.students);
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const student = await readDB((db) => 
      db.students.find(s => s.id === req.params.id)
    );
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/students
router.post('/', async (req, res) => {
  try {
    const errors = validateStudent(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    
    const student = await withDB(async (db) => {
      const { name, grade, gender, barcode, balance = 0 } = req.body;
      
      // Generate ID if not provided
      const id = req.body.id || `S-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Check for duplicate ID
      if (db.students.find(s => s.id === id)) {
        throw new Error('Student ID already exists');
      }
      const normalizedBarcode = typeof barcode === 'string' ? barcode.trim() : '';
      if (normalizedBarcode && db.students.find(s => s.barcode === normalizedBarcode)) {
        throw new Error('Student barcode already exists');
      }
      
      const newStudent = {
        id,
        name: name.trim(),
        grade: grade || '',
        gender: gender || '',
        barcode: normalizedBarcode || undefined,
        balance: balance || 0
      };
      
      db.students.push(newStudent);
      return newStudent;
    });
    
    res.status(201).json(student);
  } catch (error) {
    if (error.message === 'Student ID already exists' || error.message === 'Student barcode already exists') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
  try {
    const errors = validateStudent(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    
    const student = await withDB(async (db) => {
      const index = db.students.findIndex(s => s.id === req.params.id);
      
      if (index === -1) {
        return null;
      }
      
      const existing = db.students[index];
      const normalizedBarcode = typeof req.body.barcode === 'string' ? req.body.barcode.trim() : undefined;

      if (normalizedBarcode) {
        const duplicateBarcode = db.students.find(
          s => s.id !== req.params.id && s.barcode === normalizedBarcode
        );
        if (duplicateBarcode) {
          throw new Error('Student barcode already exists');
        }
      }

      const updated = {
        ...existing,
        ...req.body,
        ...(req.body.barcode !== undefined ? { barcode: normalizedBarcode || undefined } : {}),
        id: req.params.id // Ensure ID doesn't change
      };
      
      db.students[index] = updated;
      return updated;
    });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(student);
  } catch (error) {
    if (error.message === 'Student barcode already exists') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await withDB(async (db) => {
      const index = db.students.findIndex(s => s.id === req.params.id);
      
      if (index === -1) {
        return null;
      }
      
      const removed = db.students.splice(index, 1)[0];
      return removed;
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json({ ok: true, removed: result });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/students/:id/purchases
router.get('/:id/purchases', async (req, res) => {
  try {
    const purchases = await readDB(async (db) => {
      const student = db.students.find(s => s.id === req.params.id);
      
      if (!student) {
        return null;
      }
      
      // Get all transactions for this student
      const transactions = db.transactions.filter(t => t.studentId === req.params.id);
      
      // Enrich with transaction items
      return transactions.map(tx => {
        const items = db.transactionItems.filter(item => item.transactionId === tx.id);
        return {
          ...tx,
          items
        };
      });
    });
    
    if (purchases === null) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching student purchases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
