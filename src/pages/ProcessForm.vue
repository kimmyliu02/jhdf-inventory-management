<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts, getAllStock, getLiveStock, createProcessing } from '../api/index.js'

const router = useRouter()

const products      = ref([])
const inProductId   = ref('')
const outProductId  = ref('')
const inQty         = ref('')
const outQty        = ref('')
const inBatchNo     = ref('')
const availableBatches = ref([])
const liveStock     = ref(null)
const done          = ref(false)
const result        = ref({})
const loading       = ref(false)

const rawProducts    = computed(() => products.value.filter(p => p.type === 'raw'))
const packedProducts = computed(() => products.value.filter(p => p.type === 'packed'))
const inProduct      = computed(() => products.value.find(p => p.id === Number(inProductId.value)))
const outProduct     = computed(() => products.value.find(p => p.id === Number(outProductId.value)))
const inUnit         = computed(() => inProduct.value?.unit  || '包')
const outUnit        = computed(() => outProduct.value?.unit || '袋')

onMounted(async () => {
  products.value = await getProducts()
  const raw    = products.value.find(p => p.type === 'raw')
  const packed = products.value.find(p => p.type === 'packed')
  if (raw)    inProductId.value  = String(raw.id)
  if (packed) outProductId.value = String(packed.id)
})

watch(inProductId, async (id) => {
  inBatchNo.value = ''; liveStock.value = null; availableBatches.value = []
  if (!id) return
  const allStock = await getAllStock()
  availableBatches.value = allStock
    .filter(s => s.product_id === Number(id) && s.qty > 0)
    .sort((a, b) => a.batch_no.localeCompare(b.batch_no))
  if (availableBatches.value.length === 1) inBatchNo.value = availableBatches.value[0].batch_no
})

watch(inBatchNo, async (batchNo) => {
  if (!batchNo || !inProductId.value) { liveStock.value = null; return }
  liveStock.value = await getLiveStock(Number(inProductId.value), batchNo)
})

function handleInQty(val) {
  inQty.value = val
  const v  = parseFloat(val) || 0
  const op = outProduct.value
  if (v > 0 && op) {
    const size = parseFloat(op.spec) || 5
    const bags = Math.floor(v / size)
    if (bags > 0) outQty.value = String(bags)
  }
}

async function submit() {
  const qi = parseInt(inQty.value)
  const qo = parseInt(outQty.value)
  if (!qi || !qo)                             return alert('请填写消耗量和产出量')
  if (!inProduct.value || !outProduct.value)  return alert('请选择商品')
  if (!inBatchNo.value)                       return alert('请选择原料批次')

  loading.value = true
  try {
    const res = await createProcessing({
      in_product_id:   inProduct.value.id,
      in_product_name: inProduct.value.name,
      in_batch_no:     inBatchNo.value,
      in_qty:          qi,
      out_product_id:   outProduct.value.id,
      out_product_name: outProduct.value.name,
      out_batch_no:     '',
      out_qty:          qo,
    })
    result.value = {
      procNo:  res.proc_no,
      inName:  inProduct.value.name,  inQty:  qi,  inUnit:  inUnit.value,
      outName: outProduct.value.name, outQty: qo,  outUnit: outUnit.value,
    }
    done.value = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function reset() {
  inQty.value = ''; outQty.value = ''
  inBatchNo.value = ''; liveStock.value = null
  done.value = false
}
</script>

<template>
  <div class="screen">

    <template v-if="done">
      <div class="topbar">
        <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">分装加工录入</span>
      </div>
      <div class="success-wrap">
        <div class="success-icon" style="background:var(--amber-light);color:var(--amber)"><i class="ti ti-refresh" /></div>
        <div class="success-title">加工记录已提交</div>
        <div class="success-sub">库存已同步更新</div>
        <div class="success-tag" style="background:var(--amber-light);color:var(--amber-dark)">加工单号：{{ result.procNo }}</div>
        <div class="info-block" style="width:100%;margin-top:14px">
          <div class="info-row">
            <span class="info-key">{{ result.inName }}</span>
            <span style="font-weight:700;color:var(--red)">−{{ result.inQty }} {{ result.inUnit }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">{{ result.outName }}</span>
            <span style="font-weight:700;color:var(--teal)">+{{ result.outQty }} {{ result.outUnit }}</span>
          </div>
        </div>
        <button class="btn btn-amber" style="margin-top:20px" @click="reset">继续录入</button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>

    <template v-else>
      <div class="topbar">
        <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">分装加工录入</span>
      </div>
      <div class="body">
        <div class="section-header" style="background:var(--teal-light);color:var(--teal-dark)">
          <i class="ti ti-minus-circle" />原料消耗
        </div>

        <div class="field-group">
          <label class="field-label">原料品名<span class="req">*</span></label>
          <select v-model="inProductId">
            <option v-for="p in rawProducts" :key="p.id" :value="String(p.id)">{{ p.name }}（{{ p.spec }}）</option>
          </select>
        </div>

        <div class="field-group">
          <label class="field-label">原料批次<span class="req">*</span></label>
          <select v-if="availableBatches.length > 0" v-model="inBatchNo">
            <option value="" disabled>请选择批次</option>
            <option v-for="b in availableBatches" :key="b.batch_no" :value="b.batch_no">
              {{ b.batch_no }}（库存 {{ b.qty }} {{ inUnit }}）
            </option>
          </select>
          <div v-else style="font-size:13px;color:var(--text3);padding:10px 12px;background:var(--bg3);border-radius:var(--radius-sm)">
            <i class="ti ti-alert-triangle" style="margin-right:4px;color:var(--amber)" />该原料暂无库存，请先完成入库
          </div>
        </div>

        <div v-if="liveStock !== null" style="margin-bottom:14px">
          <div :class="['hint-box', parseInt(inQty) > liveStock ? 'hint-bad' : 'hint-ok']">
            <i :class="['ti', parseInt(inQty) > liveStock ? 'ti-alert-circle' : 'ti-package']" />
            当前库存：{{ liveStock }} {{ inUnit }}
            <span v-if="parseInt(inQty) > 0 && parseInt(inQty) <= liveStock" style="margin-left:6px">
              · 消耗后剩余 {{ liveStock - parseInt(inQty) }} {{ inUnit }}
            </span>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">消耗数量<span class="req">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" min="0" placeholder="0" :value="inQty" @input="handleInQty($event.target.value)" style="flex:1">
            <span style="font-size:13px;color:var(--text2)">{{ inUnit }}</span>
          </div>
        </div>

        <div style="text-align:center;padding:4px 0 10px;font-size:22px;color:var(--text3)">
          <i class="ti ti-arrow-down" />
        </div>

        <div class="section-header" style="background:var(--purple-light);color:var(--purple-dark)">
          <i class="ti ti-plus-circle" />成品产出
        </div>

        <div class="field-group">
          <label class="field-label">成品品名<span class="req">*</span></label>
          <select v-model="outProductId">
            <option v-for="p in packedProducts" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
          </select>
        </div>

        <div class="field-group">
          <label class="field-label">产出数量<span class="req">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" min="0" placeholder="0" v-model="outQty" style="flex:1">
            <span style="font-size:13px;color:var(--text2)">{{ outUnit }}</span>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">损耗 / 备注</label>
          <textarea rows="2" placeholder="如有损耗请注明原因…" />
        </div>

        <button class="btn btn-amber" @click="submit" :disabled="loading">
          <i class="ti ti-loader-2" v-if="loading" style="animation:spin 1s linear infinite" />
          <i class="ti ti-check" v-else />
          {{ loading ? '提交中…' : '提交加工记录' }}
        </button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>
