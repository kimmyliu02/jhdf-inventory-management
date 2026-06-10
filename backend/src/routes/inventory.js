// backend/src/routes/inventory.js
import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/inventory — all stock totals
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        l.product_id,
        l.product_name,
        l.batch_no,
        SUM(l.qty_change) AS qty,
        p.spec,
        p.unit,
        p.type
      FROM inventory_ledger l
      JOIN products p ON p.id = l.product_id
      GROUP BY l.product_id, l.product_name, l.batch_no, p.spec, p.unit, p.type
      HAVING SUM(l.qty_change) > 0
      ORDER BY p.type, l.product_name, l.batch_no
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// GET /api/inventory/:productId/:batchNo
router.get('/:productId/:batchNo', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COALESCE(SUM(qty_change), 0) AS qty FROM inventory_ledger WHERE product_id = ? AND batch_no = ?',
      [req.params.productId, req.params.batchNo]
    )
    res.json({ qty: Number(rows[0].qty) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
