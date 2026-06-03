<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAll, addRecord, writeLedger, getLiveStock, genNo } from '../db/index.js'

const router = useRouter()

const products      = ref([])
const inProductId   = ref('')
const outProductId  = ref('')
const inQty         = ref('')
const outQty        = ref('')
const yieldHint     = ref('')
const done          = ref(false)
const result        = ref({})

const rawProducts    = computed(() => products.value.filter(p => p.type === 'raw'))
const packedProducts = computed(() => products.value.filter(p => p.type === 'packed'))
const inProduct      = computed(() => products.value.find(p => p.id === Number(inProductId.value)))
const outProduct     = computed(() => products.value.find(p => p.id === Number(outProductId.value)))

onMounted(async () => {
  products.value = await getAll('products')
  const raw    = products.value.find(p => p.type === 'raw')
  const packed = products.value.find(p => p.type === 'packed')
  if (raw)    inProductId.value  = String(raw.id)
  if (packed) outProductId.value = String(packed.id)
})

function handleInQty(val) {
  inQty.value = val
  const v    = parseFloat(val) || 0
  const op   = outProduct.value
  if (v > 0 && op) {
    const size = parseFloat(op.spec) || 5
    const bags = Math.floor(v / size)
    yieldHint.value = bags > 0 ? `预计产出：约 ${bags} 袋` : ''
    if (bags > 0) outQty.value = String(bags)
  } else {
    yieldHint.value = ''
  }
}

async function submit() {
  const qi = parseFloat(inQty.value)
  const qo = parseInt(outQty.value)
  if (!qi || !qo)          return alert('请填写消耗量和产出量')
  if (!inProduct.value || !outProduct.value) return alert('请选择商品')

  const inBatchNo  = 'LS-20240310'   // TODO: 做成下拉选择
  const outBatchNo = genNo('FZ').slice(3)
  const procNo     = genNo('FZ')
  const inBags     = Math.ceil(qi / (parseFloat(inProduct.value.spec) || 25))
  const stock      = await getLiveStock(inProduct.value.id, inBatchNo)

  if (inBags > stock) return alert(`原料库存不足（当前 ${stock} ${inProduct.value.unit}）`)

  await addRecord('processing', {
    procNo,
    inProductId: inProduct.value.id, inProductName: inProduct.value.name, inBatchNo, inQty: qi,
    outProductId: outProduct.value.id, outProductName: outProduct.value.name, outBatchNo, outQty: qo,
  })
  await writeLedger({ productId: inProduct.value.id, productName: inProduct.value.name, batchNo: inBatchNo, type: 'process_consume', qtyChange: -inBags, refNo: procNo })
  await writeLedger({ productId: outProduct.value.id, productName: outProduct.value.name, batchNo: outBatchNo, type: 'process_produce', qtyChange: qo, refNo: procNo })

  result.value = { procNo, inName: inProduct.value.name, inQty: qi, outName: outProduct.value.name, outQty: qo }
  done.value   = true
}

function reset() {
  inQty.value = ''; outQty.value = ''; yieldHint.value = ''; done.value = false
}
</script>

<template>
  <div class="screen">

    <!-- Success -->
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
            <span style="font-weight:700;color:var(--red)">−{{ result.inQty }} kg</span>
          </div>
          <div class="info-row">
            <span class="info-key">{{ result.outName }}</span>
            <span style="font-weight:700;color:var(--teal)">+{{ result.outQty }} 袋</span>
          </div>
        </div>
        <button class="btn btn-amber" style="margin-top:20px" @click="reset">继续录入</button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>

    <!-- Form -->
    <template v-else>
      <div class="topbar">
        <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">分装加工录入</span>
      </div>
      <div class="body">
        <!-- Instruction card -->
        <div style="background:var(--amber-light);border:0.5px solid #FAC775;border-radius:var(--radius);padding:13px;margin-bottom:14px">
          <div style="font-size:11px;color:#854F0B;margin-bottom:4px"><i class="ti ti-brand-wechat" style="margin-right:4px" />加工指令（来自微信）</div>
          <div style="font-size:14px;font-weight:700;color:#412402">将玉米原淀粉分装成 5kg 小袋</div>
          <div style="font-size:12px;color:#854F0B;margin-top:3px">2024-03-12 08:30 · 负责人：王师傅</div>
        </div>

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
          <label class="field-label">消耗数量<span class="req">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" min="0" placeholder="0" :value="inQty" @input="handleInQty($event.target.value)" style="flex:1">
            <span style="font-size:13px;color:var(--text2)">kg</span>
          </div>
          <div v-if="yieldHint" style="font-size:12px;color:var(--text3);margin-top:5px">{{ yieldHint }}</div>
        </div>

        <div style="text-align:center;padding:6px 0 10px;font-size:22px;color:var(--text3)">
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
            <span style="font-size:13px;color:var(--text2)">袋</span>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">损耗 / 备注</label>
          <textarea rows="2" placeholder="如有损耗请注明原因…" />
        </div>

        <button class="btn btn-amber" @click="submit"><i class="ti ti-check" />提交加工记录</button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>
  </div>
</template>
