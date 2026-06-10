import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

export const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME     || 'warehouse',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
})

// Test connection
pool.getConnection()
  .then(conn => { console.log('✅ Database connected'); conn.release() })
  .catch(err => console.error('❌ Database connection failed:', err.message))

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      username   VARCHAR(100) UNIQUE NOT NULL,
      password   VARCHAR(255) NOT NULL,
      name       VARCHAR(100) NOT NULL,
      role       ENUM('company','warehouse','readonly') NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      name      VARCHAR(255) NOT NULL,
      spec      VARCHAR(255) NOT NULL,
      unit      VARCHAR(50)  NOT NULL,
      unit_alt1 VARCHAR(100),
      unit_alt2 VARCHAR(100),
      type      ENUM('raw','packed') NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      order_no      VARCHAR(50) UNIQUE NOT NULL,
      product_id    INT,
      product_name  VARCHAR(255) NOT NULL,
      spec          VARCHAR(255) NOT NULL,
      unit          VARCHAR(50)  NOT NULL,
      qty           DECIMAL(10,2) NOT NULL,
      batch_no      VARCHAR(100) NOT NULL,
      shipper       VARCHAR(255) NOT NULL,
      expected_date DATE,
      note          TEXT,
      status        ENUM('pending','partial','done','cancelled') DEFAULT 'pending',
      created_by    INT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) CHARACTER SET utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inbound_records (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      inbound_no        VARCHAR(50) UNIQUE NOT NULL,
      purchase_order_id INT,
      product_id        INT,
      product_name      VARCHAR(255) NOT NULL,
      batch_no          VARCHAR(100) NOT NULL,
      qty_ordered       DECIMAL(10,2) NOT NULL,
      qty_actual        DECIMAL(10,2) NOT NULL,
      location          VARCHAR(100),
      note              TEXT,
      created_by        INT,
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) CHARACTER SET utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      order_no      VARCHAR(50) UNIQUE NOT NULL,
      product_id    INT,
      product_name  VARCHAR(255) NOT NULL,
      unit          VARCHAR(50)  NOT NULL,
      qty           DECIMAL(10,2) NOT NULL,
      batch_no      VARCHAR(100) NOT NULL,
      buyer         VARCHAR(255) NOT NULL,
      note          TEXT,
      status        ENUM('pending','done','cancelled') DEFAULT 'pending',
      created_by    INT,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) CHARACTER SET utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS outbound_records (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      outbound_no    VARCHAR(50) UNIQUE NOT NULL,
      sales_order_id INT,
      product_id     INT,
      product_name   VARCHAR(255) NOT NULL,
      batch_no       VARCHAR(100) NOT NULL,
      qty_ordered    DECIMAL(10,2) NOT NULL,
      qty_actual     DECIMAL(10,2) NOT NULL,
      transport      VARCHAR(100),
      driver         VARCHAR(100),
      note           TEXT,
      created_by     INT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    ) CHARACTER SET utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processing_orders (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      proc_no          VARCHAR(50) UNIQUE NOT NULL,
      in_product_id    INT,
      in_product_name  VARCHAR(255) NOT NULL,
      in_batch_no      VARCHAR(100) NOT NULL,
      in_qty           DECIMAL(10,2) NOT NULL,
      out_product_id   INT,
      out_product_name VARCHAR(255) NOT NULL,
      out_batch_no     VARCHAR(100) NOT NULL,
      out_qty          DECIMAL(10,2) NOT NULL,
      note             TEXT,
      created_by       INT,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (in_product_id)  REFERENCES products(id),
      FOREIGN KEY (out_product_id) REFERENCES products(id),
      FOREIGN KEY (created_by)     REFERENCES users(id)
    ) CHARACTER SET utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_ledger (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      product_id   INT,
      product_name VARCHAR(255) NOT NULL,
      batch_no     VARCHAR(100) NOT NULL,
      type         ENUM('inbound','outbound','process_consume','process_produce') NOT NULL,
      qty_change   DECIMAL(10,2) NOT NULL,
      ref_no       VARCHAR(50)  NOT NULL,
      note         TEXT,
      created_by   INT,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id)  REFERENCES products(id),
      FOREIGN KEY (created_by)  REFERENCES users(id),
      INDEX idx_product_batch (product_id, batch_no)
    ) CHARACTER SET utf8mb4
  `)

  console.log('✅ Schema ready')
}

// Helper: MySQL uses ? placeholders instead of $1,$2
// and returns [rows, fields] instead of {rows}
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return { rows }
}

// Transaction helper
export async function withTransaction(fn) {
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
