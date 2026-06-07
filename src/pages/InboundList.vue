<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPurchaseOrders } from '../api/index.js'

const router = useRouter()
const orders = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    orders.value = await getPurchaseOrders('pending')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
      <span class="topbar-title">待入库单</span>
      <span class="badge badge-amber">待入库 {{ orders.length }}</span>
    </div>

    <div class="body">
      <div v-if="loading" class="empty"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite" />加载中…</div>
      <div v-else-if="error" class="hint-box hint-bad"><i class="ti ti-alert-circle" />{{ error }}</div>
      <div v-else-if="orders.length === 0" class="empty"><i class="ti ti-circle-check" />暂无待入库单</div>

      <div
        v-for="o in orders" :key="o.id"
        class="order-card"
        @click="router.push(`/inbound/${o.id}`)"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:15px;font-weight:700">{{ o.order_no }}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:3px">发货方：{{ o.shipper }}</div>
          </div>
          <span class="badge badge-amber">待入库</span>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:var(--text2)">{{ o.product_name }}（{{ o.spec }}）批次：{{ o.batch_no }}</span>
          <span style="font-size:14px;font-weight:700">{{ o.qty }} {{ o.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>
