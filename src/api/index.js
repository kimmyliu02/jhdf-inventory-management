// src/api/index.js
// All HTTP calls to the backend go through here.
// Pages import from this file instead of db/index.js

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Token helpers
function getToken() {
  return localStorage.getItem('wh_token')
}

function saveSession(token, user) {
  localStorage.setItem('wh_token', token)
  localStorage.setItem('wh_user', JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem('wh_token')
  localStorage.removeItem('wh_user')
}

// Base fetch wrapper
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (res.status === 401) {
    clearSession()
    window.location.hash = '#/login'
    throw new Error('请重新登录')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

// Auth
export async function login(username, password) {
  const data = await api('POST', '/api/auth/login', { username, password })
  saveSession(data.token, data.user)
  return data.user
}

export function logout(router) {
  clearSession()
  router.replace('/login')
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('wh_user')) } catch { return null }
}

// Products
export async function getProducts() {
  return api('GET', '/api/products')
}

// Inventory
export async function getAllStock() {
  return api('GET', '/api/inventory')
}

export async function getLiveStock(productId, batchNo) {
  const data = await api('GET', `/api/inventory/${productId}/${encodeURIComponent(batchNo)}`)
  return data.qty
}

// Purchase orders
export async function getPurchaseOrders(status) {
  const q = status ? `?status=${status}` : ''
  return api('GET', `/api/purchase-orders${q}`)
}

export async function createPurchaseOrder(data) {
  return api('POST', '/api/purchase-orders', data)
}

export async function confirmInbound(orderId, data) {
  return api('POST', `/api/purchase-orders/${orderId}/inbound`, data)
}

// Sales orders 
export async function getSalesOrders(status) {
  const q = status ? `?status=${status}` : ''
  return api('GET', `/api/sales-orders${q}`)
}

export async function createSalesOrder(data) {
  return api('POST', '/api/sales-orders', data)
}

export async function confirmOutbound(orderId, data) {
  return api('POST', `/api/sales-orders/${orderId}/outbound`, data)
}

// Processing
export async function createProcessing(data) {
  return api('POST', '/api/processing', data)
}

// History
export async function getInboundHistory() { 
  return api('GET', '/api/history/inbound') 
}
export async function getOutboundHistory() {
  return api('GET', '/api/history/outbound') 
}
export async function getProcessingHistory() {
  return api('GET', '/api/history/processing') 
}

// cancel order option
export async function cancelPurchaseOrder(orderId) {
  return api('DELETE', `/api/purchase-orders/${orderId}`)
}

export async function cancelSalesOrder(orderId) {
  return api('DELETE', `/api/sales-orders/${orderId}`)
}