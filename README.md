# 淀粉工厂仓库管理系统

基于 Vue 3 + Node.js + PostgreSQL 的 PWA 仓库管理系统，支持手机操作，数据实时共享。

---

## 功能

| 角色 | 权限 |
|------|------|
| 公司端 | 下采购单、下销售单、查库存、查历史记录 |
| 仓库端 | 入库验收、出库发货、分装录入、查库存、查历史记录 |
| 只读 | 查库存、查历史记录 |

**核心流程：**
- 采购入库：公司下采购单 → 仓库验收入库 → 库存自动增加
- 销售出库：公司下销售单 → 仓库确认出库 → 库存自动扣减
- 分装加工：仓库录入原料消耗和成品产出 → 库存双向更新
- 历史查询：入库历史、出库历史、加工历史

---

## 账号

| 用户名 | 姓名 | 角色 |
|--------|------|------|
| lq | 刘强 | 只读 |
| jhk | 金红坤 | 公司端 |
| lj | 刘洁 | 公司端 |
| jw | 金维 | 公司端 |
| sb | 沈斌 | 仓库端 |

---

## 技术架构

```
前端（GitHub Pages）
  Vue 3 + Vite + Tailwind CSS
  PWA — 可安装到手机桌面，支持离线浏览
  https://kimmyliu02.github.io/jhdf-inventory-management/

后端（Render）
  Node.js + Express
  JWT 登录认证
  https://jhdf-inventory-management.onrender.com

数据库（Supabase）
  PostgreSQL
  Singapore 节点
```

---

## 本地开发

### 前提
- Node.js 18+
- 已有 Supabase 数据库

### 前端
```bash
npm install
npm run dev
# 访问 http://localhost:5173
```

### 后端
```bash
cd backend
npm install
cp .env.example .env   # 填入数据库信息
node src/seed.js       # 初始化数据库（只需跑一次）
npm run dev
# 访问 http://localhost:3000
```

---

## 部署

### 前端 → GitHub Pages
```bash
npm run build
npm run publish-pwa
```

### 后端 → Render
1. Render 控制台连接 GitHub 仓库
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. 环境变量：

| Key | Value |
|-----|-------|
| DATABASE_URL | Supabase 连接串 |
| JWT_SECRET | 自定义密钥 |
| FRONTEND_URL | https://kimmyliu02.github.io |
| PORT | 3000 |

---

## 数据库结构

| 表名 | 说明 |
|------|------|
| users | 用户账号 |
| products | 商品主数据 |
| purchase_orders | 采购订单 |
| inbound_records | 入库记录 |
| sales_orders | 销售订单 |
| outbound_records | 出库记录 |
| processing_orders | 分装加工记录 |
| inventory_ledger | 库存流水（核心） |

库存计算方式：`SUM(qty_change)` 按商品+批次分组，正数为入库，负数为出库/消耗。

---

## 常见问题

**第一次打开很慢？**
Render 免费版会休眠，第一个请求需要 30-60 秒唤醒。之后正常。

**如何新增账号？**
编辑 `backend/src/seed.js` 的 users 数组，然后在 Render Shell 里运行 `node src/seed.js`。

**如何迁移到自己的服务器？**
1. 把 `backend/` 文件夹上传到服务器
2. 修改 `backend/.env` 的 `DATABASE_URL` 为新数据库连接串
3. 运行 `npm install && node src/seed.js && npm start`
4. 修改前端 `.env.production` 的 `VITE_API_URL` 为新服务器地址
5. 重新 `npm run build && npm run publish-pwa`