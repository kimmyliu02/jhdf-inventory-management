<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAll } from '../db/index.js'

const router     = useRouter()
const pendingIn  = ref(0)
const pendingOut = ref(0)

onMounted(async () => {
  const [pos, sos] = await Promise.all([getAll('purchase_orders'), getAll('sales_orders')])
  pendingIn.value  = pos.filter(o => o.status === 'pending').length
  pendingOut.value = sos.filter(o => o.status === 'pending').length
})
</script>

<template>
  <div class="screen">
    <!-- Role bar -->
    <div style="background:var(--bg2);padding:52px 16px 12px;display:flex;align-items:center;gap:12px;border-bottom:0.5px solid var(--border)">
      <div style="width:38px;height:38px;border-radius:50%;background:var(--teal-light);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--teal-dark)">仓</div>
      <div>
        <div style="font-size:14px;font-weight:700">李师傅</div>
        <div style="font-size:11px;color:var(--text3)">仓库操作员</div>
      </div>
      <i class="ti ti-bell" style="font-size:20px;color:var(--text3);margin-left:auto" />
    </div>

    <div class="body">
      <!-- Stats -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        <div style="background:var(--bg2);border-radius:var(--radius-sm);border:0.5px solid var(--border);padding:12px 14px">
          <div style="font-size:28px;font-weight:700;line-height:1" :style="{ color: pendingIn > 0 ? 'var(--amber)' : 'var(--teal)' }">{{ pendingIn }}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">待入库</div>
        </div>
        <div style="background:var(--bg2);border-radius:var(--radius-sm);border:0.5px solid var(--border);padding:12px 14px">
          <div style="font-size:28px;font-weight:700;line-height:1" :style="{ color: pendingOut > 0 ? 'var(--amber)' : 'var(--teal)' }">{{ pendingOut }}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px">待出库</div>
        </div>
      </div>

      <!-- 入库 / 出库 -->
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">入库 / 出库</div>
      <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border);margin-bottom:16px">
        <div class="menu-item" @click="router.push('/inbound')">
          <div class="menu-icon icon-teal"><i class="ti ti-arrow-bar-to-down" /></div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500">入库验收</div>
            <div style="font-size:12px;color:var(--text3);margin-top:1px">核对采购单，录入实收数量</div>
          </div>
          <span v-if="pendingIn > 0" class="badge badge-amber">{{ pendingIn }}</span>
          <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3);margin-left:4px" />
        </div>
        <div class="menu-item" @click="router.push('/outbound')">
          <div class="menu-icon icon-purple"><i class="ti ti-truck" /></div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500">出库发货</div>
            <div style="font-size:12px;color:var(--text3);margin-top:1px">确认销售单，执行发货</div>
          </div>
          <span v-if="pendingOut > 0" class="badge badge-purple">{{ pendingOut }}</span>
          <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3);margin-left:4px" />
        </div>
        <div class="menu-item" @click="router.push('/purchase')">
          <div class="menu-icon icon-blue"><i class="ti ti-clipboard-plus" /></div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500">下采购单</div>
            <div style="font-size:12px;color:var(--text3);margin-top:1px">公司端录入采购订单</div>
          </div>
          <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
        </div>
      </div>

      <!-- 分装加工 -->
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">分装加工</div>
      <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border);margin-bottom:16px">
        <div class="menu-item" @click="router.push('/process')">
          <div class="menu-icon icon-amber"><i class="ti ti-refresh" /></div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500">分装录入</div>
            <div style="font-size:12px;color:var(--text3);margin-top:1px">录入原料消耗与成品产出</div>
          </div>
          <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
        </div>
      </div>

      <!-- 库存查询 -->
      <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">查询</div>
      <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border)">
        <div class="menu-item" @click="router.push('/inventory')">
          <div class="menu-icon icon-blue"><i class="ti ti-chart-bar" /></div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500">实时库存总览</div>
            <div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有商品当前库存</div>
          </div>
          <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
        </div>
      </div>
    </div>
  </div>
</template>
