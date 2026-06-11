<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProducts, getAllStock, getLiveStock, createProcessing } from '../api/index.js'

const router = useRouter()

const products = ref([])
const allStock = ref([])
const outputProductId = ref('')
const note = ref('')
const done = ref(false)
const result = ref({})
const loading = ref(false)

const inputRows = ref([
  {
    product_id: '',
    product_name: '',
    batch_no: '',
    qty: '',
    stock: null,
    batches: [],
  },
])

const outputRows = ref([
  {
    batch_no: '',
    qty: '',
  },
])

function uniqueProducts(list) {
  const map = new Map()

  for (const p of list) {
    const key = `${p.name}|${p.spec}|${p.unit}|${p.type}`
    if (!map.has(key)) {
      map.set(key, p)
    }
  }

  return Array.from(map.values())
}

const rawProducts = computed(() =>
  uniqueProducts(products.value.filter(p => p.type === 'raw'))
)

const packedProducts = computed(() =>
  uniqueProducts(products.value.filter(p => p.type === 'packed'))
)

const outputProduct = computed(() => products.value.find(p => p.id === Number(outputProductId.value)))
const outputUnit = computed(() => outputProduct.value?.unit || '袋')

const totalInputQty = computed(() =>
  inputRows.value.reduce((sum, r) => sum + (Number(r.qty) || 0), 0)
)

const totalOutputQty = computed(() =>
  outputRows.value.reduce((sum, r) => sum + (Number(r.qty) || 0), 0)
)

const inputSummary = computed(() =>
  inputRows.value
    .filter(r => r.product_id && r.batch_no && Number(r.qty) > 0)
    .map(r => `${r.product_name} / ${r.batch_no} × ${r.qty}`)
    .join('；')
)

const outputSummary = computed(() =>
  outputRows.value
    .filter(r => r.batch_no && Number(r.qty) > 0)
    .map(r => `${r.batch_no} × ${r.qty}`)
    .join('；')
)

onMounted(async () => {
  products.value = await getProducts()
  allStock.value = await getAllStock()

  const packed = products.value.find(p => p.type === 'packed')
  if (packed) outputProductId.value = String(packed.id)
})

function inputProduct(row) {
  return products.value.find(p => p.id === Number(row.product_id))
}

function inputUnit(row) {
  return inputProduct(row)?.unit || '—'
}

function refreshRowBatches(row) {
  row.batches = allStock.value
    .filter(s => Number(s.product_id) === Number(row.product_id) && Number(s.qty) > 0)
    .sort((a, b) => String(a.batch_no).localeCompare(String(b.batch_no)))
}

async function onInputProductChange(row) {
  const product = inputProduct(row)
  row.product_name = product?.name || ''
  row.batch_no = ''
  row.qty = ''
  row.stock = null
  row.batches = []

  if (!row.product_id) return

  // Refresh stock once in case another operation changed it.
  allStock.value = await getAllStock()
  refreshRowBatches(row)

  if (row.batches.length === 1) {
    row.batch_no = row.batches[0].batch_no
    await onInputBatchChange(row)
  }
}

async function onInputBatchChange(row) {
  row.stock = null
  if (!row.product_id || !row.batch_no) return
  row.stock = await getLiveStock(Number(row.product_id), row.batch_no)
}

function addInputRow() {
  if (inputRows.value.length >= 5) {
    alert('原料最多添加 5 行')
    return
  }

  inputRows.value.push({
    product_id: '',
    product_name: '',
    batch_no: '',
    qty: '',
    stock: null,
    batches: [],
  })
}

function removeInputRow(index) {
  if (inputRows.value.length <= 1) return
  inputRows.value.splice(index, 1)
}

function addOutputRow() {
  if (outputRows.value.length >= 3) return
  outputRows.value.push({ batch_no: '', qty: '' })
}

function removeOutputRow(index) {
  if (outputRows.value.length <= 1) return
  outputRows.value.splice(index, 1)
}

function rowStock(row) {
  if (row.stock !== null && row.stock !== undefined) return Number(row.stock)
  const b = row.batches.find(item => item.batch_no === row.batch_no)
  return Number(b?.qty || 0)
}

