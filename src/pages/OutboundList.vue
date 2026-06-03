<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAll, getLiveStock } from '../db/index.js'

const router = useRouter()
const orders = ref([])

onMounted(async () => {
  const all = (await getAll('sales_orders')).filter(o => o.status === 'pending')
  orders.value = await Promise.all(all.map(async o => ({
    ...o,
    stock: await getLiveStock(o.productId, o.batchNo),
  })))
})
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
      <span class="topbar-title">待出库单</span>
      <span class="badge badge-purple">待发货 {{ orders.length }}</span>
    </div>

    <div class="body">
      <div v-if="orders.length === 0" class="empty">
        <i class="ti ti-circle-check" />暂无待出库单
      </div>

      <div
        v-for="o in orders"
        :key="o.id"
        class="order-card"
        @click="router.push(`/outbound/${o.id}`)"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:15px;font-weight:700">{{ o.orderNo }}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:3px">购货方：{{ o.buyer }}</div>
          </div>
          <span class="badge badge-purple">待发货</span>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:0.5px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:13px;color:var(--text2)">{{ o.productName }} 批次：{{ o.batchNo }}</div>
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
