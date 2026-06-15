<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createProduct, getAllProducts, deactivateProduct, reactivateProduct } from '../api/index.js'

const router = useRouter()

const tab = ref('add') // 'add' | 'manage'

const name     = ref('')
const spec     = ref('')
const unit     = ref('包')
const unitAlt1 = ref('')
const unitAlt2 = ref('')
const type     = ref('raw')
const loading  = ref(false)
const done     = ref(false)
const created  = ref(null)

const isValid = computed(() =>
  name.value.trim() && spec.value.trim() && unit.value.trim() && ['raw','packed'].includes(type.value)
)

async function submit() {
  if (!isValid.value) { alert('请填写品名、规格、单位和类型'); return }
  loading.value = true
  try {
    const res = await createProduct({
      name: name.value.trim(), spec: spec.value.trim(),
      unit: unit.value.trim(), unit_alt1: unitAlt1.value.trim(),
      unit_alt2: unitAlt2.value.trim(), type: type.value,
    })
    created.value = res
    done.value = true
    await loadProducts()
  } catch (e) { alert(e.message) }
  finally { loading.value = false }
}

function reset() {
  name.value = ''; spec.value = ''; unit.value = '包'
  unitAlt1.value = ''; unitAlt2.value = ''; type.value = 'raw'
  done.value = false; created.value = null
}

// ── 管理 tab ──
const allProducts  = ref([])
const filterType   = ref('all')   // 'all' | 'raw' | 'packed'
const filterStatus = ref('active') // 'active' | 'inactive'
const actionLoading = ref(null)

const filteredProducts = computed(() => {
  return allProducts.value.filter(p => {
    const matchType   = filterType.value === 'all' || p.type === filterType.value
    const matchStatus = filterStatus.value === 'active' ? p.is_active : !p.is_active
    return matchType && matchStatus
  })
})

async function loadProducts() {
  allProducts.value = await getAllProducts()
}

async function toggleActive(p) {
  actionLoading.value = p.id
  try {
    if (p.is_active) {
      await deactivateProduct(p.id)
    } else {
      await reactivateProduct(p.id)
    }
    await loadProducts()
  } catch (e) { alert(e.message) }
  finally { actionLoading.value = null }
}

