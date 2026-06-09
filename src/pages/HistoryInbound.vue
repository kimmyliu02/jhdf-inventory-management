<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getInboundHistory } from '../api/index.js'

const router  = useRouter()
const records = ref([])
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    records.value = await getInboundHistory()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
      <span class="topbar-title">入库历史</span>
    </div>

    <div class="body">
      <div v-if="loading" class="empty"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite" />加载中…</div>
      <div v-else-if="error" class="hint-box hint-bad"><i class="ti ti-alert-circle" />{{ error }}</div>
      <div v-else-if="records.length === 0" class="empty"><i class="ti ti-inbox" />暂无入库记录</div>

      <div
        v-for="r in records" :key="r.id"
        style="background:var(--bg2);border-radius:var(--radius);border:0.5px solid var(--border);padding:13px 14px;margin-bottom:8px"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:14px;font-weight:700">{{ r.product_name }}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">批次：{{ r.batch_no }}</div>
          </div>
          <span class="badge badge-teal">+{{ r.qty_actual }} 入库</span>
        </div>
        <div style="background:var(--bg3);border-radius:var(--radius-sm);padding:4px 12px">
          <div class="info-row"><span class="info-key">入库单号</span><span class="info-val">{{ r.inbound_no }}</span></div>
          <div class="info-row"><span class="info-key">采购单号</span><span class="info-val">{{ r.purchase_order_no || '—' }}</span></div>
          <div class="info-row"><span class="info-key">发货方</span><span class="info-val">{{ r.shipper || '—' }}</span></div>
          <div class="info-row"><span class="info-key">应收 / 实收</span><span class="info-val">{{ r.qty_ordered }} / {{ r.qty_actual }}</span></div>
          <div class="info-row"><span class="info-key">操作人</span><span class="info-val">{{ r.created_by_name || '—' }}</span></div>
          <div class="info-row" style="border:none"><span class="info-key">时间</span><span class="info-val">{{ fmtDate(r.created_at) }}</span></div>
        </div>
        <div v-if="r.note" style="font-size:12px;color:var(--text3);margin-top:8px">备注：{{ r.note }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>