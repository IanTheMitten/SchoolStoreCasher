import express from 'express';
import { withDB, readDB } from '../lib/dbFile.js';
import { validateProduct, validateStockAdjustment } from '../lib/validators.js';

const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await readDB((db) => db.products);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await readDB((db) => 
      db.products.find(p => p.id === req.params.id)
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    
    const product = await withDB(async (db) => {
      const { name, sku, price, unit_cost, stock = 0, category, description, reorderLevel, supplier, barcode } = req.body;
      
      // Generate ID if not provided
      const id = req.body.id || `P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Check for duplicate ID
      if (db.products.find(p => p.id === id)) {
        throw new Error('Product ID already exists');
      }
      
      const newProduct = {
        id,
        sku: sku || '',
        name: name || '',
        price: price || 0,
        unit_cost: unit_cost || 0,
        stock: stock || 0,
        category: category || '',
        description: description || '',
        reorderLevel: reorderLevel || 0,
        supplier: supplier || '',
        barcode: barcode || '',
        lastRestock: null
      };
      
      db.products.push(newProduct);
      return newProduct;
    });
    
    res.status(201).json(product);
  } catch (error) {
    if (error.message === 'Product ID already exists') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    
    const product = await withDB(async (db) => {
      const index = db.products.findIndex(p => p.id === req.params.id);
      
      if (index === -1) {
        return null;
      }
      
      const existing = db.products[index];
      const updated = {
        ...existing,
        ...req.body,
        id: req.params.id // Ensure ID doesn't change
      };
      
      db.products[index] = updated;
      return updated;
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:id/adjust
router.post('/:id/adjust', async (req, res) => {
  try {
    const errors = validateStockAdjustment(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    
    const result = await withDB(async (db) => {
      const product = db.products.find(p => p.id === req.params.id);
      
      if (!product) {
        return null;
      }
      
      const { change, reason = 'correction', unit_cost, reference, user = 'system' } = req.body;
      
      // Update stock
      const newStock = product.stock + change;
      if (newStock < 0) {
        throw new Error('Stock cannot be negative');
      }
      
      product.stock = newStock;
      
      // Update unit_cost if provided
      if (unit_cost !== undefined) {
        product.unit_cost = unit_cost;
      }
      
      // Update lastRestock if it's a restock
      if (reason === 'restock') {
        product.lastRestock = new Date().toISOString();
      }
      
      // Record adjustment
      const adjustment = {
        id: `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: req.params.id,
        date: new Date().toISOString(),
        quantity: change,
        reason,
        reference: reference || '',
        unitCost: unit_cost,
        user
      };
      
      db.inventoryAdjustments.push(adjustment);
      
      return { product, adjustment };
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.product);
  } catch (error) {
    if (error.message === 'Stock cannot be negative') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