function rowHint(row) {
  if (!row.batch_no) return null
  const stock = rowStock(row)
  const q = Number(row.qty) || 0
  if (!q) return `当前库存：${stock} ${inputUnit(row)}`
  if (q > stock) return `超出库存 ${q - stock} ${inputUnit(row)}`
  if (q === stock) return '将清空该批次全部库存'
  return `消耗后剩余：${stock - q} ${inputUnit(row)}`
}

function validate() {
  if (!outputProduct.value) return '请选择成品品名'

  const cleanInputs = inputRows.value.filter(r => r.product_id && r.batch_no && Number(r.qty) > 0)
  const cleanOutputs = outputRows.value.filter(r => r.batch_no && Number(r.qty) > 0)

  if (cleanInputs.length === 0) return '请至少填写 1 个原料批次和消耗数量'
  if (cleanInputs.length > 5) return '原料最多添加 5 行'

  const uniqueInputProducts = new Set(cleanInputs.map(r => String(r.product_id)))
  if (uniqueInputProducts.size > 5) return '原料品名最多选择 5 种'

  const inputKeys = cleanInputs.map(r => `${r.product_id}-${r.batch_no}`)
  if (new Set(inputKeys).size !== inputKeys.length) return '同一个原料批次不能重复'

  for (const row of cleanInputs) {
    if (Number(row.qty) > rowStock(row)) {
      return `${row.product_name} 批次 ${row.batch_no} 消耗数量超出库存`
    }
  }

  if (cleanOutputs.length === 0) return '请至少填写 1 个成品批次和产出数量'
  if (cleanOutputs.length > 3) return '成品批次最多 3 个'

  const outputBatchNos = cleanOutputs.map(r => r.batch_no.trim())
  if (new Set(outputBatchNos).size !== outputBatchNos.length) return '成品批次号不能重复'

  return ''
}

