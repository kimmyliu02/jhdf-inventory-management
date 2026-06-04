// src/composables/useAuth.js
// Auth state shared across all pages.

export function useAuth() {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('wh_user')) || null
    } catch {
      return null
    }
  }

  function logout(router) {
    localStorage.removeItem('wh_user')
    router.replace('/login')
  }

  function isCompany() {
    return getUser()?.role === 'company'
  }

  function isWarehouse() {
    return getUser()?.role === 'warehouse'
  }

  return { getUser, logout, isCompany, isWarehouse }
}

// Route guard — call this in main.js
export function setupGuard(router) {
  const PUBLIC_ROUTES = ['/login']

  // Pages only company can access
  const COMPANY_ONLY  = ['/purchase', '/sales']
  // Pages only warehouse can access
  const WAREHOUSE_ONLY = ['/inbound', '/outbound', '/process']

  router.beforeEach((to) => {
    const user = (() => {
      try { return JSON.parse(localStorage.getItem('wh_user')) } catch { return null }
    })()

    // Not logged in → go to login
    if (!user && !PUBLIC_ROUTES.includes(to.path)) {
      return '/login'
    }

    // Logged in but trying to access login page → go home
    if (user && to.path === '/login') {
      return '/'
    }

    // Role-based access
    if (user?.role === 'warehouse' && COMPANY_ONLY.some(p => to.path.startsWith(p))) {
      return '/'
    }
    if (user?.role === 'company' && WAREHOUSE_ONLY.some(p => to.path.startsWith(p))) {
      return '/'
    }
  })
}
