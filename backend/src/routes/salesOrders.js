// backend/src/routes/salesOrders.js

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

    const ids = rows.map(r => r.id)
    if (ids.length === 0) return res.json([])

    const { rows: batchRows } = await pool.query(`
      SELECT sales_order_id, batch_no, qty
      FROM sales_order_batches
      WHERE sales_order_id = ANY($1::int[])
      ORDER BY id ASC
    `, [ids])

    const batchMap = {}
    for (const b of batchRows) {
      if (!batchMap[b.sales_order_id]) batchMap[b.sales_order_id] = []
      batchMap[b.sales_order_id].push({
        batch_no: b.batch_no,
        qty: Number(b.qty),
      })
    }

    res.json(rows.map(r => ({
      ...r,
      batches: batchMap[r.id] || [
        { batch_no: r.batch_no, qty: Number(r.qty) },
      ],
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/sales-orders — company creates sales order
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
  const { product_id, product_name, unit, qty, batch_no, batches, buyer, note } = req.body
  const batchList = Array.isArray(batches) && batches.length > 0
    ? batches
    : [{ batch_no, qty }]
  if (!product_id || !buyer || batchList.length === 0) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  if (batchList.length > 3) {
    return res.status(400).json({ error: '最多只能选择 3 个批次' })
  }

  for (const b of batchList) {
    if (!b.batch_no || !Number(b.qty) || Number(b.qty) <= 0) {
      return res.status(400).json({ error: '请完整填写每个批次和数量' })
    }
  }
  try {
    const totalQty = batchList.reduce((sum, b) => sum + Number(b.qty), 0)

    for (const b of batchList) {
      const { rows: stockRows } = await pool.query(`
        SELECT COALESCE(SUM(qty_change), 0)::NUMERIC AS qty
        FROM inventory_ledger
        WHERE product_id = $1 AND batch_no = $2
      `, [product_id, b.batch_no])

      const stock = Number(stockRows[0].qty)
      if (Number(b.qty) > stock) {
        return res.status(400).json({
          error: `批次 ${b.batch_no} 库存不足（当前 ${stock} ${unit}）`
        })
      }
    }

    const order_no = genNo('SO')
    const mainBatchNo = batchList.map(b => b.batch_no).join(' / ')

    const { rows } = await pool.query(`
      INSERT INTO sales_orders
        (order_no, product_id, product_name, unit, qty, batch_no, buyer, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [order_no, product_id, product_name, unit, totalQty, mainBatchNo, buyer, note || '', req.user.id])

    const order = rows[0]

    for (const b of batchList) {
      await pool.query(`
        INSERT INTO sales_order_batches
          (sales_order_id, product_id, batch_no, qty)
        VALUES ($1,$2,$3,$4)
      `, [order.id, product_id, b.batch_no, Number(b.qty)])
    }

    res.status(201).json({
      ...order,
      batches: batchList.map(b => ({
        batch_no: b.batch_no,
        qty: Number(b.qty),
      })),
    })
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
    const { rows: batchRows } = await client.query(`
      SELECT batch_no, qty
      FROM sales_order_batches
      WHERE sales_order_id = $1
      ORDER BY id ASC
    `, [so.id])

    const batchList = batchRows.length > 0
      ? batchRows
      : [{ batch_no: so.batch_no, qty: so.qty }]

    const totalQty = batchList.reduce((sum, b) => sum + Number(b.qty), 0)
    if (Number(qty_actual) !== Number(totalQty)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: `实发数量必须等于销售单总数量 ${totalQty} ${so.unit}` })
    }

    for (const b of batchList) {
      const { rows: stockRows } = await client.query(`
        SELECT COALESCE(SUM(qty_change), 0)::NUMERIC AS qty
        FROM inventory_ledger
        WHERE product_id = $1 AND batch_no = $2
      `, [so.product_id, b.batch_no])

      const stock = Number(stockRows[0].qty)
      if (Number(b.qty) > stock) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `批次 ${b.batch_no} 库存不足（当前 ${stock} ${so.unit}）`
        })
      }
    }

    const outbound_no = await genDailyNo(client, 'OUT', 'outbound_records', 'outbound_no')

    await client.query(`
      INSERT INTO outbound_records
        (outbound_no, sales_order_id, product_id, product_name, batch_no, qty_ordered, qty_actual, transport, driver, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [outbound_no, so.id, so.product_id, so.product_name, so.batch_no, so.qty, qty_actual, transport || '', driver || '', note || '', req.user.id])

    for (const b of batchList) {
      await client.query(`
        INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
        VALUES ($1,$2,$3,'outbound',$4,$5,$6,$7)
      `, [so.product_id, so.product_name, b.batch_no, -Number(b.qty), outbound_no, note || '', req.user.id])
    }

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

// DELETE /api/sales-orders/:id — cancel pending sales order
router.delete('/:id', requireAuth, requireRole('company'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM sales_orders WHERE id = $1`,
      [req.params.id]
    )

    const so = rows[0]
    if (!so) return res.status(404).json({ error: '销售单不存在' })

    if (so.status !== 'pending') {
      return res.status(400).json({ error: '只有待出库销售单可以取消' })
    }

    await pool.query(
      `UPDATE sales_orders SET status = 'cancelled' WHERE id = $1`,
      [req.params.id]
    )

    res.json({ message: '销售单已取消' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
