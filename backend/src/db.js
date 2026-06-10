// backend/src/db.js
// PostgreSQL connection + schema creation
import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()
 
const { Pool } = pg
 
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
})
 
pool.connect((err, client, release) => {
  if (err) console.error('❌ Database connection failed:', err.message)
  else { console.log('✅ Database connected'); release() }
})
 
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      username   TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      name       TEXT NOT NULL,
      role       TEXT NOT NULL CHECK (role IN ('company', 'warehouse', 'readonly')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE TABLE IF NOT EXISTS products (
      id           SERIAL PRIMARY KEY,
      name         TEXT NOT NULL,
      spec         TEXT NOT NULL,
      unit         TEXT NOT NULL,
      unit_alt1    TEXT,
      unit_alt2    TEXT,
      type         TEXT NOT NULL CHECK (type IN ('raw', 'packed')),
      is_active    BOOLEAN DEFAULT TRUE,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id            SERIAL PRIMARY KEY,
      order_no      TEXT UNIQUE NOT NULL,
      product_id    INTEGER REFERENCES products(id),
      product_name  TEXT NOT NULL,
      spec          TEXT NOT NULL,
      unit          TEXT NOT NULL,
      qty           NUMERIC NOT NULL,
      batch_no      TEXT NOT NULL,
      shipper       TEXT NOT NULL,
      expected_date DATE,
      note          TEXT DEFAULT '',
      status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','partial','done','cancelled')),
      created_by    INTEGER REFERENCES users(id),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE TABLE IF NOT EXISTS inbound_records (
      id                SERIAL PRIMARY KEY,
      inbound_no        TEXT UNIQUE NOT NULL,
      purchase_order_id INTEGER REFERENCES purchase_orders(id),
      product_id        INTEGER REFERENCES products(id),
      product_name      TEXT NOT NULL,
      batch_no          TEXT NOT NULL,
      qty_ordered       NUMERIC NOT NULL,
      qty_actual        NUMERIC NOT NULL,
      location          TEXT DEFAULT '',
      note              TEXT DEFAULT '',
      created_by        INTEGER REFERENCES users(id),
      created_at        TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE TABLE IF NOT EXISTS sales_orders (
      id            SERIAL PRIMARY KEY,
      order_no      TEXT UNIQUE NOT NULL,
      product_id    INTEGER REFERENCES products(id),
      product_name  TEXT NOT NULL,
      unit          TEXT NOT NULL,
      qty           NUMERIC NOT NULL,
      batch_no      TEXT NOT NULL,
      buyer         TEXT NOT NULL,
      note          TEXT DEFAULT '',
      status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','done','cancelled')),
      created_by    INTEGER REFERENCES users(id),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE TABLE IF NOT EXISTS outbound_records (
      id              SERIAL PRIMARY KEY,
      outbound_no     TEXT UNIQUE NOT NULL,
      sales_order_id  INTEGER REFERENCES sales_orders(id),
      product_id      INTEGER REFERENCES products(id),
      product_name    TEXT NOT NULL,
      batch_no        TEXT NOT NULL,
      qty_ordered     NUMERIC NOT NULL,
      qty_actual      NUMERIC NOT NULL,
      transport       TEXT DEFAULT '',
      driver          TEXT DEFAULT '',
      note            TEXT DEFAULT '',
      created_by      INTEGER REFERENCES users(id),
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE TABLE IF NOT EXISTS processing_orders (
      id               SERIAL PRIMARY KEY,
      proc_no          TEXT UNIQUE NOT NULL,
      in_product_id    INTEGER REFERENCES products(id),
      in_product_name  TEXT NOT NULL,
      in_batch_no      TEXT NOT NULL,
      in_qty           NUMERIC NOT NULL,
      out_product_id   INTEGER REFERENCES products(id),
      out_product_name TEXT NOT NULL,
      out_batch_no     TEXT NOT NULL,
      out_qty          NUMERIC NOT NULL,
      note             TEXT DEFAULT '',
      created_by       INTEGER REFERENCES users(id),
      created_at       TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE TABLE IF NOT EXISTS inventory_ledger (
      id           SERIAL PRIMARY KEY,
      product_id   INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      batch_no     TEXT NOT NULL,
      type         TEXT NOT NULL CHECK (type IN ('inbound','outbound','process_consume','process_produce')),
      qty_change   NUMERIC NOT NULL,
      ref_no       TEXT NOT NULL,
      note         TEXT DEFAULT '',
      created_by   INTEGER REFERENCES users(id),
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
 
    CREATE INDEX IF NOT EXISTS idx_ledger_product ON inventory_ledger(product_id, batch_no);
  `)
 
  // Add readonly role to existing databases that only have company/warehouse
  await pool.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('company', 'warehouse', 'readonly'));
  `).catch(() => {}) // ignore if already correct

  // Add cancelled status to existing purchase_orders databases
await pool.query(`
  ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
  ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('pending', 'partial', 'done', 'cancelled'));
`).catch(() => {})

// Add cancelled status to existing sales_orders databases
await pool.query(`
  ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
  ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_status_check
    CHECK (status IN ('pending', 'done', 'cancelled'));
`).catch(() => {})
 
  console.log('✅ Schema ready')
}