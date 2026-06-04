<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router   = useRouter()
const username = ref('')
const password = ref('')
const error    = ref('')

// Hardcoded accounts — replace with your real names/passwords
// role: 'company' = 公司端, 'warehouse' = 仓库端
const ACCOUNTS = [
  { username: 'admin',    password: '1234', role: 'company',   name: '管理员' },
  { username: 'company1', password: '1234', role: 'company',   name: '采购员' },
  { username: 'warehouse1', password: '1234', role: 'warehouse', name: '李师傅' },
  { username: 'warehouse2', password: '1234', role: 'warehouse', name: '王师傅' },
]

function login() {
  error.value = ''
  const account = ACCOUNTS.find(
    a => a.username === username.value.trim() && a.password === password.value
  )
  if (!account) {
    error.value = '用户名或密码错误'
    return
  }
  // Save session to localStorage
  localStorage.setItem('wh_user', JSON.stringify({ username: account.username, name: account.name, role: account.role }))
  router.replace('/')
}
</script>

<template>
  <div class="screen" style="justify-content:center;background:var(--bg)">
    <div style="padding:40px 24px">

      <!-- Logo area -->
      <div style="text-align:center;margin-bottom:36px">
        <div style="width:64px;height:64px;border-radius:18px;background:var(--teal-light);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:30px;color:var(--teal)">
          <i class="ti ti-building-warehouse" />
        </div>
        <div style="font-size:20px;font-weight:700;color:var(--text)">仓库管理系统</div>
        <div style="font-size:13px;color:var(--text3);margin-top:4px">淀粉工厂</div>
      </div>

      <!-- Form -->
      <div class="field-group">
        <label class="field-label">用户名</label>
        <input
          type="text"
          placeholder="请输入用户名"
          v-model="username"
          autocomplete="username"
          @keyup.enter="login"
        >
      </div>

      <div class="field-group">
        <label class="field-label">密码</label>
        <input
          type="password"
          placeholder="请输入密码"
          v-model="password"
          autocomplete="current-password"
          @keyup.enter="login"
        >
      </div>

      <div v-if="error" class="hint-box hint-bad" style="margin-bottom:12px">
        <i class="ti ti-alert-circle" />{{ error }}
      </div>

      <button class="btn btn-teal" style="margin-top:4px" @click="login">
        <i class="ti ti-login" />登录
      </button>

      <div style="text-align:center;font-size:12px;color:var(--text3);margin-top:20px">
        忘记密码请联系管理员
      </div>
    </div>
  </div>
</template>
