// backend/src/routes/products.js
import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY type, name'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router