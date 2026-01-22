import express from 'express';
import { withTransaction, query } from '../lib/db.js';
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

    const result = await withTransaction(async (client) => {
      const productChecks = [];

      for (const item of items) {
        const productRes = await client.query(
          'SELECT * FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );
        const product = productRes.rows[0];

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        productChecks.push({
          product,
          item,
          newStock: product.stock - item.quantity,
        });
      }

      let transactionTotal = 0;
      for (const { product, item } of productChecks) {
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.price;
        transactionTotal += unitPrice * item.quantity;
      }

      if (paymentMethod === 'student_balance' && studentId) {
        const studentRes = await client.query(
          'SELECT * FROM students WHERE id = $1 FOR UPDATE',
          [studentId]
        );
        const student = studentRes.rows[0];

        if (!student) {
          throw new Error(`Student ${studentId} not found`);
        }

        if (Number(student.balance) < transactionTotal) {
          throw new Error(
            `Insufficient student balance. Available: $${Number(student.balance).toFixed(
              2
            )}, Required: $${transactionTotal.toFixed(2)}`
          );
        }
      }

      const transactionId = `TX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transactionTimestamp = timestamp || new Date().toISOString();

      let total = 0;
      const transactionItems = [];

      for (const { product, item } of productChecks) {
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : product.price;
        const lineTotal = unitPrice * item.quantity;
        total += lineTotal;

        await client.query('UPDATE products SET stock = $2 WHERE id = $1', [
          product.id,
          product.stock - item.quantity,
        ]);

        const transactionItemId = `TI-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        transactionItems.push({
          id: transactionItemId,
          transactionId,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          unitCostAtSale: product.unit_cost || 0,
          lineTotal,
        });
      }

      if (paymentMethod === 'student_balance' && studentId) {
        await client.query('UPDATE students SET balance = balance - $2 WHERE id = $1', [
          studentId,
          total,
        ]);
      }

      await client.query(
        `INSERT INTO transactions (
          id, student_id, student_name, total, payment_method, timestamp
        ) VALUES (
          $1,$2,$3,$4,$5,$6
        )`,
        [transactionId, studentId || null, studentName || null, total, paymentMethod, transactionTimestamp]
      );

      for (const item of transactionItems) {
        await client.query(
          `INSERT INTO transaction_items (
            id, transaction_id, product_id, product_name, quantity,
            unit_price, unit_cost_at_sale, line_total
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8
          )`,
          [
            item.id,
            item.transactionId,
            item.productId,
            item.productName,
            item.quantity,
            item.unitPrice,
            item.unitCostAtSale,
            item.lineTotal,
          ]
        );
      }

      return {
        transaction: {
          id: transactionId,
          studentId: studentId || null,
          studentName: studentName || null,
          total,
          paymentMethod,
          timestamp: transactionTimestamp,
          items: transactionItems,
        },
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
    const params = [];
    const whereClauses = [];

    if (req.query.studentId) {
      params.push(req.query.studentId);
      whereClauses.push(`student_id = $${params.length}`);
    }

    if (req.query.start) {
      params.push(req.query.start);
      whereClauses.push(`timestamp >= $${params.length}`);
    }

    if (req.query.end) {
      params.push(req.query.end);
      whereClauses.push(`timestamp <= $${params.length}`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const txs = await query(
      `SELECT * FROM transactions ${whereSql} ORDER BY timestamp DESC`,
      params
    );

    if (txs.length === 0) {
      return res.json([]);
    }

    const txIds = txs.map((t) => t.id);
    const items = await query(
      `SELECT * FROM transaction_items WHERE transaction_id = ANY($1::text[])`,
      [txIds]
    );

    const grouped = txs.map((tx) => ({
      ...tx,
      items: items.filter((i) => i.transaction_id === tx.id),
    }));

    res.json(grouped);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

