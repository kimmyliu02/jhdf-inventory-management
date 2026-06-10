// backend/src/routes/salesOrders.js
import { Router } from 'express'
import { pool, withTransaction } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function genNo(prefix) {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'')
  return `${prefix}-${d}-${Math.floor(Math.random()*9000+1000)}`
}

// GET /api/sales-orders
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT so.*, u.name AS created_by_name
      FROM sales_orders so
      LEFT JOIN users u ON u.id = so.created_by
    `
    const params = []
    if (status) { sql += ' WHERE so.status = ?'; params.push(status) }
    sql += ' ORDER BY so.created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/sales-orders
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
  const { product_id, product_name, unit, qty, batch_no, buyer, note } = req.body
  if (!product_id || !qty || !batch_no || !buyer) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  try {
    // Check stock
    const [stockRows] = await pool.query(
      'SELECT COALESCE(SUM(qty_change), 0) AS qty FROM inventory_ledger WHERE product_id = ? AND batch_no = ?',
      [product_id, batch_no]
    )
    const stock = Number(stockRows[0].qty)
    if (qty > stock) return res.status(400).json({ error: `库存不足（当前 ${stock} ${unit}）` })

    const order_no = genNo('SO')
    await pool.query(
      `INSERT INTO sales_orders
        (order_no, product_id, product_name, unit, qty, batch_no, buyer, note, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [order_no, product_id, product_name, unit, qty, batch_no, buyer, note || '', req.user.id]
    )
    const [rows] = await pool.query('SELECT * FROM sales_orders WHERE order_no = ?', [order_no])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || '服务器错误' })
  }
})

// POST /api/sales-orders/:id/outbound
router.post('/:id/outbound', requireAuth, requireRole('warehouse'), async (req, res) => {
  const { qty_actual, transport, driver, note } = req.body
  if (!qty_actual) return res.status(400).json({ error: '请填写实发数量' })

  try {
    await withTransaction(async (conn) => {
      const [soRows] = await conn.query('SELECT * FROM sales_orders WHERE id = ?', [req.params.id])
      const so = soRows[0]
      if (!so) throw Object.assign(new Error('销售单不存在'), { status: 404 })
      if (so.status === 'done') throw Object.assign(new Error('该销售单已完成出库'), { status: 400 })

      const [stockRows] = await conn.query(
        'SELECT COALESCE(SUM(qty_change), 0) AS qty FROM inventory_ledger WHERE product_id = ? AND batch_no = ?',
        [so.product_id, so.batch_no]
      )
      const stock = Number(stockRows[0].qty)
      if (qty_actual > stock) throw Object.assign(new Error(`库存不足（当前 ${stock} ${so.unit}）`), { status: 400 })

      const outbound_no = genNo('OUT')

      await conn.query(
        `INSERT INTO outbound_records
          (outbound_no, sales_order_id, product_id, product_name, batch_no, qty_ordered, qty_actual, transport, driver, note, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [outbound_no, so.id, so.product_id, so.product_name, so.batch_no, so.qty, qty_actual, transport || '', driver || '', note || '', req.user.id]
      )

      await conn.query(
        `INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
         VALUES (?,?,?,'outbound',?,?,?,?)`,
        [so.product_id, so.product_name, so.batch_no, -qty_actual, outbound_no, note || '', req.user.id]
      )

      await conn.query("UPDATE sales_orders SET status = 'done' WHERE id = ?", [so.id])

      res.json({ outbound_no, message: '出库成功' })
    })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || '服务器错误' })
  }
})

export default router
