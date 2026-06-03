<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getById, updateRecord, writeLedger, genNo } from '../db/index.js'

const router = useRouter()
const route  = useRoute()

const order  = ref(null)
const qty    = ref('')
const remark = ref('')
const done   = ref(false)
const doneNo = ref('')

onMounted(async () => {
  order.value = await getById('purchase_orders', Number(route.params.id))
})

const hint = computed(() => {
  const v = parseInt(qty.value) || 0
  if (!v || !order.value) return null
  const diff = v - order.value.qty
  if (diff === 0) return { type: 'hint-ok',   icon: 'ti-circle-check',    text: '实收与采购数量一致' }
  if (Math.abs(diff) / order.value.qty <= 0.05)
    return { type: 'hint-warn', icon: 'ti-alert-triangle', text: `差异 ${diff > 0 ? '+' : ''}${diff} ${order.value.unit}，请核实` }
  return { type: 'hint-bad', icon: 'ti-alert-circle', text: `差异过大（${diff > 0 ? '+' : ''}${diff} ${order.value.unit}），请核实后提交` }
})

async function submit() {
  const q = parseInt(qty.value)
  if (!q || q <= 0) return alert('请填写实收数量')
  const o = order.value
  await updateRecord('purchase_orders', { ...o, status: 'done', actualQty: q, completedAt: new Date().toISOString() })
  await writeLedger({ productId: o.productId, productName: o.productName, batchNo: o.batchNo, type: 'inbound', qtyChange: q, refNo: o.orderNo, note: remark.value })
  doneNo.value = genNo('IN')
  done.value   = true
}
</script>

<template>
  <div class="screen" v-if="order">

    <!-- Success state -->
    <template v-if="done">
      <div class="topbar">
        <span class="back-btn" @click="router.push('/inbound')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">入库验收</span>
      </div>
      <div class="success-wrap">
        <div class="success-icon" style="background:var(--teal-light);color:var(--teal)"><i class="ti ti-circle-check" /></div>
        <div class="success-title">入库成功</div>
        <div class="success-sub">{{ order.productName }} +{{ qty }} {{ order.unit }}<br>库存已自动更新</div>
        <div class="success-tag" style="background:var(--teal-light);color:var(--teal-dark)">入库单号：{{ doneNo }}</div>
        <button class="btn btn-teal" style="margin-top:28px" @click="router.push('/inbound')">继续下一单</button>
        <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
      </div>
    </template>

    <!-- Form state -->
    <template v-else>
      <div class="topbar">
        <span class="back-btn" @click="router.push('/inbound')"><i class="ti ti-arrow-left" /></span>
        <span class="topbar-title">入库验收</span>
        <span class="badge badge-amber">待入库</span>
      </div>
      <div class="body">
        <!-- Order header -->
        <div class="card">
          <div style="font-size:15px;font-weight:700">{{ order.orderNo }}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:3px">发货方：{{ order.shipper }}</div>
        </div>

        <!-- Read-only info -->
        <div class="section-header"><i class="ti ti-file-text" />采购单信息（只读）</div>
        <div class="info-block">
          <div class="info-row"><span class="info-key">品名</span><span class="info-val">{{ order.productName }}</span></div>
          <div class="info-row"><span class="info-key">规格</span><span class="info-val">{{ order.spec }}</span></div>
          <div class="info-row"><span class="info-key">批次号</span><span class="info-val">{{ order.batchNo }}</span></div>
          <div class="info-row"><span class="info-key">应收数量</span><span class="info-val" style="color:var(--teal)">{{ order.qty }} {{ order.unit }}</span></div>
        </div>

        <!-- Editable fields -->
        <div class="section-header"><i class="ti ti-edit" />验收录入</div>

        <div class="field-group">
          <label class="field-label">实收数量<span class="req">*</span></label>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" min="0" placeholder="请输入实收数量" v-model="qty" style="flex:1">
            <span style="font-size:13px;color:var(--text2);white-space:nowrap">{{ order.unit }}</span>
          </div>
          <div v-if="hint" :class="['hint-box', hint.type]">
            <i :class="['ti', hint.icon]" />{{ hint.text }}
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">存放库位</label>
          <select>
            <option>A区 - 01货架</option>
            <option>A区 - 02货架</option>
            <option>B区 - 01货架</option>
            <option>B区 - 02货架</option>
          </select>
        </div>

        <div class="field-group">
          <label class="field-label">备注</label>
          <textarea rows="2" placeholder="如有短缺或破损请说明…" v-model="remark" />
        </div>

        <div class="field-group">
          <label class="field-label">拍照存档</label>
          <div class="photo-btn"><i class="ti ti-camera" style="font-size:18px" /><span>拍照 / 从相册选取</span></div>
        </div>

        <button class="btn btn-teal" @click="submit"><i class="ti ti-check" />确认入库</button>
        <button class="btn btn-ghost" @click="router.push('/inbound')">返回列表</button>
      </div>
    </template>
  </div>
</template>
