// backend/src/routes/purchaseOrders.js
import { Router } from 'express'
import { pool, withTransaction } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function genNo(prefix) {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'')
  return `${prefix}-${d}-${Math.floor(Math.random()*9000+1000)}`
}

// GET /api/purchase-orders
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    let sql = `
      SELECT po.*, u.name AS created_by_name
      FROM purchase_orders po
      LEFT JOIN users u ON u.id = po.created_by
    `
    const params = []
    if (status) { sql += ' WHERE po.status = ?'; params.push(status) }
    sql += ' ORDER BY po.created_at DESC'
    const [rows] = await pool.query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/purchase-orders
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
  const { product_id, product_name, spec, unit, qty, batch_no, shipper, expected_date, note } = req.body
  if (!product_id || !qty || !batch_no || !shipper) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  try {
    const order_no = genNo('PO')
    await pool.query(
      `INSERT INTO purchase_orders
        (order_no, product_id, product_name, spec, unit, qty, batch_no, shipper, expected_date, note, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [order_no, product_id, product_name, spec, unit, qty, batch_no, shipper, expected_date || null, note || '', req.user.id]
    )
    const [rows] = await pool.query('SELECT * FROM purchase_orders WHERE order_no = ?', [order_no])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/purchase-orders/:id/inbound
router.post('/:id/inbound', requireAuth, requireRole('warehouse'), async (req, res) => {
  const { qty_actual, location, note } = req.body
  if (!qty_actual) return res.status(400).json({ error: '请填写实收数量' })

  try {
    await withTransaction(async (conn) => {
      const [poRows] = await conn.query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id])
      const po = poRows[0]
      if (!po) throw Object.assign(new Error('采购单不存在'), { status: 404 })
      if (po.status === 'done') throw Object.assign(new Error('该采购单已完成入库'), { status: 400 })

      const inbound_no = genNo('IN')

      await conn.query(
        `INSERT INTO inbound_records
          (inbound_no, purchase_order_id, product_id, product_name, batch_no, qty_ordered, qty_actual, location, note, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [inbound_no, po.id, po.product_id, po.product_name, po.batch_no, po.qty, qty_actual, location || '', note || '', req.user.id]
      )

      await conn.query(
        `INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
         VALUES (?,?,?,'inbound',?,?,?,?)`,
        [po.product_id, po.product_name, po.batch_no, qty_actual, inbound_no, note || '', req.user.id]
      )

      await conn.query("UPDATE purchase_orders SET status = 'done' WHERE id = ?", [po.id])

      res.json({ inbound_no, message: '入库成功' })
    })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || '服务器错误' })
  }
})

export default router
