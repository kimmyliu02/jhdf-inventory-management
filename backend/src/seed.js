// backend/src/seed.js
// Run once to create default users and products:
//   node src/seed.js

import bcrypt from 'bcryptjs'
import { pool, initSchema } from './db.js'
import dotenv from 'dotenv'
dotenv.config()

async function seed() {
  await initSchema()

  // ── Users ────────────────────────────────────────────────────────────────
  const users = [
    { username: 'admin',       password: '1234', name: '管理员', role: 'company'   },
    { username: 'company1',    password: '1234', name: '采购员', role: 'company'   },
    { username: 'warehouse1',  password: '1234', name: '李师傅', role: 'warehouse' },
    { username: 'warehouse2',  password: '1234', name: '王师傅', role: 'warehouse' },
  ]

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10)
    await pool.query(`
      INSERT INTO users (username, password, name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, [u.username, hash, u.name, u.role])
  }
  console.log('✅ Users seeded')

  // ── Products ─────────────────────────────────────────────────────────────
  const products = [
    // 风车牌
    { name: '25kg风车牌马铃薯淀粉',           spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'packed' },
    { name: '5kg风车牌马铃薯淀粉',            spec: '1*5kg*4包',   unit: '包', unit_alt1: '箱（1*4包）',    unit_alt2: null,           type: 'packed' },
    { name: '2.5kg风车牌马铃薯淀粉',          spec: '1*2.5kg*8包', unit: '包', unit_alt1: '箱（1*8包）',    unit_alt2: null,           type: 'packed' },
    { name: '250g风车牌马铃薯淀粉',           spec: '1*250g*48包', unit: '包', unit_alt1: '箱（1*48包）',   unit_alt2: null,           type: 'packed' },
    { name: '25kg风车牌蚕豆淀粉',             spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'packed' },
    // 世界花 / KMC
    { name: '25kg世界花马铃薯淀粉',           spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'packed' },
    { name: '25kgKMC变性淀粉',               spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'packed' },
    // 磨乐牌
    { name: '2.5kg磨乐牌蚕豆淀粉',            spec: '1*2.5kg*8袋', unit: '袋', unit_alt1: '包（1*8袋）',    unit_alt2: '吨（1*400袋）', type: 'packed' },
    { name: '25kg磨乐牌马铃薯淀粉',           spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'packed' },
    { name: '25kg磨乐牌马铃薯淀粉（塑编袋）',  spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'packed' },
    { name: '5kg磨乐牌马铃薯淀粉（1*4）',     spec: '1*5kg*4袋',   unit: '袋', unit_alt1: '包（1*4袋）',    unit_alt2: '吨（1*200袋）', type: 'packed' },
    { name: '5kg磨乐牌马铃薯淀粉（1*5）',     spec: '1*5kg*5袋',   unit: '袋', unit_alt1: '包（1*5袋）',    unit_alt2: '吨（1*200袋）', type: 'packed' },
    { name: '5kg磨乐牌马铃薯淀粉（国产）',     spec: '1*5kg*4袋',   unit: '袋', unit_alt1: '包（1*4袋）',    unit_alt2: '吨（1*200袋）', type: 'packed' },
    { name: '2.5kg磨乐牌马铃薯淀粉',          spec: '1*2.5kg*8袋', unit: '袋', unit_alt1: '包（1*8袋）',    unit_alt2: '吨（1*400袋）', type: 'packed' },
    { name: '2kg磨乐牌马铃薯淀粉',            spec: '1*2kg*10袋',  unit: '袋', unit_alt1: '包（1*10袋）',   unit_alt2: '吨（1*500袋）', type: 'packed' },
    { name: '2kg磨乐牌玉米淀粉',              spec: '1*2kg*10袋',  unit: '袋', unit_alt1: '包（1*10袋）',   unit_alt2: '吨（1*500袋）', type: 'packed' },
    { name: '2kg磨乐牌红薯淀粉',              spec: '1*2kg*10袋',  unit: '袋', unit_alt1: '包（1*10袋）',   unit_alt2: '吨（1*500袋）', type: 'packed' },
    { name: '2kg磨乐牌木薯淀粉',              spec: '1*2kg*10袋',  unit: '袋', unit_alt1: '包（1*10袋）',   unit_alt2: '吨（1*500袋）', type: 'packed' },
    { name: '2kg磨乐牌小麦淀粉',              spec: '1*2kg*10袋',  unit: '袋', unit_alt1: '包（1*10袋）',   unit_alt2: '吨（1*500袋）', type: 'packed' },
    { name: '2.5kg磨乐牌豌豆淀粉',            spec: '1*2.5kg*8袋', unit: '袋', unit_alt1: '包（1*8袋）',    unit_alt2: '吨（1*400袋）', type: 'packed' },
    { name: '2.5kg磨乐牌绿豆淀粉',            spec: '1*2.5kg*8袋', unit: '袋', unit_alt1: '包（1*8袋）',    unit_alt2: '吨（1*400袋）', type: 'packed' },
    // 薯芯匠造
    { name: '4kg薯芯匠造马铃薯淀粉',          spec: '1*4kg*5袋',   unit: '袋', unit_alt1: '包（1*5袋）',    unit_alt2: '吨（1*250袋）', type: 'packed' },
    // 原料
    { name: '25kg马铃薯淀粉（新疆优级）',     spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'raw' },
    { name: '25kg马铃薯淀粉（斌发）',         spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'raw' },
    { name: '25kg马铃薯淀粉（河北）',         spec: '1*25kg*40包', unit: '包', unit_alt1: '吨（1*40包）',   unit_alt2: null,           type: 'raw' },
  ]

  for (const p of products) {
    await pool.query(`
      INSERT INTO products (name, spec, unit, unit_alt1, unit_alt2, type)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [p.name, p.spec, p.unit, p.unit_alt1, p.unit_alt2, p.type])
  }
  console.log('✅ Products seeded')

  await pool.end()
  console.log('✅ Seed complete')
}

seed().catch(err => { console.error(err); process.exit(1) })
