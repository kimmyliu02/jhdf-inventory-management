// backend/src/routes/processing.js
import { Router } from 'express'
import { pool, withTransaction } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function genNo(prefix) {
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'')
  return `${prefix}-${d}-${Math.floor(Math.random()*9000+1000)}`
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
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

router.post('/', requireAuth, requireRole('warehouse'), async (req, res) => {
  const { in_product_id, in_product_name, in_batch_no, in_qty,
          out_product_id, out_product_name, out_batch_no, out_qty, note } = req.body

  if (!in_product_id || !in_batch_no || !in_qty || !out_product_id || !out_qty) {
    return res.status(400).json({ error: '缺少必填字段' })
  }

  try {
    await withTransaction(async (conn) => {
      const [stockRows] = await conn.query(
        'SELECT COALESCE(SUM(qty_change), 0) AS qty FROM inventory_ledger WHERE product_id = ? AND batch_no = ?',
        [in_product_id, in_batch_no]
      )
      const stock = Number(stockRows[0].qty)
      if (in_qty > stock) throw Object.assign(new Error(`原料库存不足（当前 ${stock}）`), { status: 400 })

      const proc_no = genNo('FZ')
      const actual_out_batch = out_batch_no || genNo('FZ').slice(3)

      await conn.query(
        `INSERT INTO processing_orders
          (proc_no, in_product_id, in_product_name, in_batch_no, in_qty,
           out_product_id, out_product_name, out_batch_no, out_qty, note, created_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [proc_no, in_product_id, in_product_name, in_batch_no, in_qty,
         out_product_id, out_product_name, actual_out_batch, out_qty, note || '', req.user.id]
      )

      await conn.query(
        `INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
         VALUES (?,?,?,'process_consume',?,?,?,?)`,
        [in_product_id, in_product_name, in_batch_no, -in_qty, proc_no, note || '', req.user.id]
      )

      await conn.query(
        `INSERT INTO inventory_ledger
          (product_id, product_name, batch_no, type, qty_change, ref_no, note, created_by)
         VALUES (?,?,?,'process_produce',?,?,?,?)`,
        [out_product_id, out_product_name, actual_out_batch, out_qty, proc_no, note || '', req.user.id]
      )

      res.json({ proc_no, message: '加工记录已提交' })
    })
  } catch (err) {
    console.error(err)
    res.status(err.status || 500).json({ error: err.message || '服务器错误' })
  }
})

export default router
