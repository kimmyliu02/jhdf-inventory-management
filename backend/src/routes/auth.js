// backend/src/routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '请填写用户名和密码' })
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username.trim()])
    const user = rows[0]
    if (!user) return res.status(401).json({ error: '用户名或密码错误' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok)  return res.status(401).json({ error: '用户名或密码错误' })

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
