<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getProcessingHistory } from '../api/index.js'

const router  = useRouter()
const records = ref([])
const loading = ref(true)
const error   = ref('')

onMounted(async () => {
  try {
    records.value = await getProcessingHistory()
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
      <span class="topbar-title">加工历史</span>
    </div>

    <div class="body">
      <div v-if="loading" class="empty"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite" />加载中…</div>
      <div v-else-if="error" class="hint-box hint-bad"><i class="ti ti-alert-circle" />{{ error }}</div>
      <div v-else-if="records.length === 0" class="empty"><i class="ti ti-inbox" />暂无加工记录</div>

      <div
        v-for="r in records" :key="r.id"
        style="background:var(--bg2);border-radius:var(--radius);border:0.5px solid var(--border);padding:13px 14px;margin-bottom:8px"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="font-size:14px;font-weight:700">{{ r.proc_no }}</div>
          <span class="badge badge-amber">分装</span>
        </div>
        <div style="background:var(--teal-light);border-radius:var(--radius-sm);padding:8px 12px;margin-bottom:6px">
          <div style="font-size:11px;font-weight:600;color:var(--text3);letter-spacing:.04em;margin-bottom:6px">原料消耗</div>
          <!-- 将 "品名:批次×数量,..." 格式拆分成独立行 -->
          <template v-for="(seg, idx) in r.in_batch_no.split(',')" :key="idx">
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding:3px 0;border-bottom:0.5px solid rgba(0,0,0,.06)">
              <div>
                <div style="font-size:13px;font-weight:500">{{ seg.trim().split(':')[0] }}</div>
                <div style="font-size:11px;color:var(--text3);margin-top:1px">批次 {{ seg.trim().split(':')[1]?.split('×')[0] }}</div>
              </div>
              <div style="font-size:13px;font-weight:700;color:var(--red)">−{{ seg.trim().split('×')[1] }}</div>
            </div>
          </template>
          <div style="display:flex;justify-content:space-between;padding-top:6px;font-size:12px;color:var(--text3)">
            <span>合计消耗</span>
            <span style="font-weight:700;color:var(--red)">−{{ r.in_qty }}</span>
          </div>
        </div>
        <div style="text-align:center;font-size:16px;color:var(--text3);padding:2px 0"><i class="ti ti-arrow-down" /></div>
        <div style="background:var(--purple-light);border-radius:var(--radius-sm);padding:4px 12px;margin-top:6px">
          <div class="info-row"><span class="info-key">成品</span><span class="info-val">{{ r.out_product_name }}</span></div>
          <div class="info-row"><span class="info-key">批次</span><span class="info-val">{{ r.out_batch_no }}</span></div>
          <div v-if="r.out_location" class="info-row"><span class="info-key">存放位置</span><span class="info-val">{{ r.out_location }}</span></div>
          <div class="info-row" style="border:none"><span class="info-key">产出数量</span><span style="font-weight:700;color:var(--teal)">+{{ r.out_qty }}</span></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text3);margin-top:8px">
          <span>操作人：{{ r.created_by_name || '—' }}</span>
          <span>{{ fmtDate(r.created_at) }}</span>
        </div>
        <div v-if="r.note" style="font-size:12px;color:var(--text3);margin-top:4px">备注：{{ r.note }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>