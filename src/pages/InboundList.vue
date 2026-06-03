<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAll } from '../db/index.js'

const router = useRouter()
const orders = ref([])

onMounted(async () => {
  const all = await getAll('purchase_orders')
  orders.value = all.filter(o => o.status === 'pending')
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
      <div v-if="orders.length === 0" class="empty">
        <i class="ti ti-circle-check" />暂无待入库单
      </div>

      <div
        v-for="o in orders"
        :key="o.id"
        class="order-card"
        @click="router.push(`/inbound/${o.id}`)"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:15px;font-weight:700">{{ o.orderNo }}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:3px">发货方：{{ o.shipper }}</div>
          </div>
          <span class="badge badge-amber">待入库</span>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:var(--text2)">{{ o.productName }}（{{ o.spec }}）批次：{{ o.batchNo }}</span>
          <span style="font-size:14px;font-weight:700">{{ o.qty }} {{ o.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
