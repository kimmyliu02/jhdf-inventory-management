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
    input_items,
    output_product_id,
    output_product_name,
    output_batches,
    note,
  } = req.body

  const inputItems = Array.isArray(input_items) ? input_items : []
  const outputBatches = Array.isArray(output_batches) ? output_batches : []

  if (inputItems.length === 0 || outputBatches.length === 0 || !output_product_id) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  const uniqueInputProducts = new Set(inputItems.map(i => String(i.product_id)))

  if (uniqueInputProducts.size > 5) {
    return res.status(400).json({ error: '原料品名最多选择 5 种' })
  }

  if (outputBatches.length > 3) {
    return res.status(400).json({ error: '成品批次最多 3 个' })
  }

  if (outputBatches.length < 1) {
    return res.status(400).json({ error: '至少填写 1 个成品批次' })
  }

  for (const item of inputItems) {
    if (!item.product_id || !item.product_name || !item.batch_no || !Number(item.qty) || Number(item.qty) <= 0) {
      return res.status(400).json({ error: '请完整填写每个原料批次和消耗数量' })
    }
  }

  for (const item of outputBatches) {
    if (!item.batch_no || !Number(item.qty) || Number(item.qty) <= 0) {
      return res.status(400).json({ error: '请完整填写每个成品批次和产出数量' })
    }
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const item of inputItems) {
      const { rows: stockRows } = await client.query(`
        SELECT COALESCE(SUM(qty_change), 0)::NUMERIC AS qty
        FROM inventory_ledger
        WHERE product_id = $1 AND batch_no = $2
      `, [item.product_id, item.batch_no])

      const stock = Number(stockRows[0].qty)

      if (Number(item.qty) > stock) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          error: `原料 ${item.product_name} 批次 ${item.batch_no} 库存不足（当前 ${stock}）`
        })
      }
    }

    const proc_no = genNo('FZ')

    const totalInQty = inputItems.reduce((sum, item) => sum + Number(item.qty), 0)
    const totalOutQty = outputBatches.reduce((sum, item) => sum + Number(item.qty), 0)

    const inputProductSummary = [...new Set(inputItems.map(i => i.product_name))].join(' / ')
    const inputBatchSummary = inputItems.map(i => `${i.product_name}:${i.batch_no}×${i.qty}`).join('，')
    const outputBatchSummary = outputBatches.map(i => `${i.batch_no}×${i.qty}`).join('，')

    await client.query(`
      INSERT INTO processing_orders
        (proc_no, in_product_id, in_product_name, in_batch_no, in_qty,
         out_product_id, out_product_name, out_batch_no, out_qty, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      proc_no,
      inputItems[0].product_id,
      inputProductSummary,
      inputBatchSummary,
      totalInQty,
      output_product_id,
      output_product_name,
      outputBatchSummary,
      totalOutQty,
      note || '',
      req.user.id,
    ])

    const { rows: procRows } = await client.query(
      `SELECT id FROM processing_orders WHERE proc_no = $1`,
      [proc_no]
    )

    const processingOrderId = procRows[0].id

    for (const item of inputItems) {
      await client.query(`
        INSERT INTO processing_input_batches
          (processing_order_id, product_id, product_name, batch_no, qty)
        VALUES ($1,$2,$3,$4,$5)
      `, [
        processingOrderId,
        item.product_id,
        item.product_name,
        item.batch_no,
        Number(item.qty),
      ])

      await client.query(`
        INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
        VALUES ($1,$2,$3,'process_consume',$4,$5,$6,$7)
      `, [
        item.product_id,
        item.product_name,
        item.batch_no,
        -Number(item.qty),
        proc_no,
        note || '',
        req.user.id,
      ])
    }

    for (const item of outputBatches) {
      await client.query(`
        INSERT INTO processing_output_batches
          (processing_order_id, product_id, product_name, batch_no, qty)
        VALUES ($1,$2,$3,$4,$5)
      `, [
        processingOrderId,
        output_product_id,
        output_product_name,
        item.batch_no,
        Number(item.qty),
      ])

      await client.query(`
        INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
        VALUES ($1,$2,$3,'process_produce',$4,$5,$6,$7)
      `, [
        output_product_id,
        output_product_name,
        item.batch_no,
        Number(item.qty),
        proc_no,
        note || '',
        req.user.id,
      ])
    }

    await client.query('COMMIT')

    res.status(201).json({
      proc_no,
      message: '分装加工完成',
      input_items: inputItems,
      output_batches: outputBatches,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  } finally {
    client.release()
  }
})

export default router
