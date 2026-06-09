<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getPurchaseOrders, getSalesOrders } from '../api/index.js'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { getUser, logout } = useAuth()

const user       = ref(getUser())
const pendingIn  = ref(0)
const pendingOut = ref(0)

const isCompany   = computed(() => user.value?.role === 'company')
const isWarehouse = computed(() => user.value?.role === 'warehouse')
const isReadonly  = computed(() => user.value?.role === 'readonly')

onMounted(async () => {
  if (isWarehouse.value) {
    const [pos, sos] = await Promise.all([
      getPurchaseOrders('pending'),
      getSalesOrders('pending'),
    ])
    pendingIn.value  = pos.length
    pendingOut.value = sos.length
  }
})

const avatarStyle = computed(() => ({
  width: '38px', height: '38px', borderRadius: '50%',
  background: isCompany.value ? '#E6F1FB' : isReadonly.value ? '#F3F0FF' : 'var(--teal-light)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '13px', fontWeight: '700',
  color: isCompany.value ? '#185FA5' : isReadonly.value ? '#534AB7' : 'var(--teal-dark)',
}))

const roleLabel = computed(() => {
  if (isCompany.value)   return '公司端'
  if (isWarehouse.value) return '仓库端'
  if (isReadonly.value)  return '只读'
  return ''
})
</script>

<template>
  <div class="screen">
    <!-- Role bar -->
    <div style="background:var(--bg2);padding:52px 16px 12px;display:flex;align-items:center;gap:12px;border-bottom:0.5px solid var(--border)">
      <div :style="avatarStyle">{{ user?.name?.charAt(0) || '？' }}</div>
      <div>
        <div style="font-size:14px;font-weight:700">{{ user?.name }}</div>
        <div style="font-size:11px;color:var(--text3)">{{ roleLabel }}</div>
      </div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text3);cursor:pointer;padding:6px 8px;border-radius:8px" @click="logout(router)">
        <i class="ti ti-logout" style="font-size:16px" />退出
      </div>
    </div>

    <div class="body">

      <!-- ── 公司端 ── -->
      <template v-if="isCompany">
        <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">下单</div>
        <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border);margin-bottom:16px">
          <div class="menu-item" @click="router.push('/purchase')">
            <div class="menu-icon icon-blue"><i class="ti ti-clipboard-plus" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">下采购单</div><div style="font-size:12px;color:var(--text3);margin-top:1px">录入进货订单给仓库</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/sales')">
            <div class="menu-icon icon-purple"><i class="ti ti-clipboard-plus" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">下销售单</div><div style="font-size:12px;color:var(--text3);margin-top:1px">录入出货订单给仓库</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
        </div>

        <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">查询</div>
        <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border)">
          <div class="menu-item" @click="router.push('/inventory')">
            <div class="menu-icon icon-blue"><i class="ti ti-chart-bar" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">实时库存总览</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有商品当前库存</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/inbound')">
            <div class="menu-icon icon-teal"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">入库历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有入库记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/outbound')">
            <div class="menu-icon icon-purple"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">出库历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有出库记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/processing')">
            <div class="menu-icon icon-amber"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">加工历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有分装加工记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
        </div>
      </template>

      <!-- ── 只读 ── -->
      <template v-if="isReadonly">
        <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">查询</div>
        <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border)">
          <div class="menu-item" @click="router.push('/inventory')">
            <div class="menu-icon icon-blue"><i class="ti ti-chart-bar" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">实时库存总览</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有商品当前库存</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/inbound')">
            <div class="menu-icon icon-teal"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">入库历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有入库记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/outbound')">
            <div class="menu-icon icon-purple"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">出库历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有出库记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/processing')">
            <div class="menu-icon icon-amber"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">加工历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有分装加工记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
        </div>
      </template>

      <!-- ── 仓库端 ── -->
      <template v-if="isWarehouse">
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

        <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">入库 / 出库</div>
        <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border);margin-bottom:16px">
          <div class="menu-item" @click="router.push('/inbound')">
            <div class="menu-icon icon-teal"><i class="ti ti-arrow-bar-to-down" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">入库验收</div><div style="font-size:12px;color:var(--text3);margin-top:1px">核对采购单，录入实收数量</div></div>
            <span v-if="pendingIn > 0" class="badge badge-amber">{{ pendingIn }}</span>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3);margin-left:4px" />
          </div>
          <div class="menu-item" @click="router.push('/outbound')">
            <div class="menu-icon icon-purple"><i class="ti ti-truck" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">出库发货</div><div style="font-size:12px;color:var(--text3);margin-top:1px">确认销售单，执行发货</div></div>
            <span v-if="pendingOut > 0" class="badge badge-purple">{{ pendingOut }}</span>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3);margin-left:4px" />
          </div>
        </div>

        <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">分装加工</div>
        <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border);margin-bottom:16px">
          <div class="menu-item" @click="router.push('/process')">
            <div class="menu-icon icon-amber"><i class="ti ti-refresh" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">分装录入</div><div style="font-size:12px;color:var(--text3);margin-top:1px">录入原料消耗与成品产出</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
        </div>

        <div style="font-size:11px;font-weight:500;color:var(--text3);letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px 2px">查询</div>
        <div style="border-radius:var(--radius);overflow:hidden;border:0.5px solid var(--border)">
          <div class="menu-item" @click="router.push('/inventory')">
            <div class="menu-icon icon-blue"><i class="ti ti-chart-bar" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">实时库存总览</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有商品当前库存</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/inbound')">
            <div class="menu-icon icon-teal"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">入库历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有入库记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
          <div class="menu-item" @click="router.push('/history/processing')">
            <div class="menu-icon icon-amber"><i class="ti ti-history" /></div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">加工历史</div><div style="font-size:12px;color:var(--text3);margin-top:1px">查看所有分装加工记录</div></div>
            <i class="ti ti-chevron-right" style="font-size:16px;color:var(--text3)" />
          </div>
        </div>
      </template>

    </div>
  </div>
</template>