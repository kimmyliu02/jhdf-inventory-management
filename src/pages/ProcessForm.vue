<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts, getAllStock, createProcessing } from '../api/index.js'

const router = useRouter()

const products      = ref([])
const inProductId   = ref('')
const outProductId  = ref('')
const outQty        = ref('')
const outBatchNo    = ref('')
const note          = ref('')
const availableBatches = ref([])
const inputRows     = ref([{ batch_no: '', qty: '' }])
const done          = ref(false)
const result        = ref({})
const loading       = ref(false)

const rawProducts    = computed(() => products.value.filter(p => p.type === 'raw'))
const packedProducts = computed(() => products.value.filter(p => p.type === 'packed'))
const inProduct      = computed(() => products.value.find(p => p.id === Number(inProductId.value)))
const outProduct     = computed(() => products.value.find(p => p.id === Number(outProductId.value)))
const inUnit         = computed(() => inProduct.value?.unit  || '包')
const outUnit        = computed(() => outProduct.value?.unit || '袋')
const totalInQty     = computed(() => inputRows.value.reduce((sum, r) => sum + (Number(r.qty) || 0), 0))
const inputSummary   = computed(() => inputRows.value
  .filter(r => r.batch_no && Number(r.qty) > 0)
  .map(r => `${r.batch_no} × ${r.qty}`)
  .join('；')
)

onMounted(async () => {
  products.value = await getProducts()
  const raw    = products.value.find(p => p.type === 'raw')
  const packed = products.value.find(p => p.type === 'packed')
  if (raw)    inProductId.value  = String(raw.id)
  if (packed) outProductId.value = String(packed.id)
})

watch(inProductId, async (id) => {
  inputRows.value = [{ batch_no: '', qty: '' }]
  availableBatches.value = []
  if (!id) return
  const allStock = await getAllStock()
  availableBatches.value = allStock
    .filter(s => s.product_id === Number(id) && Number(s.qty) > 0)
    .sort((a, b) => a.batch_no.localeCompare(b.batch_no))
  if (availableBatches.value.length === 1) inputRows.value[0].batch_no = availableBatches.value[0].batch_no
})

watch(totalInQty, (v) => {
  const op = outProduct.value
  if (v > 0 && op) {
    const size = parseFloat(op.spec) || 5
    const bags = Math.floor(v / size)
    if (bags > 0) outQty.value = String(bags)
  }
})

function addInputRow() {
  if (inputRows.value.length >= 3) return
  inputRows.value.push({ batch_no: '', qty: '' })
}

function removeInputRow(index) {
  if (inputRows.value.length <= 1) return
  inputRows.value.splice(index, 1)
}

function batchStock(batchNo) {
  const b = availableBatches.value.find(item => item.batch_no === batchNo)
  return Number(b?.qty || 0)
}

function rowHint(row) {
  if (!row.batch_no) return null
  const stock = batchStock(row.batch_no)
  const q = Number(row.qty) || 0
  if (!q) return `当前库存：${stock} ${inUnit.value}`
  if (q > stock) return `超出库存 ${q - stock} ${inUnit.value}`
  if (q === stock) return '将清空该批次全部库存'
  return `消耗后剩余：${stock - q} ${inUnit.value}`
}

function validate() {
  const rows = inputRows.value.filter(r => r.batch_no && Number(r.qty) > 0)
  if (!inProduct.value || !outProduct.value) return '请选择商品'
  if (rows.length === 0) return '请至少选择 1 个原料批次并填写消耗数量'
  if (rows.length > 3) return '最多只能选择 3 个原料批次'
  if (new Set(rows.map(r => r.batch_no)).size !== rows.length) return '原料批次不能重复'
  for (const r of rows) {
    if (Number(r.qty) > batchStock(r.batch_no)) return `批次 ${r.batch_no} 消耗数量超出库存`
  }
  if (!Number(outQty.value) || Number(outQty.value) <= 0) return '请填写产出数量'
  return ''
}

async function submit() {
  const error = validate()
  if (error) return alert(error)

  const inputBatches = inputRows.value
    .filter(r => r.batch_no && Number(r.qty) > 0)
    .map(r => ({ batch_no: r.batch_no, qty: Number(r.qty) }))

  loading.value = true
  try {
    const res = await createProcessing({
      in_product_id:   inProduct.value.id,
      in_product_name: inProduct.value.name,
      input_batches:   inputBatches,
      out_product_id:   outProduct.value.id,
      out_product_name: outProduct.value.name,
      out_batch_no:     outBatchNo.value.trim(),
      out_qty:          Number(outQty.value),
      note:             note.value.trim(),
    })
    result.value = {
      procNo:  res.proc_no,
      inName:  inProduct.value.name,  inQty:  totalInQty.value,  inUnit:  inUnit.value,
      inputText: inputSummary.value,
      outName: outProduct.value.name, outQty: Number(outQty.value),  outUnit: outUnit.value,
    }
    done.value = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function reset() {
  outQty.value = ''; outBatchNo.value = ''; note.value = ''
  inputRows.value = [{ batch_no: '', qty: '' }]
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
            <span class="info-key">原料批次</span>
            <span class="info-val">{{ result.inputText }}</span>
          </div>
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

        <div v-if="availableBatches.length === 0" style="font-size:13px;color:var(--text3);padding:10px 12px;background:var(--bg3);border-radius:var(--radius-sm);margin-bottom:14px">
          <i class="ti ti-alert-triangle" style="margin-right:4px;color:var(--amber)" />该原料暂无库存，请先完成入库
        </div>

        <div v-for="(row, index) in inputRows" :key="index" class="card" style="padding:12px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:13px;font-weight:700">原料批次 {{ index + 1 }}</div>
            <button v-if="inputRows.length > 1" class="small-danger-btn" @click="removeInputRow(index)">删除</button>
          </div>
          <div class="field-group" style="margin-bottom:10px">
            <label class="field-label">批次号</label>
            <select v-model="row.batch_no">
              <option value="" disabled>请选择批次</option>
              <option v-for="b in availableBatches" :key="b.batch_no" :value="b.batch_no">
                {{ b.batch_no }}（库存 {{ b.qty }} {{ inUnit }}）
              </option>
            </select>
          </div>
          <div class="field-group" style="margin-bottom:0">
            <label class="field-label">消耗数量</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" min="0" placeholder="0" v-model="row.qty" style="flex:1">
              <span style="font-size:13px;color:var(--text2)">{{ inUnit }}</span>
            </div>
            <div v-if="rowHint(row)" :class="['hint-box', Number(row.qty) > batchStock(row.batch_no) ? 'hint-bad' : 'hint-ok']" style="margin-top:6px">
              {{ rowHint(row) }}
            </div>
          </div>
        </div>

        <button v-if="inputRows.length < 3" class="btn btn-ghost" style="margin-top:0;margin-bottom:12px" @click="addInputRow">
          <i class="ti ti-plus" />添加原料批次
        </button>

        <div class="hint-box hint-ok" style="margin-bottom:14px">
          <i class="ti ti-calculator" />原料消耗合计：{{ totalInQty }} {{ inUnit }}
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
          <label class="field-label">产出批次号（选填）</label>
          <input type="text" placeholder="不填则系统自动生成" v-model="outBatchNo">
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
          <textarea rows="2" placeholder="如有损耗请注明原因…" v-model="note" />
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
