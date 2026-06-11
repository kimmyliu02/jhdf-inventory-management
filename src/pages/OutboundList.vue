<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getSalesOrders, getLiveStock, cancelSalesOrder } from '../api/index.js'

const router  = useRouter()
const orders  = ref([])
const loading = ref(true)
const error   = ref('')

function normalizedBatches(o) {
  return Array.isArray(o.batches) && o.batches.length > 0
    ? o.batches.map(b => ({ batch_no: b.batch_no, qty: Number(b.qty) }))
    : [{ batch_no: o.batch_no, qty: Number(o.qty) }]
}

function formatBatches(o) {
  return normalizedBatches(o).map(b => `${b.batch_no} × ${b.qty}`).join('；')
}

onMounted(async () => {
  try {
    const all = await getSalesOrders('pending')
    orders.value = await Promise.all(all.map(async o => {
      const batches = normalizedBatches(o)
      const stocks = await Promise.all(batches.map(b => getLiveStock(o.product_id, b.batch_no)))
      return {
        ...o,
        batches,
        batchText: formatBatches({ ...o, batches }),
        stock: stocks.reduce((sum, qty) => sum + Number(qty || 0), 0),
      }
    }))
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

async function cancelOrder(o) {
  if (!confirm(`确定取消销售单 ${o.order_no} 吗？`)) return

  try {
    await cancelSalesOrder(o.id)
    orders.value = orders.value.filter(item => item.id !== o.id)
  } catch (e) {
    alert(e.message)
  }
}
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
      <span class="topbar-title">待出库单</span>
      <span class="badge badge-purple">待发货 {{ orders.length }}</span>
    </div>

    <div class="body">
      <div v-if="loading" class="empty"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite" />加载中…</div>
      <div v-else-if="error" class="hint-box hint-bad"><i class="ti ti-alert-circle" />{{ error }}</div>
      <div v-else-if="orders.length === 0" class="empty"><i class="ti ti-circle-check" />暂无待出库单</div>

      <div
        v-for="o in orders" :key="o.id"
        class="order-card"
        @click="router.push(`/outbound/${o.id}`)"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:15px;font-weight:700">{{ o.order_no }}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:3px">购货方：{{ o.buyer }}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="badge badge-purple">待发货</span>
            <button class="small-danger-btn" @click.stop="cancelOrder(o)">取消</button>
          </div>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:13px;color:var(--text2)">{{ o.product_name }} 批次：{{ o.batchText }}</div>
              <div style="font-size:12px;margin-top:2px" :style="{ color: o.stock < o.qty ? 'var(--red)' : 'var(--teal)' }">
                库存：{{ o.stock }} {{ o.unit }}
              </div>
            </div>
            <span style="font-size:14px;font-weight:700">{{ o.qty }} {{ o.unit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>
