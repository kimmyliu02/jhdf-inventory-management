// backend/src/index.js

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initSchema } from './db.js'

import authRoutes        from './routes/auth.js'
import productRoutes     from './routes/products.js'
import inventoryRoutes   from './routes/inventory.js'
import purchaseRoutes    from './routes/purchaseOrders.js'
import salesRoutes       from './routes/salesOrders.js'
import processingRoutes  from './routes/processing.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3000

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',   // local dev
    'http://localhost:4173',   // local preview
  ],
  credentials: true,
}))
app.use(express.json())

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes)
app.use('/api/products',        productRoutes)
app.use('/api/inventory',       inventoryRoutes)
app.use('/api/purchase-orders', purchaseRoutes)
app.use('/api/sales-orders',    salesRoutes)
app.use('/api/processing',      processingRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }))

// ── Start ───────────────────────────────────────────────────────────────────
async function start() {
  await initSchema()
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))
}

start().catch(err => { console.error(err); process.exit(1) })
