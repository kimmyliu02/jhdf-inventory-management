// backend/src/routes/history.js
import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/inbound', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ir.*, u.name AS created_by_name,
             po.order_no AS purchase_order_no, po.shipper
      FROM inbound_records ir
      LEFT JOIN users u ON u.id = ir.created_by
      LEFT JOIN purchase_orders po ON po.id = ir.purchase_order_id
      ORDER BY ir.created_at DESC
      LIMIT 100
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

router.get('/outbound', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ob.*, u.name AS created_by_name,
             so.order_no AS sales_order_no, so.buyer
      FROM outbound_records ob
      LEFT JOIN users u ON u.id = ob.created_by
      LEFT JOIN sales_orders so ON so.id = ob.sales_order_id
      ORDER BY ob.created_at DESC
      LIMIT 100
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

router.get('/processing', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pr.*, u.name AS created_by_name
      FROM processing_orders pr
      LEFT JOIN users u ON u.id = pr.created_by
      ORDER BY pr.created_at DESC
      LIMIT 100
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
