<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getAllStock, getProducts } from '../api/index.js'

const router   = useRouter()
const allRows  = ref([])
const prodMap  = ref({})
const filter   = ref('all')
const search   = ref('')
const loading  = ref(true)
const error    = ref('')

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const [prods, stock] = await Promise.all([getProducts(), getAllStock()])
    prodMap.value = Object.fromEntries(prods.map(p => [p.id, p]))
    allRows.value = stock.map(s => ({
      ...s,
      product: prodMap.value[s.product_id],
    })).filter(s => s.product)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

const visible = computed(() => allRows.value.filter(r => {
  if (filter.value === 'raw'    && r.product.type !== 'raw')    return false
  if (filter.value === 'packed' && r.product.type !== 'packed') return false
  if (filter.value === 'loc_raw' && r.location !== '原材料') return false
  if (filter.value === 'loc_finished' && r.location !== '成品') return false
  if (filter.value === 'loc_oem' && r.location !== '代加工') return false
  if (filter.value === 'low'    && r.qty >= 20)                  return false

  if (search.value) {
    const q = search.value.toLowerCase()
    if (
      !r.product.name.includes(search.value) &&
      !r.batch_no.toLowerCase().includes(q) &&
      !(r.location || '').includes(search.value)
    ) return false
  }

  return true
}))

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'raw', label: '原料' },
  { key: 'packed', label: '成品' },
  { key: 'loc_raw', label: '原材料' },
  { key: 'loc_finished', label: '成品区' },
  { key: 'loc_oem', label: '代加工' },
  { key: 'low', label: '库存偏低' },
]
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
      <span class="topbar-title">实时库存总览</span>
      <i class="ti ti-refresh" style="font-size:18px;color:var(--teal);cursor:pointer" @click="load" />
    </div>

    <div class="body">
      <input type="text" placeholder="搜索品名 / 批次号…" v-model="search" style="margin-bottom:10px">

      <div style="display:flex;gap:6px;margin-bottom:12px;overflow-x:auto;padding-bottom:2px">
        <button
          v-for="f in FILTERS" :key="f.key" @click="filter = f.key"
          :style="{
            fontSize:'12px', fontWeight:500, padding:'6px 13px',
            borderRadius:'20px',
            border: filter === f.key ? '0.5px solid var(--teal)' : '0.5px solid var(--border2)',
            background: filter === f.key ? 'var(--teal-light)' : 'transparent',
            color: filter === f.key ? 'var(--teal-dark)' : 'var(--text2)',
            cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit',
          }"
        >{{ f.label }}</button>
      </div>

      <div v-if="loading" class="empty"><i class="ti ti-loader-2" style="animation:spin 1s linear infinite" />加载中…</div>
      <div v-else-if="error" class="hint-box hint-bad"><i class="ti ti-alert-circle" />{{ error }}</div>
      <div v-else-if="visible.length === 0" class="empty"><i class="ti ti-package-off" />没有符合条件的商品</div>

      <div
        v-for="r in visible"
        :key="`${r.product_id}-${r.batch_no}`"
        :style="{
          background:'var(--bg2)', borderRadius:'var(--radius)',
          border: r.qty < 20 ? '0.5px solid rgba(163,45,45,.25)' : '0.5px solid var(--border)',
          padding:'13px 14px', marginBottom:'8px',
        }"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:14px;font-weight:700">{{ r.product.name }}</div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">
              {{ r.product.spec }} · 批次：{{ r.batch_no }}
            </div>
            <div style="font-size:12px;color:var(--text3);margin-top:2px">
              存放位置：{{ r.location || '—' }}
            </div>
          </div>
          <span :class="['badge', r.product.type === 'raw' ? 'badge-teal' : 'badge-purple']">
            {{ r.product.type === 'raw' ? '原料' : '成品' }}
          </span>
        </div>
        <div style="margin-top:10px">
          <span :style="{ fontSize:'26px', fontWeight:700, lineHeight:1, color: r.qty < 20 ? 'var(--red)' : 'var(--text)' }">
            {{ r.qty }}
          </span>
          <span style="font-size:12px;color:var(--text3);margin-left:5px">{{ r.product.unit }}</span>
          <div v-if="r.qty < 20" style="font-size:11px;color:var(--red);font-weight:500;margin-top:3px">
            <i class="ti ti-alert-triangle" /> 库存偏低
          </div>
        </div>
      </div>

      <div style="text-align:center;padding:14px 0;font-size:11px;color:var(--text3)">
        数据实时同步
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>
