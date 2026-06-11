<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts, getAllStock, createSalesOrder } from '../api/index.js'

const router   = useRouter()
const products = ref([])

const productId = ref('')
const buyer     = ref('')
const note      = ref('')
const done      = ref(false)
const doneNo    = ref('')
const doneData  = ref({})
const submitted = ref(false)
const loading   = ref(false)

const availableBatches = ref([])
const batchRows = ref([{ batch_no: '', qty: '' }])

const selectedProduct = computed(() => products.value.find(p => p.id === Number(productId.value)))
const totalQty = computed(() => batchRows.value.reduce((sum, r) => sum + (Number(r.qty) || 0), 0))
const batchSummary = computed(() => batchRows.value
  .filter(r => r.batch_no && Number(r.qty) > 0)
  .map(r => `${r.batch_no} × ${r.qty}`)
  .join('；')
)

onMounted(async () => {
  products.value = await getProducts()
  if (products.value[0]) {
    productId.value = String(products.value[0].id)
    await onProductChange()
  }
})

async function onProductChange() {
  batchRows.value = [{ batch_no: '', qty: '' }]
  availableBatches.value = []
  if (!productId.value) return
  const allStock = await getAllStock()
  availableBatches.value = allStock
    .filter(s => s.product_id === Number(productId.value) && Number(s.qty) > 0)
    .sort((a, b) => a.batch_no.localeCompare(b.batch_no))
}

function addBatchRow() {
  if (batchRows.value.length >= 3) return
  batchRows.value.push({ batch_no: '', qty: '' })
}

function removeBatchRow(index) {
  if (batchRows.value.length <= 1) return
  batchRows.value.splice(index, 1)
}

function batchStock(batchNo) {
  const b = availableBatches.value.find(item => item.batch_no === batchNo)
  return Number(b?.qty || 0)
}

function rowHint(row) {
  if (!row.batch_no) return null
  const stock = batchStock(row.batch_no)
  const q = Number(row.qty) || 0
  if (!q) return `当前库存：${stock} ${selectedProduct.value?.unit || ''}`
  if (q > stock) return `超出库存 ${q - stock} ${selectedProduct.value?.unit || ''}`
  if (q === stock) return '将清空该批次全部库存'
  return `发货后剩余：${stock - q} ${selectedProduct.value?.unit || ''}`
}

const errors = computed(() => {
  const e = {}
  if (!productId.value) e.productId = '请选择商品'
  if (!buyer.value.trim()) e.buyer = '请填写购货方'

  const validRows = batchRows.value.filter(r => r.batch_no && Number(r.qty) > 0)
  if (validRows.length === 0) e.batches = '请至少选择 1 个批次并填写数量'
  if (validRows.length > 3) e.batches = '最多只能选择 3 个批次'

  const names = validRows.map(r => r.batch_no)
  if (new Set(names).size !== names.length) e.batches = '批次号不能重复'

  for (const r of validRows) {
    if (Number(r.qty) > batchStock(r.batch_no)) {
      e.batches = `批次 ${r.batch_no} 数量超出库存`
      break
    }
  }

  return e
})
const isValid = computed(() => Object.keys(errors.value).length === 0)

function fieldErr(key) {
  return submitted.value && errors.value[key] ? errors.value[key] : null
}

