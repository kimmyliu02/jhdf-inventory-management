<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/index.js'

const router   = useRouter()
const username = ref('')
const password = ref('')
const error    = ref('')
const loading  = ref(false)

async function doLogin() {
  error.value   = ''
  loading.value = true
  try {
    await login(username.value, password.value)
    router.replace('/')
  } catch (e) {
    error.value = e.message || '用户名或密码错误'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="screen" style="justify-content:center;background:var(--bg)">
    <div style="padding:40px 24px">

      <div style="text-align:center;margin-bottom:36px">
        <div style="width:64px;height:64px;border-radius:18px;background:var(--teal-light);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:30px;color:var(--teal)">
          <i class="ti ti-building-warehouse" />
        </div>
        <div style="font-size:20px;font-weight:700;color:var(--text)">嘉和鼎丰</div>
        <div style="font-size:13px;color:var(--text3);margin-top:4px">仓库管理系统</div>
      </div>

      <div class="field-group">
        <label class="field-label">用户名</label>
        <input
          type="text"
          placeholder="请输入用户名"
          v-model="username"
          autocomplete="username"
          @keyup.enter="doLogin"
        >
      </div>

      <div class="field-group">
        <label class="field-label">密码</label>
        <input
          type="text"
          placeholder="请输入密码"
          v-model="password"
          autocomplete="current-password"
          @keyup.enter="doLogin"
          style="-webkit-text-security:disc"
        >
      </div>

      <div v-if="error" class="hint-box hint-bad" style="margin-bottom:12px">
        <i class="ti ti-alert-circle" />{{ error }}
      </div>

      <button class="btn btn-teal" style="margin-top:4px" @click="doLogin" :disabled="loading">
        <i class="ti ti-loader-2" v-if="loading" style="animation:spin 1s linear infinite" />
        <i class="ti ti-login" v-else />
        {{ loading ? '登录中…' : '登录' }}
      </button>

      <div style="text-align:center;font-size:12px;color:var(--text3);margin-top:20px">
        忘记密码请联系技术人员
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin { to { transform: rotate(360deg) } }
</style>