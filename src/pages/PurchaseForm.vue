<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts, createPurchaseOrder } from '../api/index.js'

const router   = useRouter()
const products = ref([])

const productId    = ref('')
const batchNo      = ref('')
const qty          = ref('')
const shipper      = ref('')
const expectedDate = ref('')
const note         = ref('')
const done         = ref(false)
const doneNo       = ref('')
const doneData     = ref({})
const submitted    = ref(false)
const loading      = ref(false)

const selectedProduct = computed(() => products.value.find(p => p.id === Number(productId.value)))

onMounted(async () => {
  products.value = await getProducts()
  const first = products.value.find(p => p.type === 'raw')
  if (first) productId.value = String(first.id)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  expectedDate.value = tomorrow.toISOString().slice(0, 10)
})

const errors = computed(() => {
  const e = {}
  if (!productId.value)               e.productId    = '请选择商品'
  if (!batchNo.value.trim())          e.batchNo      = '请填写批次号'
  if (!qty.value || Number(qty.value) <= 0) e.qty    = '请填写有效数量'
  if (!shipper.value.trim())          e.shipper      = '请填写发货方'
  if (!expectedDate.value)            e.expectedDate = '请选择预计到货日期'
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
  loading.value = true
  try {
    const res = await createPurchaseOrder({
      product_id:    p.id,
      product_name:  p.name,
      spec:          p.spec,
      unit:          p.unit,
      qty:           Number(qty.value),
      batch_no:      batchNo.value.trim(),
      shipper:       shipper.value.trim(),
      expected_date: expectedDate.value,
      note:          note.value.trim(),
    })
    doneNo.value   = res.order_no
    doneData.value = { productName: p.name, spec: p.spec, qty: qty.value, unit: p.unit, batchNo: batchNo.value, shipper: shipper.value }
    done.value     = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function reset() {
  productId.value = String(products.value.find(p => p.type === 'raw')?.id || '')
  batchNo.value = ''; qty.value = ''; shipper.value = ''; note.value = ''
  submitted.value = false; done.value = false
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  expectedDate.value = tomorrow.toISOString().slice(0, 10)
}
</script>

<template>
  <div class="screen">

    <template v-if="done">
      <div class="topbar">
        <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">下采购单</span>
      </div>
      <div class="success-wrap">
        <div class="success-icon" style="background:#E6F1FB;color:#185FA5"><i class="ti ti-clipboard-check" /></div>
        <div class="success-title">采购单已提交</div>
        <div class="success-sub">已通知仓库待收货<br>{{ doneData.productName }} × {{ doneData.qty }} {{ doneData.unit }}</div>
        <div class="success-tag" style="background:#E6F1FB;color:#185FA5">采购单号：{{ doneNo }}</div>
        <div class="info-block" style="width:100%;margin-top:16px">
          <div class="info-row"><span class="info-key">规格</span><span class="info-val">{{ doneData.spec }}</span></div>
          <div class="info-row"><span class="info-key">批次号</span><span class="info-val">{{ doneData.batchNo }}</span></div>
          <div class="info-row"><span class="info-key">发货方</span><span class="info-val">{{ doneData.shipper }}</span></div>
        </div>
        <button class="btn" style="background:#185FA5;color:#fff;margin-top:24px" @click="reset"><i class="ti ti-plus" />继续下单</button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>

    <template v-else>
      <div class="topbar">
        <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">下采购单</span>
        <span class="badge" style="background:#E6F1FB;color:#185FA5">公司端</span>
      </div>
      <div class="body">
        <div class="section-header" style="background:#E6F1FB;color:#185FA5"><i class="ti ti-package" />商品信息</div>

        <div class="field-group">
          <label class="field-label">品名<span class="req">*</span></label>
          <select v-model="productId">
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
          <input type="text" placeholder="如：LS-20240312" v-model="batchNo">
          <div v-if="fieldErr('batchNo')" class="err-msg">{{ fieldErr('batchNo') }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">数量<span class="req">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" min="1" placeholder="0" v-model="qty" style="flex:1">
            <span style="font-size:13px;color:var(--text2);white-space:nowrap">{{ selectedProduct?.unit || '—' }}</span>
          </div>
          <div v-if="fieldErr('qty')" class="err-msg">{{ fieldErr('qty') }}</div>
        </div>

        <div class="section-header" style="background:var(--bg3);margin-top:4px"><i class="ti ti-truck" />供应商信息</div>

        <div class="field-group">
          <label class="field-label">发货方<span class="req">*</span></label>
          <input type="text" placeholder="供应商名称" v-model="shipper">
          <div v-if="fieldErr('shipper')" class="err-msg">{{ fieldErr('shipper') }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">预计到货日期<span class="req">*</span></label>
          <input type="date" v-model="expectedDate">
          <div v-if="fieldErr('expectedDate')" class="err-msg">{{ fieldErr('expectedDate') }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">备注（选填）</label>
          <textarea rows="2" placeholder="如有特殊要求请说明…" v-model="note" />
        </div>

        <button class="btn" style="background:#185FA5;color:#fff;margin-top:4px" @click="submit" :disabled="loading">
          <i class="ti ti-loader-2" v-if="loading" style="animation:spin 1s linear infinite" />
          <i class="ti ti-send" v-else />
          {{ loading ? '提交中…' : '提交采购单' }}
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
