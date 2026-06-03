// src/db/index.js
// IndexedDB data layer using the `idb` library.
// Pure JS — works identically in Vue and React.

import { openDB as idbOpen } from 'idb'

const DB_NAME    = 'warehouseDB'
const DB_VERSION = 1

let _db = null

export async function getDB() {
  if (_db) return _db
  _db = await idbOpen(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('purchase_orders')) {
        const s = db.createObjectStore('purchase_orders', { keyPath: 'id', autoIncrement: true })
        s.createIndex('status', 'status')
      }
      if (!db.objectStoreNames.contains('inbound')) {
        db.createObjectStore('inbound', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('sales_orders')) {
        const s = db.createObjectStore('sales_orders', { keyPath: 'id', autoIncrement: true })
        s.createIndex('status', 'status')
      }
      if (!db.objectStoreNames.contains('outbound')) {
        db.createObjectStore('outbound', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('processing')) {
        db.createObjectStore('processing', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('inventory_ledger')) {
        const s = db.createObjectStore('inventory_ledger', { keyPath: 'id', autoIncrement: true })
        s.createIndex('productId', 'productId')
        s.createIndex('batchNo',   'batchNo')
      }
    },
  })
  return _db
}

export async function getAll(store) {
  const db = await getDB()
  return db.getAll(store)
}

export async function getById(store, id) {
  const db = await getDB()
  return db.get(store, id)
}

export async function addRecord(store, data) {
  const db = await getDB()
  return db.add(store, { ...data, createdAt: new Date().toISOString() })
}

export async function updateRecord(store, data) {
  const db = await getDB()
  return db.put(store, data)
}

export async function getLiveStock(productId, batchNo) {
  const db  = await getDB()
  const all = await db.getAllFromIndex('inventory_ledger', 'productId', productId)
  return all
    .filter(r => r.batchNo === batchNo)
    .reduce((sum, r) => sum + r.qtyChange, 0)
}

export async function getAllStock() {
  const db  = await getDB()
  const all = await db.getAll('inventory_ledger')
  const map = {}
  for (const r of all) {
    const key = `${r.productId}||${r.batchNo}`
    if (!map[key]) map[key] = { productId: r.productId, batchNo: r.batchNo, qty: 0, productName: r.productName }
    map[key].qty += r.qtyChange
  }
  return Object.values(map).map(r => ({ ...r, qty: Math.round(r.qty) }))
}

export async function writeLedger({ productId, productName, batchNo, type, qtyChange, refNo, note }) {
  return addRecord('inventory_ledger', { productId, productName, batchNo, type, qtyChange, refNo, note: note || '' })
}

// ── Seed demo data on first run ──────────────────────────────────────────────
export async function seedIfEmpty() {
  const db       = await getDB()
  const existing = await db.getAll('products')
  if (existing.length > 0) return

  const tx1 = db.transaction('products', 'readwrite')
  await Promise.all([
    { id: 1, name: '玉米原淀粉',       spec: '25 kg/袋', unit: '袋', type: 'raw'    },
    { id: 2, name: '木薯淀粉',         spec: '50 kg/袋', unit: '袋', type: 'raw'    },
    { id: 3, name: '马铃薯淀粉',       spec: '25 kg/袋', unit: '袋', type: 'raw'    },
    { id: 4, name: '玉米淀粉（5kg装）',  spec: '5 kg/袋',  unit: '袋', type: 'packed' },
    { id: 5, name: '玉米淀粉（10kg装）', spec: '10 kg/袋', unit: '袋', type: 'packed' },
    { id: 6, name: '木薯淀粉（小包装）',  spec: '1 kg/袋',  unit: '袋', type: 'packed' },
  ].map(p => tx1.store.put(p)))
  await tx1.done

  const tx2 = db.transaction('inventory_ledger', 'readwrite')
  await Promise.all([
    { productId: 1, productName: '玉米原淀粉',       batchNo: 'LS-20240310', type: 'inbound',         qtyChange: 195 },
    { productId: 2, productName: '木薯淀粉',         batchNo: 'LS-20240301', type: 'inbound',         qtyChange:  42 },
    { productId: 3, productName: '马铃薯淀粉',       batchNo: 'LS-20240228', type: 'inbound',         qtyChange:  18 },
    { productId: 4, productName: '玉米淀粉（5kg装）',  batchNo: 'FZ-20240310', type: 'process_produce', qtyChange: 320 },
    { productId: 5, productName: '玉米淀粉（10kg装）', batchNo: 'FZ-20240308', type: 'process_produce', qtyChange:  55 },
    { productId: 6, productName: '木薯淀粉（小包装）',  batchNo: 'FZ-20240305', type: 'process_produce', qtyChange: 880 },
  ].map(r => tx2.store.add({ ...r, refNo: 'INIT', note: '期初库存', createdAt: '2024-03-01T00:00:00.000Z' })))
  await tx2.done

  const tx3 = db.transaction('purchase_orders', 'readwrite')
  await Promise.all([
    { orderNo: 'PO-2024-0312', productId: 1, productName: '玉米原淀粉', spec: '25 kg/袋', unit: '袋', qty: 200, batchNo: 'LS-20240310', shipper: '齐鲁淀粉有限公司', status: 'pending' },
    { orderNo: 'PO-2024-0311', productId: 2, productName: '木薯淀粉',   spec: '50 kg/袋', unit: '袋', qty:  60, batchNo: 'LS-20240311', shipper: '广西木薯供应商',   status: 'pending' },
    { orderNo: 'PO-2024-0310', productId: 3, productName: '马铃薯淀粉', spec: '25 kg/袋', unit: '袋', qty:  40, batchNo: 'LS-20240309', shipper: '云南马铃薯合作社', status: 'pending' },
  ].map(o => tx3.store.add({ ...o, createdAt: '2024-03-12T09:00:00.000Z' })))
  await tx3.done

  const tx4 = db.transaction('sales_orders', 'readwrite')
  await Promise.all([
    { orderNo: 'SO-2024-0089', productId: 1, productName: '玉米原淀粉', batchNo: 'LS-20240310', unit: '袋', qty: 80, buyer: '天津食品加工厂', status: 'pending' },
  ].map(o => tx4.store.add({ ...o, createdAt: '2024-03-12T11:00:00.000Z' })))
  await tx4.done
}

// ── Utility ──────────────────────────────────────────────────────────────────
export function genNo(prefix) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${prefix}-${d}-${Math.floor(Math.random() * 9000 + 1000)}`
}
