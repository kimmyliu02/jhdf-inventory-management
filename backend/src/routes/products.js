// backend/src/routes/products.js

import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// GET /api/products — all active products
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE is_active = TRUE ORDER BY type, name'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/products — create product
router.post('/', requireAuth, requireRole('company'), async (req, res) => {
  const { name, spec, unit, unit_alt1, unit_alt2, type } = req.body

  if (!name || !spec || !unit || !type) {
    return res.status(400).json({ error: '请填写品名、规格、单位和类型' })
  }

  if (!['raw', 'packed'].includes(type)) {
    return res.status(400).json({ error: '商品类型不正确' })
  }

  try {
    const { rows: existing } = await pool.query(
      `
      SELECT *
      FROM products
      WHERE name = $1
        AND spec = $2
        AND unit = $3
        AND type = $4
        AND is_active = TRUE
      LIMIT 1
      `,
      [name.trim(), spec.trim(), unit.trim(), type]
    )

    if (existing.length > 0) {
      return res.status(400).json({ error: '该品名/规格/单位已存在' })
    }

    const { rows } = await pool.query(
      `
      INSERT INTO products
        (name, spec, unit, unit_alt1, unit_alt2, type)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        name.trim(),
        spec.trim(),
        unit.trim(),
        unit_alt1?.trim?.() || null,
        unit_alt2?.trim?.() || null,
        type,
      ]
    )

    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
