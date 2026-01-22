import express from 'express';
import { query, withTransaction } from '../lib/db.js';
import { validateProduct, validateStockAdjustment } from '../lib/validators.js';

const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products ORDER BY name ASC');
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    const product = rows[0];

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

    const {
      name,
      sku,
      price,
      unit_cost,
      stock = 0,
      category,
      description,
      reorderLevel,
      supplier,
      barcode,
    } = req.body;

    const id = req.body.id || `P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const rows = await query(
      `INSERT INTO products (
        id, sku, name, price, unit_cost, stock, category, description,
        reorder_level, supplier, barcode, last_restock
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING *`,
      [
        id,
        sku || '',
        name || '',
        price || 0,
        unit_cost || 0,
        stock || 0,
        category || '',
        description || '',
        reorderLevel || 0,
        supplier || '',
        barcode || '',
        null,
      ]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Product ID already exists' });
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

    const existingRows = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const existing = existingRows[0];

    const updated = {
      ...existing,
      ...req.body,
      id: req.params.id,
    };

    const rows = await query(
      `UPDATE products SET
        sku = $2,
        name = $3,
        price = $4,
        unit_cost = $5,
        stock = $6,
        category = $7,
        description = $8,
        reorder_level = $9,
        supplier = $10,
        barcode = $11,
        last_restock = $12
      WHERE id = $1
      RETURNING *`,
      [
        updated.id,
        updated.sku || '',
        updated.name || '',
        updated.price || 0,
        updated.unit_cost || 0,
        updated.stock || 0,
        updated.category || '',
        updated.description || '',
        updated.reorderLevel || 0,
        updated.supplier || '',
        updated.barcode || '',
        updated.lastRestock || null,
      ]
    );

    res.json(rows[0]);
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

    const { change, reason = 'correction', unit_cost, reference, user = 'system' } = req.body;

    const updatedProduct = await withTransaction(async (client) => {
      const productRes = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );
      const product = productRes.rows[0];

      if (!product) {
        return null;
      }

      const newStock = Number(product.stock) + Number(change);
      if (newStock < 0) {
        throw new Error('Stock cannot be negative');
      }

      let lastRestock = product.last_restock;
      if (reason === 'restock') {
        lastRestock = new Date().toISOString();
      }

      const updatedRes = await client.query(
        `UPDATE products SET
          stock = $2,
          unit_cost = COALESCE($3, unit_cost),
          last_restock = $4
        WHERE id = $1
        RETURNING *`,
        [req.params.id, newStock, unit_cost, lastRestock]
      );

      const adjustmentId = `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await client.query(
        `INSERT INTO inventory_adjustments (
          id, product_id, date, quantity, reason, reference, unit_cost, "user"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8
        )`,
        [
          adjustmentId,
          req.params.id,
          new Date().toISOString(),
          change,
          reason,
          reference || '',
          unit_cost ?? null,
          user,
        ]
      );

      return updatedRes.rows[0];
    });

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(updatedProduct);
  } catch (error) {
    if (error.message === 'Stock cannot be negative') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

