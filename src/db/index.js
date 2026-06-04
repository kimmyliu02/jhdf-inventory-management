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
// 把下面这段替换 src/db/index.js 里的 seedIfEmpty() 函数

export async function seedIfEmpty() {
  const db       = await getDB()
  const existing = await db.getAll('products')
  if (existing.length > 0) return

  const tx1 = db.transaction('products', 'readwrite')
  await Promise.all([
    // ── 风车牌 ──────────────────────────────────────────────
    { id:  1, name: '25kg风车牌马铃薯淀粉',       spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'packed' },
    { id:  2, name: '5kg风车牌马铃薯淀粉',        spec: '1*5kg*4包',   unit: '包', unitAlt1: '箱（1*4包）',   unitAlt2: null,          type: 'packed' },
    { id:  3, name: '2.5kg风车牌马铃薯淀粉',      spec: '1*2.5kg*8包', unit: '包', unitAlt1: '箱（1*8包）',   unitAlt2: null,          type: 'packed' },
    { id:  4, name: '250g风车牌马铃薯淀粉',       spec: '1*250g*48包', unit: '包', unitAlt1: '箱（1*48包）',  unitAlt2: null,          type: 'packed' },
    { id:  5, name: '25kg风车牌蚕豆淀粉',         spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'packed' },

    // ── 世界花 / KMC ────────────────────────────────────────
    { id:  6, name: '25kg世界花马铃薯淀粉',       spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'packed' },
    { id:  7, name: '25kgKMC变性淀粉',            spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'packed' },

    // ── 磨乐牌 ──────────────────────────────────────────────
    { id:  8, name: '2.5kg磨乐牌蚕豆淀粉',        spec: '1*2.5kg*8袋', unit: '袋', unitAlt1: '包（1*8袋）',   unitAlt2: '吨（1*400袋）', type: 'packed' },
    { id:  9, name: '25kg磨乐牌马铃薯淀粉',       spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'packed' },
    { id: 10, name: '25kg磨乐牌马铃薯淀粉（塑编袋）', spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）', unitAlt2: null,         type: 'packed' },
    { id: 11, name: '5kg磨乐牌马铃薯淀粉（1*4）', spec: '1*5kg*4袋',   unit: '袋', unitAlt1: '包（1*4袋）',   unitAlt2: '吨（1*200袋）', type: 'packed' },
    { id: 12, name: '5kg磨乐牌马铃薯淀粉（1*5）', spec: '1*5kg*5袋',   unit: '袋', unitAlt1: '包（1*5袋）',   unitAlt2: '吨（1*200袋）', type: 'packed' },
    { id: 13, name: '5kg磨乐牌马铃薯淀粉（国产）', spec: '1*5kg*4袋',  unit: '袋', unitAlt1: '包（1*4袋）',   unitAlt2: '吨（1*200袋）', type: 'packed' },
    { id: 14, name: '2.5kg磨乐牌马铃薯淀粉',      spec: '1*2.5kg*8袋', unit: '袋', unitAlt1: '包（1*8袋）',   unitAlt2: '吨（1*400袋）', type: 'packed' },
    { id: 15, name: '2kg磨乐牌马铃薯淀粉',        spec: '1*2kg*10袋',  unit: '袋', unitAlt1: '包（1*10袋）',  unitAlt2: '吨（1*500袋）', type: 'packed' },
    { id: 16, name: '2kg磨乐牌玉米淀粉',          spec: '1*2kg*10袋',  unit: '袋', unitAlt1: '包（1*10袋）',  unitAlt2: '吨（1*500袋）', type: 'packed' },
    { id: 17, name: '2kg磨乐牌红薯淀粉',          spec: '1*2kg*10袋',  unit: '袋', unitAlt1: '包（1*10袋）',  unitAlt2: '吨（1*500袋）', type: 'packed' },
    { id: 18, name: '2kg磨乐牌木薯淀粉',          spec: '1*2kg*10袋',  unit: '袋', unitAlt1: '包（1*10袋）',  unitAlt2: '吨（1*500袋）', type: 'packed' },
    { id: 19, name: '2kg磨乐牌小麦淀粉',          spec: '1*2kg*10袋',  unit: '袋', unitAlt1: '包（1*10袋）',  unitAlt2: '吨（1*500袋）', type: 'packed' },
    { id: 20, name: '2.5kg磨乐牌豌豆淀粉',        spec: '1*2.5kg*8袋', unit: '袋', unitAlt1: '包（1*8袋）',   unitAlt2: '吨（1*400袋）', type: 'packed' },
    { id: 21, name: '2.5kg磨乐牌绿豆淀粉',        spec: '1*2.5kg*8袋', unit: '袋', unitAlt1: '包（1*8袋）',   unitAlt2: '吨（1*400袋）', type: 'packed' },

    // ── 薯芯匠造 ────────────────────────────────────────────
    { id: 22, name: '4kg薯芯匠造马铃薯淀粉',      spec: '1*4kg*5袋',   unit: '袋', unitAlt1: '包（1*5袋）',   unitAlt2: '吨（1*250袋）', type: 'packed' },

    // ── 原料（散装进货）────────────────────────────────────
    { id: 23, name: '25kg马铃薯淀粉（新疆优级）', spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'raw' },
    { id: 24, name: '25kg马铃薯淀粉（斌发）',     spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'raw' },
    { id: 25, name: '25kg马铃薯淀粉（河北）',     spec: '1*25kg*40包', unit: '包', unitAlt1: '吨（1*40包）',  unitAlt2: null,          type: 'raw' },
  ].map(p => tx1.store.put(p)))
  await tx1.done

  // No opening stock — start from zero, enter real data via purchase orders
}

// ── Utility ──────────────────────────────────────────────────────────────────
export function genNo(prefix) {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${prefix}-${d}-${Math.floor(Math.random() * 9000 + 1000)}`
}