onMounted(loadProducts)
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <span class="back-btn" @click="router.push('/')"><i class="ti ti-arrow-left" /></span>
      <span class="topbar-title">品名管理</span>
    </div>

    <!-- Tab 切换 -->
    <div style="display:flex;border-bottom:0.5px solid var(--border);background:var(--bg2)">
      <div
        v-for="t in [{ key:'add', label:'新增品名' }, { key:'manage', label:'管理品名' }]"
        :key="t.key"
        @click="tab = t.key; if(t.key==='add') reset()"
        style="flex:1;text-align:center;padding:11px 0;font-size:13px;font-weight:500;cursor:pointer;transition:color .15s"
        :style="tab === t.key
          ? 'color:var(--teal);border-bottom:2px solid var(--teal);margin-bottom:-0.5px'
          : 'color:var(--text3)'"
      >{{ t.label }}</div>
    </div>

    <!-- ── 新增 tab ── -->
    <template v-if="tab === 'add'">
      <template v-if="done">
        <div class="success-wrap">
          <div class="success-icon" style="background:var(--teal-light);color:var(--teal)"><i class="ti ti-circle-check" /></div>
          <div class="success-title">新增成功</div>
          <div class="success-sub">{{ created?.name }}<br>{{ created?.spec }} · {{ created?.unit }} · {{ created?.type === 'raw' ? '原料' : '成品' }}</div>
          <button class="btn btn-teal" style="margin-top:28px" @click="reset">继续新增</button>
          <button class="btn btn-ghost" @click="tab='manage'">查看品名列表</button>
          <button class="btn btn-ghost" @click="router.push('/')">返回首页</button>
        </div>
      </template>
      <template v-else>
        <div class="body">
          <div class="section-header"><i class="ti ti-tag-plus" />品名信息</div>
          <div class="field-group">
            <label class="field-label">类型<span class="req">*</span></label>
            <select v-model="type">
              <option value="raw">原料</option>
              <option value="packed">成品</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label">品名<span class="req">*</span></label>
            <input type="text" placeholder="例如：25kg马铃薯淀粉（淀发）" v-model="name">
          </div>
          <div class="field-group">
            <label class="field-label">规格<span class="req">*</span></label>
            <input type="text" placeholder="例如：1*25kg*40包" v-model="spec">
          </div>
          <div class="field-group">
            <label class="field-label">主单位<span class="req">*</span></label>
            <input type="text" placeholder="例如：包 / kg / 袋" v-model="unit">
          </div>
          <div class="field-group">
            <label class="field-label">辅助单位 1</label>
            <input type="text" placeholder="可选，例如：kg" v-model="unitAlt1">
          </div>
          <div class="field-group">
            <label class="field-label">辅助单位 2</label>
            <input type="text" placeholder="可选，例如：袋" v-model="unitAlt2">
          </div>
          <button class="btn btn-teal" @click="submit" :disabled="loading">
            <i class="ti ti-loader-2" v-if="loading" style="animation:spin 1s linear infinite" />
            <i class="ti ti-plus" v-else />
            {{ loading ? '提交中…' : '确认新增' }}
          </button>
        </div>
      </template>
    </template>

    <!-- ── 管理 tab ── -->
    <template v-else>
      <div class="body">
        <!-- 筛选栏 -->
        <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
          <div style="display:flex;border-radius:var(--radius-sm);overflow:hidden;border:0.5px solid var(--border)">
            <div v-for="f in [['all','全部'],['raw','原料'],['packed','成品']]" :key="f[0]"
              @click="filterType=f[0]"
              style="padding:6px 12px;font-size:12px;cursor:pointer"
              :style="filterType===f[0] ? 'background:var(--teal);color:#fff;font-weight:600' : 'background:var(--bg2);color:var(--text3)'"
            >{{ f[1] }}</div>
          </div>
          <div style="display:flex;border-radius:var(--radius-sm);overflow:hidden;border:0.5px solid var(--border)">
            <div v-for="f in [['active','启用中'],['inactive','已停用']]" :key="f[0]"
              @click="filterStatus=f[0]"
              style="padding:6px 12px;font-size:12px;cursor:pointer"
              :style="filterStatus===f[0] ? 'background:var(--teal);color:#fff;font-weight:600' : 'background:var(--bg2);color:var(--text3)'"
            >{{ f[1] }}</div>
          </div>
        </div>

        <div v-if="filteredProducts.length === 0" class="empty">
          <i class="ti ti-inbox" />暂无品名
        </div>

        <div
          v-for="p in filteredProducts" :key="p.id"
          style="background:var(--bg2);border-radius:var(--radius);border:0.5px solid var(--border);padding:11px 13px;margin-bottom:8px;display:flex;align-items:center;gap:10px"
          :style="!p.is_active ? 'opacity:0.55' : ''"
        >
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;font-weight:600;color:var(--text1)">{{ p.name }}</span>
              <span class="badge" :class="p.type==='raw' ? 'badge-teal' : 'badge-purple'" style="font-size:10px">{{ p.type==='raw' ? '原料' : '成品' }}</span>
            </div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">{{ p.spec }} · {{ p.unit }}</div>
          </div>
          <button
            @click="toggleActive(p)"
            :disabled="actionLoading === p.id"
            style="flex-shrink:0;border:none;border-radius:var(--radius-sm);padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s"
            :style="p.is_active
              ? 'background:#FEE2E2;color:#B91C1C'
              : 'background:var(--teal-light);color:var(--teal-dark)'"
          >
            <i v-if="actionLoading===p.id" class="ti ti-loader-2" style="animation:spin 1s linear infinite" />
            <span v-else>{{ p.is_active ? '停用' : '恢复' }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>
