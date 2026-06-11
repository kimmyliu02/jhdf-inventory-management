<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getSalesOrders, confirmOutbound, getLiveStock } from '../api/index.js'

const router = useRouter()
const route  = useRoute()

const order   = ref(null)
const stock   = ref(0)
const qty     = ref('')
const remark  = ref('')
const transport = ref('自提')
const driver  = ref('')
const done    = ref(false)
const doneNo  = ref('')
const loading = ref(false)

function normalizedBatches(o) {
  return Array.isArray(o?.batches) && o.batches.length > 0
    ? o.batches.map(b => ({ batch_no: b.batch_no, qty: Number(b.qty) }))
    : [{ batch_no: o?.batch_no, qty: Number(o?.qty || 0) }]
}

function formatBatches(o) {
  return normalizedBatches(o).map(b => `${b.batch_no} × ${b.qty}`).join('；')
}

onMounted(async () => {
  const orders = await getSalesOrders('pending')
  order.value  = orders.find(o => o.id === Number(route.params.id))
  if (order.value) {
    const batches = normalizedBatches(order.value)
    const stocks = await Promise.all(batches.map(b => getLiveStock(order.value.product_id, b.batch_no)))
    stock.value = stocks.reduce((sum, qty) => sum + Number(qty || 0), 0)
    qty.value = String(order.value.qty)
  }
})

const hint = computed(() => {
  const v = parseInt(qty.value) || 0
  if (!v || !order.value) return null
  if (v > stock.value) return { type: 'hint-bad',  icon: 'ti-alert-circle',    text: `发货量超出库存（${stock.value} ${order.value.unit}），无法提交` }
  if (v === Number(order.value.qty)) return { type: 'hint-ok', icon: 'ti-circle-check', text: '与销售单数量一致' }
  return { type: 'hint-warn', icon: 'ti-alert-triangle', text: `与销售单差异 ${v - order.value.qty} ${order.value.unit}，请确认` }
})

async function submit() {
  const q = parseInt(qty.value)
  if (!q || q <= 0) return alert('请填写实发数量')
  if (q > stock.value) return alert('发货量超出库存')
  loading.value = true
  try {
    const res = await confirmOutbound(order.value.id, {
      qty_actual: q,
      transport: transport.value,
      driver: driver.value,
      note: remark.value,
    })
    doneNo.value = res.outbound_no
    done.value   = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="screen" v-if="order">

    <template v-if="done">
      <div class="topbar">
        <span class="back-btn" @click="router.push('/outbound')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">出库发货</span>
      </div>
      <div class="success-wrap">
        <div class="success-icon" style="background:var(--purple-light);color:var(--purple)"><i class="ti ti-truck" /></div>
        <div class="success-title">发货成功</div>
        <div class="success-sub">{{ order.product_name }} −{{ qty }} {{ order.unit }}<br>库存已自动扣减</div>
        <div class="success-tag" style="background:var(--purple-light);color:var(--purple-dark)">出库单号：{{ doneNo }}</div>
        <button class="btn btn-purple" style="margin-top:28px" @click="router.push('/outbound')">继续下一单</button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>

    <template v-else>
      <div class="topbar">
        <span class="back-btn" @click="router.push('/outbound')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">出库发货</span>
        <span class="badge badge-purple">待发货</span>
      </div>
      <div class="body">
        <div class="card">
          <div style="font-size:15px;font-weight:700">{{ order.order_no }}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">购货方：{{ order.buyer }}</div>
        </div>

        <div class="section-header"><i class="ti ti-file-text" />销售单信息（只读）</div>
        <div class="info-block">
          <div class="info-row"><span class="info-key">品名</span><span class="info-val">{{ order.product_name }}</span></div>
          <div class="info-row"><span class="info-key">批次号</span><span class="info-val">{{ formatBatches(order) }}</span></div>
          <div class="info-row"><span class="info-key">单位</span><span class="info-val">{{ order.unit }}</span></div>
          <div class="info-row"><span class="info-key">应发数量</span><span class="info-val" style="color:var(--purple)">{{ order.qty }} {{ order.unit }}</span></div>
          <div class="info-row">
            <span class="info-key">当前库存</span>
            <span class="info-val" :style="{ color: stock < order.qty ? 'var(--red)' : 'var(--teal)' }">{{ stock }} {{ order.unit }}</span>
          </div>
        </div>

        <div class="section-header"><i class="ti ti-edit" />发货确认</div>

        <div class="field-group">
          <label class="field-label">实发数量<span class="req">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" min="0" placeholder="请输入实发数量" v-model="qty" style="flex:1">
            <span style="font-size:13px;color:var(--text2);white-space:nowrap">{{ order.unit }}</span>
          </div>
          <div v-if="hint" :class="['hint-box', hint.type]">
            <i :class="['ti', hint.icon]" />{{ hint.text }}
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">承运方式</label>
          <select v-model="transport">
            <option>自提</option><option>物流配送</option><option>公司自送</option>
          </select>
        </div>

        <div class="field-group">
          <label class="field-label">司机 / 车牌（选填）</label>
          <input type="text" placeholder="如：鲁A 12345" v-model="driver">
        </div>

        <div class="field-group">
          <label class="field-label">备注</label>
          <textarea rows="2" placeholder="如有差异请说明…" v-model="remark" />
        </div>

        <button class="btn btn-purple" @click="submit" :disabled="loading">
          <i class="ti ti-loader-2" v-if="loading" style="animation:spin 1s linear infinite" />
          <i class="ti ti-truck" v-else />
          {{ loading ? '提交中…' : '确认发货' }}
        </button>
        <button class="btn btn-ghost" @click="router.push('/outbound')">返回列表</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>