async function submit() {
  submitted.value = true
  if (!isValid.value) return
  const p = selectedProduct.value
  const batches = batchRows.value
    .filter(r => r.batch_no && Number(r.qty) > 0)
    .map(r => ({ batch_no: r.batch_no, qty: Number(r.qty) }))

  loading.value = true
  try {
    const res = await createSalesOrder({
      product_id:   p.id,
      product_name: p.name,
      unit:         p.unit,
      batches,
      buyer:        buyer.value.trim(),
      note:         note.value.trim(),
    })
    doneNo.value   = res.order_no
    doneData.value = { productName: p.name, unit: p.unit, qty: totalQty.value, batchText: batchSummary.value, buyer: buyer.value }
    done.value     = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function reset() {
  productId.value = String(products.value[0]?.id || '')
  batchRows.value = [{ batch_no: '', qty: '' }]
  buyer.value = ''; note.value = ''
  availableBatches.value = []
  submitted.value = false; done.value = false
  onProductChange()
}
</script>

<template>
  <div class="screen">

    <template v-if="done">
      <div class="topbar">
        <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">下销售单</span>
      </div>
      <div class="success-wrap">
        <div class="success-icon" style="background:var(--purple-light);color:var(--purple)"><i class="ti ti-clipboard-check" /></div>
        <div class="success-title">销售单已提交</div>
        <div class="success-sub">已通知仓库准备发货<br>{{ doneData.productName }} × {{ doneData.qty }} {{ doneData.unit }}</div>
        <div class="success-tag" style="background:var(--purple-light);color:var(--purple-dark)">销售单号：{{ doneNo }}</div>
        <div class="info-block" style="width:100%;margin-top:16px">
          <div class="info-row"><span class="info-key">购货方</span><span class="info-val">{{ doneData.buyer }}</span></div>
          <div class="info-row"><span class="info-key">批次</span><span class="info-val">{{ doneData.batchText }}</span></div>
        </div>
        <button class="btn btn-purple" style="margin-top:24px" @click="reset"><i class="ti ti-plus" />继续下单</button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>

    <template v-else>
      <div class="topbar">
        <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">下销售单</span>
        <span class="badge badge-purple">公司端</span>
      </div>
      <div class="body">
        <div class="section-header" style="background:var(--purple-light);color:var(--purple-dark)"><i class="ti ti-package" />商品信息</div>

        <div class="field-group">
          <label class="field-label">品名<span class="req">*</span></label>
          <select v-model="productId" @change="onProductChange">
            <optgroup label="原料">
              <option v-for="p in products.filter(p=>p.type==='raw')" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
            </optgroup>
            <optgroup label="成品">
              <option v-for="p in products.filter(p=>p.type==='packed')" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
            </optgroup>
          </select>
          <div v-if="fieldErr('productId')" class="err-msg">{{ fieldErr('productId') }}</div>
        </div>

        <div v-if="selectedProduct" class="info-block" style="margin-bottom:14px">
          <div class="info-row"><span class="info-key">规格</span><span class="info-val">{{ selectedProduct.spec }}</span></div>
          <div class="info-row"><span class="info-key">单位</span><span class="info-val">{{ selectedProduct.unit }}</span></div>
        </div>

        <div class="section-header" style="background:var(--bg3);margin-top:4px"><i class="ti ti-list-details" />批次与数量（最多 3 个）</div>

        <div v-if="availableBatches.length === 0" class="hint-box hint-warn">
          <i class="ti ti-alert-triangle" />该商品暂无可用库存
        </div>

        <div v-for="(row, index) in batchRows" :key="index" class="card" style="padding:12px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:13px;font-weight:700">批次 {{ index + 1 }}</div>
            <button v-if="batchRows.length > 1" class="small-danger-btn" @click="removeBatchRow(index)">删除</button>
          </div>
          <div class="field-group" style="margin-bottom:10px">
            <label class="field-label">批次号</label>
            <select v-model="row.batch_no">
              <option value="" disabled>请选择批次</option>
              <option v-for="b in availableBatches" :key="b.batch_no" :value="b.batch_no">
                {{ b.batch_no }}（库存 {{ b.qty }} {{ selectedProduct?.unit }}）
              </option>
            </select>
          </div>
          <div class="field-group" style="margin-bottom:0">
            <label class="field-label">数量</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" min="1" placeholder="0" v-model="row.qty" style="flex:1">
              <span style="font-size:13px;color:var(--text2);white-space:nowrap">{{ selectedProduct?.unit || '—' }}</span>
            </div>
            <div v-if="rowHint(row)" :class="['hint-box', Number(row.qty) > batchStock(row.batch_no) ? 'hint-bad' : 'hint-ok']" style="margin-top:6px">
              {{ rowHint(row) }}
            </div>
          </div>
        </div>

        <button v-if="batchRows.length < 3" class="btn btn-ghost" style="margin-top:0;margin-bottom:12px" @click="addBatchRow">
          <i class="ti ti-plus" />添加批次
        </button>
        <div class="hint-box hint-ok" style="margin-bottom:14px">
          <i class="ti ti-calculator" />合计：{{ totalQty }} {{ selectedProduct?.unit || '' }}
        </div>
        <div v-if="fieldErr('batches')" class="err-msg" style="margin-bottom:12px">{{ fieldErr('batches') }}</div>

        <div class="section-header" style="background:var(--bg3);margin-top:4px"><i class="ti ti-building-store" />购货方信息</div>

        <div class="field-group">
          <label class="field-label">购货方<span class="req">*</span></label>
          <input type="text" placeholder="购货方公司名称" v-model="buyer">
          <div v-if="fieldErr('buyer')" class="err-msg">{{ fieldErr('buyer') }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">备注（选填）</label>
          <textarea rows="2" placeholder="如有特殊要求请说明…" v-model="note" />
        </div>

        <button class="btn btn-purple" style="margin-top:4px" @click="submit" :disabled="loading">
          <i class="ti ti-loader-2" v-if="loading" style="animation:spin 1s linear infinite" />
          <i class="ti ti-send" v-else />
          {{ loading ? '提交中…' : '提交销售单' }}
        </button>
        <button class="btn btn-ghost" @click="router.push('/')">取消</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.err-msg { font-size:12px; color:var(--red); margin-top:5px; display:flex; align-items:center; gap:4px; }
@keyframes spin { to { transform: rotate(360deg) } }
</style>