async function submit() {
  const error = validate()
  if (error) return alert(error)

  const cleanInputs = inputRows.value
    .filter(r => r.product_id && r.batch_no && Number(r.qty) > 0)
    .map(r => ({
      product_id: Number(r.product_id),
      product_name: r.product_name,
      batch_no: r.batch_no,
      qty: Number(r.qty),
    }))

  const cleanOutputs = outputRows.value
    .filter(r => r.batch_no && Number(r.qty) > 0)
    .map(r => ({
      batch_no: r.batch_no.trim(),
      qty: Number(r.qty),
    }))

  loading.value = true
  try {
    const res = await createProcessing({
      input_items: cleanInputs,
      output_product_id: outputProduct.value.id,
      output_product_name: outputProduct.value.name,
      output_batches: cleanOutputs,
      note: note.value.trim(),
    })

    result.value = {
      procNo: res.proc_no,
      inputItems: cleanInputs,
      outputProductName: outputProduct.value.name,
      outputBatches: cleanOutputs,
      totalInputQty: cleanInputs.reduce((sum, item) => sum + Number(item.qty), 0),
      totalOutputQty: cleanOutputs.reduce((sum, item) => sum + Number(item.qty), 0),
      outputUnit: outputUnit.value,
      inputText: inputSummary.value,
      outputText: outputSummary.value,
    }

    done.value = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function reset() {
  note.value = ''
  inputRows.value = [{
    product_id: '',
    product_name: '',
    batch_no: '',
    qty: '',
    stock: null,
    batches: [],
  }]
  outputRows.value = [{ batch_no: '', qty: '' }]
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
            <span class="info-key">原料消耗</span>
            <span class="info-val">{{ result.inputText }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">合计消耗</span>
            <span style="font-weight:700;color:var(--red)">−{{ result.totalInputQty }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">成品产出</span>
            <span class="info-val">{{ result.outputProductName }} / {{ result.outputText }}</span>
          </div>
          <div class="info-row">
            <span class="info-key">合计产出</span>
            <span style="font-weight:700;color:var(--teal)">+{{ result.totalOutputQty }} {{ result.outputUnit }}</span>
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
          <i class="ti ti-minus-circle" />原料消耗明细
        </div>

        <div
          v-for="(row, index) in inputRows"
          :key="index"
          class="card"
          style="padding:12px;margin-bottom:10px"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:13px;font-weight:700">原料 {{ index + 1 }}</div>
            <button
              v-if="inputRows.length > 1"
              type="button"
              class="small-danger-btn"
              @click="removeInputRow(index)"
            >
              删除
            </button>
          </div>

          <div class="field-group" style="margin-bottom:10px">
            <label class="field-label">原料品名<span class="req">*</span></label>
            <select v-model="row.product_id" @change="onInputProductChange(row)">
              <option value="" disabled>请选择原料</option>
              <option v-for="p in rawProducts" :key="p.id" :value="String(p.id)">
                {{ p.name }}（{{ p.spec }}）
              </option>
            </select>
          </div>

          <div class="field-group" style="margin-bottom:10px">
            <label class="field-label">原料批次<span class="req">*</span></label>
            <select
              v-if="row.batches.length > 0"
              v-model="row.batch_no"
              @change="onInputBatchChange(row)"
            >
              <option value="" disabled>请选择批次</option>
              <option
                v-for="b in row.batches"
                :key="b.batch_no"
                :value="b.batch_no"
                :disabled="inputRows.some((r, i) => i !== index && Number(r.product_id) === Number(row.product_id) && r.batch_no === b.batch_no)"
              >
                {{ b.batch_no }}（库存 {{ b.qty }} {{ inputUnit(row) }}）
              </option>
            </select>

            <div
              v-else
              style="font-size:13px;color:var(--text3);padding:10px 12px;background:var(--bg3);border-radius:var(--radius-sm)"
            >
              请选择原料后查看批次；如无批次，请先完成入库
            </div>
          </div>

          <div class="field-group" style="margin-bottom:0">
            <label class="field-label">消耗数量<span class="req">*</span></label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" min="0" placeholder="0" v-model="row.qty" style="flex:1">
              <span style="font-size:13px;color:var(--text2)">{{ inputUnit(row) }}</span>
            </div>
            <div
              v-if="rowHint(row)"
              :class="['hint-box', Number(row.qty) > rowStock(row) ? 'hint-bad' : 'hint-ok']"
              style="margin-top:6px"
            >
              {{ rowHint(row) }}
            </div>
          </div>
        </div>

        <button
          v-if="inputRows.length < 5"
          type="button"
          class="btn btn-ghost"
          style="margin-top:0;margin-bottom:12px"
          @click="addInputRow"
        >
          <i class="ti ti-plus" />添加原料
        </button>

        <div class="hint-box hint-ok" style="margin-bottom:14px">
          <i class="ti ti-calculator" />原料消耗合计：{{ totalInputQty }}
        </div>

        <div style="text-align:center;padding:4px 0 10px;font-size:22px;color:var(--text3)">
          <i class="ti ti-arrow-down" />
        </div>

        <div class="section-header" style="background:var(--purple-light);color:var(--purple-dark)">
          <i class="ti ti-plus-circle" />成品产出明细
        </div>

        <div class="field-group">
          <label class="field-label">成品品名<span class="req">*</span></label>
          <select v-model="outputProductId">
            <option value="" disabled>请选择成品</option>
            <option v-for="p in packedProducts" :key="p.id" :value="String(p.id)">
              {{ p.name }}（{{ p.spec }}）
            </option>
          </select>
        </div>

        <div
          v-for="(row, index) in outputRows"
          :key="index"
          class="card"
          style="padding:12px;margin-bottom:10px"
        >
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:13px;font-weight:700">成品批次 {{ index + 1 }}</div>
            <button
              v-if="outputRows.length > 1"
              type="button"
              class="small-danger-btn"
              @click="removeOutputRow(index)"
            >
              删除
            </button>
          </div>

          <div class="field-group" style="margin-bottom:10px">
            <label class="field-label">成品批次号<span class="req">*</span></label>
            <input type="text" placeholder="请输入成品批次号" v-model="row.batch_no">
          </div>

          <div class="field-group" style="margin-bottom:0">
            <label class="field-label">产出数量<span class="req">*</span></label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" min="0" placeholder="0" v-model="row.qty" style="flex:1">
              <span style="font-size:13px;color:var(--text2)">{{ outputUnit }}</span>
            </div>
          </div>
        </div>

        <button
          v-if="outputRows.length < 3"
          type="button"
          class="btn btn-ghost"
          style="margin-top:0;margin-bottom:12px"
          @click="addOutputRow"
        >
          <i class="ti ti-plus" />添加成品批次
        </button>

        <div class="hint-box hint-ok" style="margin-bottom:14px">
          <i class="ti ti-calculator" />成品产出合计：{{ totalOutputQty }} {{ outputUnit }}
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