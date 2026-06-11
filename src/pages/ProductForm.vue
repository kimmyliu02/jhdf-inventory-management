<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createProduct } from '../api/index.js'

const router = useRouter()

const name = ref('')
const spec = ref('')
const unit = ref('包')
const unitAlt1 = ref('')
const unitAlt2 = ref('')
const type = ref('raw')
const loading = ref(false)
const done = ref(false)
const created = ref(null)

const isValid = computed(() =>
  name.value.trim() &&
  spec.value.trim() &&
  unit.value.trim() &&
  ['raw', 'packed'].includes(type.value)
)

async function submit() {
  if (!isValid.value) {
    alert('请填写品名、规格、单位和类型')
    return
  }

  loading.value = true
  try {
    const res = await createProduct({
      name: name.value.trim(),
      spec: spec.value.trim(),
      unit: unit.value.trim(),
      unit_alt1: unitAlt1.value.trim(),
      unit_alt2: unitAlt2.value.trim(),
      type: type.value,
    })

    created.value = res
    done.value = true
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

function reset() {
  name.value = ''
  spec.value = ''
  unit.value = '包'
  unitAlt1.value = ''
  unitAlt2.value = ''
  type.value = 'raw'
  done.value = false
  created.value = null
}
</script>

<template>
  <div class="screen">
    <div class="topbar">
      <span class="back-btn" @click="router.push('/')">
        <i class="ti ti-arrow-left" />
      </span>
      <span class="topbar-title">新增品名</span>
    </div>

    <template v-if="done">
      <div class="success-wrap">
        <div class="success-icon" style="background:var(--teal-light);color:var(--teal)">
          <i class="ti ti-circle-check" />
        </div>
        <div class="success-title">新增成功</div>
        <div class="success-sub">
          {{ created?.name }}<br>
          {{ created?.spec }} · {{ created?.unit }} · {{ created?.type === 'raw' ? '原料' : '成品' }}
        </div>

        <button class="btn btn-teal" style="margin-top:28px" @click="reset">
          继续新增
        </button>
        <button class="btn btn-ghost" @click="router.push('/')">
          返回首页
        </button>
      </div>
    </template>

    <template v-else>
      <div class="body">
        <div class="section-header">
          <i class="ti ti-package" />品名信息
        </div>

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
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>