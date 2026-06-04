import './assets/main.css'

import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import { setupGuard } from './composables/useAuth.js'

import LoginPage    from './pages/LoginPage.vue'
import Home         from './pages/Home.vue'
import InboundList  from './pages/InboundList.vue'
import InboundForm  from './pages/InboundForm.vue'
import OutboundList from './pages/OutboundList.vue'
import OutboundForm from './pages/OutboundForm.vue'
import ProcessForm  from './pages/ProcessForm.vue'
import Inventory    from './pages/Inventory.vue'
import PurchaseForm from './pages/PurchaseForm.vue'
import SalesForm    from './pages/SalesForm.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login',         component: LoginPage },
    { path: '/',              component: Home },
    { path: '/inbound',       component: InboundList },
    { path: '/inbound/:id',   component: InboundForm },
    { path: '/outbound',      component: OutboundList },
    { path: '/outbound/:id',  component: OutboundForm },
    { path: '/process',       component: ProcessForm },
    { path: '/inventory',     component: Inventory },
    { path: '/purchase',      component: PurchaseForm },
    { path: '/sales',         component: SalesForm },
  ],
})

// Auth guard — redirects to /login if not logged in,
// and blocks wrong-role access
setupGuard(router)

const app = createApp(App)
app.use(router)
app.mount('#app')
