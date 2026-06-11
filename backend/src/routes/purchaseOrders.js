// backend/src/routes/purchaseOrders.js

import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

async function genDailyNo(clientOrPool, prefix, tableName, columnName) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const likePattern = `${prefix}-${d}-%`

  const { rows } = await clientOrPool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM ${tableName}
    WHERE ${columnName} LIKE $1
    `,
    [likePattern]
  )

  const nextNum = rows[0].count + 1
  const seq = String(nextNum).padStart(4, '0')

  return `${prefix}-${d}-${seq}`
}

// GET /api/purchase-orders?status=pending
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query
    const { rows } = await pool.query(`
      SELECT po.*, u.name AS created_by_name
      FROM purchase_orders po
      LEFT JOIN users u ON u.id = po.created_by
      ${status ? 'WHERE po.status = $1' : ''}
      ORDER BY po.created_at DESC
    `, status ? [status] : [])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/purchase-orders — company creates order
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
  const { product_id, product_name, spec, unit, qty, batch_no, shipper, expected_date, note } = req.body
  if (!product_id || !qty || !batch_no || !shipper) {
    return res.status(400).json({ error: '缺少必填字段' })
  }
  try {
    const order_no = await genDailyNo(pool, 'PO', 'purchase_orders', 'order_no')
    const { rows } = await pool.query(`
      INSERT INTO purchase_orders
        (order_no, product_id, product_name, spec, unit, qty, batch_no, shipper, expected_date, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [order_no, product_id, product_name, spec, unit, qty, batch_no, shipper, expected_date || null, note || '', req.user.id])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/purchase-orders/:id/inbound — warehouse confirms inbound
router.post('/:id/inbound', requireAuth, requireRole('warehouse'), async (req, res) => {
  const { qty_actual, location, note } = req.body
  if (!qty_actual) return res.status(400).json({ error: '请填写实收数量' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Get the purchase order
    const { rows: poRows } = await client.query(
      'SELECT * FROM purchase_orders WHERE id = $1', [req.params.id]
    )
    const po = poRows[0]
    if (!po) return res.status(404).json({ error: '采购单不存在' })
    if (po.status === 'done') return res.status(400).json({ error: '该采购单已完成入库' })

    const inbound_no = await genDailyNo(client, 'IN', 'inbound_records', 'inbound_no')

    // Create inbound record
    await client.query(`
      INSERT INTO inbound_records
        (inbound_no, purchase_order_id, product_id, product_name, batch_no, qty_ordered, qty_actual, location, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [inbound_no, po.id, po.product_id, po.product_name, po.batch_no, po.qty, qty_actual, location || '', note || '', req.user.id])

    // Write inventory ledger
    await client.query(`
      INSERT INTO inventory_ledger
        (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
      VALUES ($1,$2,$3,'inbound',$4,$5,$6,$7)
    `, [po.product_id, po.product_name, po.batch_no, qty_actual, inbound_no, note || '', req.user.id])

    // Update purchase order status
    await client.query(
      "UPDATE purchase_orders SET status = 'done' WHERE id = $1", [po.id]
    )

    await client.query('COMMIT')
    res.json({ inbound_no, message: '入库成功' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  } finally {
    client.release()
  }
})

// DELETE /api/purchase-orders/:id — cancel pending purchase order
router.delete('/:id', requireAuth, requireRole('company', 'warehouse'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM purchase_orders WHERE id = $1`,
      [req.params.id]
    )

    const po = rows[0]
    if (!po) return res.status(404).json({ error: '采购单不存在' })

    if (po.status !== 'pending') {
      return res.status(400).json({ error: '只有待入库采购单可以取消' })
    }

    await pool.query(
      `UPDATE purchase_orders SET status = 'cancelled' WHERE id = $1`,
      [req.params.id]
    )

    res.json({ message: '采购单已取消' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
