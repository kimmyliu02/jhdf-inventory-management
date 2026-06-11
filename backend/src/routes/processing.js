// backend/src/routes/processing.js

import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function genNo(prefix) {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'')
  return `${prefix}-${d}-${Math.floor(Math.random()*9000+1000)}`
}

// GET /api/processing — history
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pr.*, u.name AS created_by_name
      FROM processing_orders pr
      LEFT JOIN users u ON u.id = pr.created_by
      ORDER BY pr.created_at DESC
      LIMIT 50
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/processing — warehouse submits processing record
router.post('/', requireAuth, requireRole('warehouse'), async (req, res) => {
  const {
    in_product_id, in_product_name, in_batch_no, in_qty, input_batches,
    out_product_id, out_product_name, out_batch_no, out_qty,
    note,
  } = req.body

  const inputBatchList = Array.isArray(input_batches) && input_batches.length > 0
    ? input_batches
    : [{ batch_no: in_batch_no, qty: in_qty }]

  if (!in_product_id || inputBatchList.length === 0 || !out_product_id || !out_qty) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  if (inputBatchList.length > 3) {
    return res.status(400).json({ error: '最多只能选择 3 个原料批次' })
  }

  for (const b of inputBatchList) {
    if (!b.batch_no || !Number(b.qty) || Number(b.qty) <= 0) {
      return res.status(400).json({ error: '请完整填写每个原料批次和数量' })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const b of inputBatchList) {
      const { rows: stockRows } = await client.query(`
        SELECT COALESCE(SUM(qty_change), 0)::NUMERIC AS qty
        FROM inventory_ledger
        WHERE product_id = $1 AND batch_no = $2
      `, [in_product_id, b.batch_no])

      const stock = Number(stockRows[0].qty)
      if (Number(b.qty) > stock) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `原料批次 ${b.batch_no} 库存不足（当前 ${stock}）`
        })
      }
    }

    const proc_no = genNo('FZ')
    const actual_out_batch = out_batch_no || genNo('FZ').slice(3)
    const totalInQty = inputBatchList.reduce((sum, b) => sum + Number(b.qty), 0)
    const mainInBatchNo = inputBatchList.map(b => b.batch_no).join(' / ')

    await client.query(`
      INSERT INTO processing_orders
        (proc_no, in_product_id, in_product_name, in_batch_no, in_qty,
         out_product_id, out_product_name, out_batch_no, out_qty, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [proc_no, in_product_id, in_product_name, mainInBatchNo, totalInQty,
        out_product_id, out_product_name, actual_out_batch, out_qty, note || '', req.user.id])

    const { rows: procRows } = await client.query(
      `SELECT id FROM processing_orders WHERE proc_no = $1`,
      [proc_no]
    )
    const processingOrderId = procRows[0].id

    for (const b of inputBatchList) {
      await client.query(`
        INSERT INTO processing_input_batches
          (processing_order_id, product_id, product_name, batch_no, qty)
        VALUES ($1,$2,$3,$4,$5)
      `, [processingOrderId, in_product_id, in_product_name, b.batch_no, Number(b.qty)])
    }
    
    for (const b of inputBatchList) {
      await client.query(`
        INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
        VALUES ($1,$2,$3,'process_consume',$4,$5,$6,$7)
      `, [in_product_id, in_product_name, b.batch_no, -Number(b.qty), proc_no, note || '', req.user.id])
    }

    // Produce packed product
    await client.query(`
      INSERT INTO inventory_ledger
        (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
      VALUES ($1,$2,$3,'process_produce',$4,$5,$6,$7)
    `, [out_product_id, out_product_name, actual_out_batch, out_qty, proc_no, note || '', req.user.id])

    await client.query('COMMIT')
    res.json({ proc_no, message: '加工记录已提交' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  } finally {
    client.release()
  }
})

export default router
