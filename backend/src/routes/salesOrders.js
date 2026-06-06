// backend/src/routes/salesOrders.js

import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function genNo(prefix) {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'')
  return `${prefix}-${d}-${Math.floor(Math.random()*9000+1000)}`
}

// GET /api/sales-orders?status=pending
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    const { rows } = await pool.query(`
      SELECT so.*, u.name AS created_by_name
      FROM sales_orders so
      LEFT JOIN users u ON u.id = so.created_by
      ${status ? 'WHERE so.status = $1' : ''}
      ORDER BY so.created_at DESC
    `, status ? [status] : [])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/sales-orders — company creates sales order
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
  const { product_id, product_name, unit, qty, batch_no, buyer, note } = req.body
  if (!product_id || !qty || !batch_no || !buyer) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  try {
    // Check stock
    const { rows: stockRows } = await pool.query(`
      SELECT COALESCE(SUM(qty_change), 0)::NUMERIC AS qty
      FROM inventory_ledger
      WHERE product_id = $1 AND batch_no = $2
    `, [product_id, batch_no])
    const stock = Number(stockRows[0].qty)
    if (qty > stock) {
      return res.status(400).json({ error: `库存不足（当前 ${stock} ${unit}）` })
    }

    const order_no = genNo('SO')
    const { rows } = await pool.query(`
      INSERT INTO sales_orders
        (order_no, product_id, product_name, unit, qty, batch_no, buyer, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [order_no, product_id, product_name, unit, qty, batch_no, buyer, note || '', req.user.id])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/sales-orders/:id/outbound — warehouse confirms outbound
router.post('/:id/outbound', requireAuth, requireRole('warehouse'), async (req, res) => {
  const { qty_actual, transport, driver, note } = req.body
  if (!qty_actual) return res.status(400).json({ error: '请填写实发数量' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: soRows } = await client.query(
      'SELECT * FROM sales_orders WHERE id = $1', [req.params.id]
    )
    const so = soRows[0]
    if (!so) return res.status(404).json({ error: '销售单不存在' })
    if (so.status === 'done') return res.status(400).json({ error: '该销售单已完成出库' })

    // Check stock again at time of outbound
    const { rows: stockRows } = await client.query(`
      SELECT COALESCE(SUM(qty_change), 0)::NUMERIC AS qty
      FROM inventory_ledger WHERE product_id = $1 AND batch_no = $2
    `, [so.product_id, so.batch_no])
    const stock = Number(stockRows[0].qty)
    if (qty_actual > stock) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: `库存不足（当前 ${stock} ${so.unit}）` })
    }

    const outbound_no = genNo('OUT')

    await client.query(`
      INSERT INTO outbound_records
        (outbound_no, sales_order_id, product_id, product_name, batch_no, qty_ordered, qty_actual, transport, driver, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [outbound_no, so.id, so.product_id, so.product_name, so.batch_no, so.qty, qty_actual, transport || '', driver || '', note || '', req.user.id])

    await client.query(`
      INSERT INTO inventory_ledger
        (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
      VALUES ($1,$2,$3,'outbound',$4,$5,$6,$7)
    `, [so.product_id, so.product_name, so.batch_no, -qty_actual, outbound_no, note || '', req.user.id])

    await client.query("UPDATE sales_orders SET status = 'done' WHERE id = $1", [so.id])

    await client.query('COMMIT')
    res.json({ outbound_no, message: '出库成功' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  } finally {
    client.release()
  }
})

export default router
