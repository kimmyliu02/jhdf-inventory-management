// backend/src/seed.js
import bcrypt from 'bcryptjs'
import { pool, initSchema } from './db.js'
import dotenv from 'dotenv'
dotenv.config()

async function seed() {
  await initSchema()

  // ── Users ────────────────────────────────────────────────────────────────
  const users = [
    { username: 'lq',         password: '517517', name: '刘强',      role: 'readonly'  },
    { username: 'jhk',        password: '213213', name: '金红坤',    role: 'company'   },
    { username: 'lj',         password: '1234',   name: '刘洁',      role: 'company'   },
    { username: 'jw',         password: '1234',   name: '金维',      role: 'company'   },
    { username: 'sb',         password: '1234',   name: '沈斌',      role: 'warehouse' },
    { username: 'warehouse1', password: '1234',   name: 'warehouse1', role: 'warehouse' },
    { username: 'warehouse2', password: '1234',   name: 'warehouse2', role: 'warehouse' },
  ]

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10)
    await pool.query(
      `INSERT INTO users (username, password, name, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password=VALUES(password), name=VALUES(name), role=VALUES(role)`,
      [u.username, hash, u.name, u.role]
    )
  }
  console.log('✅ Users seeded')

  // ── Products ─────────────────────────────────────────────────────────────
  const products = [
    ['25kg风车牌马铃薯淀粉',           '1*25kg*40包', '包', '吨（1*40包）',   null,           'packed'],
    ['5kg风车牌马铃薯淀粉',            '1*5kg*4包',   '包', '箱（1*4包）',    null,           'packed'],
    ['2.5kg风车牌马铃薯淀粉',          '1*2.5kg*8包', '包', '箱（1*8包）',    null,           'packed'],
    ['250g风车牌马铃薯淀粉',           '1*250g*48包', '包', '箱（1*48包）',   null,           'packed'],
    ['25kg风车牌蚕豆淀粉',             '1*25kg*40包', '包', '吨（1*40包）',   null,           'packed'],
    ['25kg世界花马铃薯淀粉',           '1*25kg*40包', '包', '吨（1*40包）',   null,           'packed'],
    ['25kgKMC变性淀粉',               '1*25kg*40包', '包', '吨（1*40包）',   null,           'packed'],
    ['2.5kg磨乐牌蚕豆淀粉',            '1*2.5kg*8袋', '袋', '包（1*8袋）',    '吨（1*400袋）', 'packed'],
    ['25kg磨乐牌马铃薯淀粉',           '1*25kg*40包', '包', '吨（1*40包）',   null,           'packed'],
    ['25kg磨乐牌马铃薯淀粉（塑编袋）',  '1*25kg*40包', '包', '吨（1*40包）',   null,           'packed'],
    ['5kg磨乐牌马铃薯淀粉（1*4）',     '1*5kg*4袋',   '袋', '包（1*4袋）',    '吨（1*200袋）', 'packed'],
    ['5kg磨乐牌马铃薯淀粉（1*5）',     '1*5kg*5袋',   '袋', '包（1*5袋）',    '吨（1*200袋）', 'packed'],
    ['5kg磨乐牌马铃薯淀粉（国产）',     '1*5kg*4袋',   '袋', '包（1*4袋）',    '吨（1*200袋）', 'packed'],
    ['2.5kg磨乐牌马铃薯淀粉',          '1*2.5kg*8袋', '袋', '包（1*8袋）',    '吨（1*400袋）', 'packed'],
    ['2kg磨乐牌马铃薯淀粉',            '1*2kg*10袋',  '袋', '包（1*10袋）',   '吨（1*500袋）', 'packed'],
    ['2kg磨乐牌玉米淀粉',              '1*2kg*10袋',  '袋', '包（1*10袋）',   '吨（1*500袋）', 'packed'],
    ['2kg磨乐牌红薯淀粉',              '1*2kg*10袋',  '袋', '包（1*10袋）',   '吨（1*500袋）', 'packed'],
    ['2kg磨乐牌木薯淀粉',              '1*2kg*10袋',  '袋', '包（1*10袋）',   '吨（1*500袋）', 'packed'],
    ['2kg磨乐牌小麦淀粉',              '1*2kg*10袋',  '袋', '包（1*10袋）',   '吨（1*500袋）', 'packed'],
    ['2.5kg磨乐牌豌豆淀粉',            '1*2.5kg*8袋', '袋', '包（1*8袋）',    '吨（1*400袋）', 'packed'],
    ['2.5kg磨乐牌绿豆淀粉',            '1*2.5kg*8袋', '袋', '包（1*8袋）',    '吨（1*400袋）', 'packed'],
    ['4kg薯芯匠造马铃薯淀粉',          '1*4kg*5袋',   '袋', '包（1*5袋）',    '吨（1*250袋）', 'packed'],
    ['25kg马铃薯淀粉（新疆优级）',     '1*25kg*40包', '包', '吨（1*40包）',   null,           'raw'],
    ['25kg马铃薯淀粉（斌发）',         '1*25kg*40包', '包', '吨（1*40包）',   null,           'raw'],
    ['25kg马铃薯淀粉（河北）',         '1*25kg*40包', '包', '吨（1*40包）',   null,           'raw'],
  ]

  for (const p of products) {
    await pool.query(
      `INSERT IGNORE INTO products (name, spec, unit, unit_alt1, unit_alt2, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      p
    )
  }
  console.log('✅ Products seeded')

  await pool.end()
  console.log('✅ Seed complete')
}

seed().catch(err => { console.error(err); process.exit(1) })
