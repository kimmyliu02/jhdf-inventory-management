<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts, getAllStock, getLiveStock, createSalesOrder } from '../api/index.js'

const router   = useRouter()
const products = ref([])

const productId = ref('')
const batchNo   = ref('')
const qty       = ref('')
const buyer     = ref('')
const note      = ref('')
const done      = ref(false)
const doneNo    = ref('')
const doneData  = ref({})
const submitted = ref(false)
const loading   = ref(false)

const availableBatches = ref([])
const liveStock        = ref(null)
const loadingStock     = ref(false)

const selectedProduct = computed(() => products.value.find(p => p.id === Number(productId.value)))

onMounted(async () => {
  products.value = await getProducts()
  if (products.value[0]) productId.value = String(products.value[0].id)
})

async function onProductChange() {
  batchNo.value = ''; liveStock.value = null; availableBatches.value = []
  if (!productId.value) return
  const allStock = await getAllStock()
  availableBatches.value = allStock
    .filter(s => s.product_id === Number(productId.value) && s.qty > 0)
    .sort((a, b) => a.batch_no.localeCompare(b.batch_no))
}

async function onBatchChange() {
  liveStock.value = null
  if (!productId.value || !batchNo.value) return
  loadingStock.value = true
  liveStock.value = await getLiveStock(Number(productId.value), batchNo.value)
  loadingStock.value = false
}

const errors = computed(() => {
  const e = {}
  if (!productId.value)            e.productId = '请选择商品'
  if (!batchNo.value.trim())       e.batchNo   = '请选择或填写批次号'
  if (!qty.value || Number(qty.value) <= 0) e.qty = '请填写有效数量'
  if (liveStock.value !== null && Number(qty.value) > liveStock.value)
    e.qty = `数量超出库存（当前 ${liveStock.value} ${selectedProduct.value?.unit}）`
  if (!buyer.value.trim())         e.buyer     = '请填写购货方'
  return e
})
const isValid = computed(() => Object.keys(errors.value).length === 0)

function fieldErr(key) {
  return submitted.value && errors.value[key] ? errors.value[key] : null
}

const stockHint = computed(() => {
  if (liveStock.value === null) return null
  const q = Number(qty.value) || 0
  if (q <= 0)           return { type: 'hint-ok',   text: `当前库存：${liveStock.value} ${selectedProduct.value?.unit}` }
  if (q > liveStock.value) return { type: 'hint-bad',  text: `超出库存 ${q - liveStock.value} ${selectedProduct.value?.unit}，无法提交` }
  if (q === liveStock.value) return { type: 'hint-warn', text: `将清空该批次全部库存` }
  return { type: 'hint-ok', text: `发货后剩余：${liveStock.value - q} ${selectedProduct.value?.unit}` }
})

async function submit() {
  submitted.value = true
  if (!isValid.value) return
  const p = selectedProduct.value
  loading.value = true
  try {
    const res = await createSalesOrder({
      product_id:   p.id,
      product_name: p.name,
      unit:         p.unit,
      qty:          Number(qty.value),
      batch_no:     batchNo.value.trim(),
      buyer:        buyer.value.trim(),
      note:         note.value.trim(),
    })
    doneNo.value   = res.order_no
    doneData.value = { productName: p.name, unit: p.unit, qty: qty.value, batchNo: batchNo.value, buyer: buyer.value, stock: liveStock.value }
    done.value     = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function reset() {
  productId.value = String(products.value[0]?.id || '')
  batchNo.value = ''; qty.value = ''; buyer.value = ''; note.value = ''
  liveStock.value = null; availableBatches.value = []
  submitted.value = false; done.value = false
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
          <div class="info-row"><span class="info-key">批次号</span><span class="info-val">{{ doneData.batchNo }}</span></div>
          <div class="info-row">
            <span class="info-key">发货后剩余库存</span>
            <span class="info-val" :style="{ color: doneData.stock - Number(doneData.qty) <= 0 ? 'var(--red)' : 'var(--teal)' }">
              {{ doneData.stock - Number(doneData.qty) }} {{ doneData.unit }}
            </span>
          </div>
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

        <div class="field-group">
          <label class="field-label">批次号<span class="req">*</span></label>
          <select v-if="availableBatches.length > 0" v-model="batchNo" @change="onBatchChange">
            <option value="" disabled>请选择批次</option>
            <option v-for="b in availableBatches" :key="b.batch_no" :value="b.batch_no">
              {{ b.batch_no }}（库存 {{ b.qty }} {{ selectedProduct?.unit }}）
            </option>
          </select>
          <input v-else type="text" placeholder="请先选择品名，或手动输入批次号" v-model="batchNo" @blur="onBatchChange">
          <div v-if="fieldErr('batchNo')" class="err-msg">{{ fieldErr('batchNo') }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">数量<span class="req">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" min="1" placeholder="0" v-model="qty" style="flex:1">
            <span style="font-size:13px;color:var(--text2);white-space:nowrap">{{ selectedProduct?.unit || '—' }}</span>
          </div>
          <div v-if="loadingStock" style="font-size:12px;color:var(--text3);margin-top:5px">查询库存中…</div>
          <div v-else-if="stockHint" :class="['hint-box', stockHint.type]" style="margin-top:6px">
            <i :class="['ti', stockHint.type==='hint-ok' ? 'ti-circle-check' : stockHint.type==='hint-warn' ? 'ti-alert-triangle' : 'ti-alert-circle']" />
            {{ stockHint.text }}
          </div>
          <div v-if="fieldErr('qty')" class="err-msg">{{ fieldErr('qty') }}</div>
        </div>

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
