// src/composables/useAuth.js
import { login as apiLogin, logout as apiLogout, getUser } from '../api/index.js'

export function useAuth() {
  function logout(router) {
    apiLogout(router)
  }

  function isCompany() {
    return getUser()?.role === 'company'
  }

  function isWarehouse() {
    return getUser()?.role === 'warehouse'
  }

  function isReadonly() {
    return getUser()?.role === 'readonly'
  }

  return { getUser, logout, isCompany, isWarehouse, isReadonly }
}

export function setupGuard(router) {
  const PUBLIC_ROUTES  = ['/login']
  const COMPANY_ONLY   = ['/purchase', '/sales']
  const WAREHOUSE_ONLY = ['/process']

  router.beforeEach((to) => {
    const user = getUser()

    if (!user && !PUBLIC_ROUTES.includes(to.path)) return '/login'
    if (user && to.path === '/login') return '/'

    // readonly can only access / and /inventory and /history
    if (user?.role === 'readonly') {
      const allowed = ['/', '/inventory', '/history/inbound', '/history/outbound', '/history/processing']
      if (!allowed.some(p => to.path === p)) return '/'
    }
    
    if (user?.role === 'warehouse' && COMPANY_ONLY.some(p => to.path.startsWith(p))) return '/'
    if (user?.role === 'company' && WAREHOUSE_ONLY.some(p => to.path.startsWith(p))) return '/'
  })
}