<script setup>
import { t } from '../../utils/language.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import api from '../../service/api_services'
import { getCheckout, setCheckout, clearCheckout } from './order_checkout'
import { loadCardLayout } from '../../utils/cardLayout'

const router = useRouter()
const route = useRoute()
const viewingOrder = computed(() => typeof route.query.viewOrder === 'string' && !!route.query.viewOrder)
const existingOrder = ref(null)
const canEditOrder = computed(() => !viewingOrder.value || (!!existingOrder.value && Number(existingOrder.value.docstatus) === 0 && !['Submitted', 'Cancelled'].includes(existingOrder.value.status)))
const viewingError = ref('')
const viewingLoading = ref(false)
const categories = ref([])
const brokenCartImages = ref({})
const selectedCategory = ref('all')
const search = ref('')
const cart = ref([])
const orderType = ref('Dine In')
const table = ref('')
const customer = ref('')
const cashier = ref('')
const openOrderField = ref('')
const linkOptions = ref({ table: [], customer: [] })
const linkErrors = ref({})
const cashierError = ref('')
const selectedCustomerName = computed(() => linkOptions.value.customer.find(item => item.name === customer.value)?.customer_name || customer.value)
const loading = ref(false)
const error = ref('')
const submitting = ref(false)
const orderError = ref('')
const orderSuccess = ref('')
const mobileOrderView = ref(false)
const mobileOrderHeading = ref(null)
const menuHeading = ref(null)
const exitDialog = ref(null)
const cardLayout = ref(loadCardLayout())
const productGridStyle = computed(() => {
  const { width, height, columns } = cardLayout.value
  const style = {}
  if (columns) style.gridTemplateColumns = `repeat(${columns}, minmax(0, ${width ? `${width}px` : '1fr'}))`
  else if (width) style.gridTemplateColumns = `repeat(auto-fill, minmax(min(100%, ${width}px), ${width}px))`
  if (height) style['--order-card-height'] = `${height}px`
  return style
})
let resolveExit = null
let exitPromise = null
let allowNextExit = false

function finishExit() {
  const leave = exitDialog.value?.returnValue === 'leave'
  if (leave) clearCheckout()
  const resolve = resolveExit
  resolveExit = null
  exitPromise = null
  resolve?.(leave)
}

async function confirmExitOrder(allowNextRoute = false) {
  if (!cart.value.length) return true
  if (!exitPromise) {
    exitPromise = new Promise(resolve => { resolveExit = resolve })
    exitDialog.value.returnValue = ''
    exitDialog.value.showModal()
  }
  const leave = await exitPromise
  if (leave && allowNextRoute) allowNextExit = true
  return leave
}

function guardOrderExit(to) {
  if (to.name === 'order-payment') return true
  if (allowNextExit) { allowNextExit = false; return true }
  return confirmExitOrder()
}

onBeforeRouteLeave(guardOrderExit)
onBeforeRouteUpdate((to, from) => to.fullPath === from.fullPath ? true : guardOrderExit(to))
onBeforeUnmount(() => { if (resolveExit) { resolveExit(false); resolveExit = null; exitPromise = null } })
defineExpose({ confirmExitOrder })

async function showMobileOrder(show) {
  mobileOrderView.value = show
  openOrderField.value = ''
  await nextTick()
  window.scrollTo({ top: 0 })
  const heading = show ? mobileOrderHeading.value : menuHeading.value
  heading?.focus({ preventScroll: true })
}

const products = computed(() => categories.value
  .filter(category => selectedCategory.value === 'all' || category.name === selectedCategory.value)
  .flatMap(category => (category.products || []).filter(product => Number(product.available) === 1).map(product => ({ ...product, categoryName: category.category_name })))
  .filter(product => `${product.item_name || ''} ${product.item_code || ''}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const itemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const subtotal = computed(() => cart.value.reduce((sum, item) => sum + Number(item.selling_price || 0) * item.quantity, 0))
const money = value => `$${Number(value || 0).toFixed(2)}`
const imageUrl = value => !value ? '' : /^(https?:|data:|blob:)/i.test(value) ? value : `${(import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')}/${value.replace(/^\//, '')}`
const productImages = computed(() => new Map(categories.value.flatMap(category => (category.products || []).map(product => [product.name, product.image]))))
const cartImage = item => imageUrl(item.image || productImages.value.get(item.name))

async function loadProducts() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get('/api/method/coffee_shop.api.v1.product_category.get_products_by_category')
    if (!Array.isArray(response?.message)) throw new Error('Unexpected response')
    categories.value = response.message.filter(category => Number(category.enabled) === 1)
    brokenCartImages.value = {}
  } catch (err) {
    error.value = err.status === 401 || err.status === 403 ? 'You do not have access to the menu. Please sign in and check your permissions.' : 'We could not load the menu. Please check your connection and try again.'
  } finally {
    loading.value = false
  }
}
async function loadCashier() {
  try {
    const response = await api.get('/api/method/frappe.auth.get_logged_user')
    if (!response?.message || response.message === 'Guest') throw new Error('Not signed in')
    cashier.value = response.message
    cashierError.value = ''
  } catch {
    cashier.value = ''
    cashierError.value = 'Cashier unavailable. Please sign in again.'
  }
}
async function loadLinkOptions(key, doctype, selectFirst = false) {
  try {
    const response = await api.get(`/api/resource/${encodeURIComponent(doctype)}`, {
      params: { fields: key === 'customer' ? ['name', 'customer_name'] : ['name'], limit_page_length: 100, order_by: 'name asc' },
    })
    if (!Array.isArray(response?.data)) throw new Error('Unexpected response')
    linkOptions.value[key] = response.data
    if (key === 'customer' && selectFirst && !customer.value && response.data.length) customer.value = response.data[0].name
    linkErrors.value[key] = ''
  } catch {
    linkErrors.value[key] = key === 'customer' ? 'Could not load customers. Please check access and try again.' : 'Suggestions unavailable. Enter a valid record ID.'
  }
}
function toggleOrderField(key, doctype) {
  if (submitting.value || !canEditOrder.value) return
  openOrderField.value = openOrderField.value === key ? '' : key
  if (openOrderField.value) loadLinkOptions(key, doctype)
}
function addItem(product) {
  if (submitting.value || !canEditOrder.value) return
  orderSuccess.value = ''
  const existing = cart.value.find(item => item.name === product.name)
  if (existing) existing.quantity++
  else cart.value.push({ ...product, quantity: 1 })
}
function changeQuantity(name, amount) {
  if (submitting.value || !canEditOrder.value) return
  const item = cart.value.find(entry => entry.name === name)
  if (!item) return
  item.quantity += amount
  if (item.quantity <= 0) cart.value = cart.value.filter(entry => entry.name !== name)
}
function removeItem(item) {
  if (submitting.value || !canEditOrder.value) return
  cart.value = cart.value.filter(entry => entry !== item)
  orderSuccess.value = ''
  const saved = getCheckout()
  if (!viewingOrder.value && saved && !saved.attempt && !saved.result) {
    if (!cart.value.length) clearCheckout()
    else setCheckout({ ...saved, items: cart.value.map(entry => ({ name: entry.name, item_name: entry.item_name, quantity: entry.quantity, selling_price: entry.selling_price })) })
  }
}
async function createOrder() {
  if (submitting.value || !canEditOrder.value || !cart.value.length) return
  submitting.value = true
  orderError.value = ''
  orderSuccess.value = ''
  try {
    if (viewingOrder.value) {
      const latest = await api.get(`/api/resource/Coffee%20Order/${encodeURIComponent(existingOrder.value.name)}`)
      if (!latest?.data || Number(latest.data.docstatus) !== 0 || ['Submitted', 'Cancelled'].includes(latest.data.status) || latest.data.modified !== existingOrder.value.modified) {
        throw new Error('This order has changed or is no longer an editable draft. Reopen it before saving.')
      }
      const response = await api.put(`/api/resource/Coffee%20Order/${encodeURIComponent(existingOrder.value.name)}`, {
        order_type: orderType.value,
        table: table.value.trim() || null,
        customer: customer.value.trim() || null,
        items: cart.value.map(item => ({
          ...(item.source || {}),
          menu_item: item.name,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: Number(item.selling_price || 0),
          amount: Number(item.selling_price || 0) * item.quantity,
        })),
      })
      if (!response?.data?.name) throw new Error('The server did not return the saved order. Reopen it to check the result.')
      existingOrder.value = response.data
      cart.value = (response.data.items || []).map(item => ({ name: item.menu_item, item_name: item.item_name || item.menu_item, quantity: Number(item.quantity || 0), selling_price: Number(item.unit_price || 0), source: item }))
      orderSuccess.value = `Order ${response.data.name} updated.`
      return true
    }
    const response = await api.post('/api/resource/Coffee%20Order', {
      naming_series: 'O-.YYYY.MM.DD.-.###',
      order_type: orderType.value,
      ...(table.value.trim() ? { table: table.value.trim() } : {}),
      ...(customer.value.trim() ? { customer: customer.value.trim() } : {}),
      ...(cashier.value.trim() ? { cashier: cashier.value.trim() } : {}),
      status: 'Pending',
      payment_status: 'Unpaid',
      items: cart.value.map(item => ({
        menu_item: item.name,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: Number(item.selling_price || 0),
        amount: Number(item.selling_price || 0) * item.quantity,
      })),
    })
    if (!response?.data?.name) throw new Error('The server did not return an order ID.')
    orderSuccess.value = `Order ${response.data.name} saved as a draft.`
    cart.value = []
    clearCheckout()
    table.value = ''
    customer.value = linkOptions.value.customer[0]?.name || ''
    openOrderField.value = ''
    return true
  } catch (err) {
    orderError.value = viewingOrder.value && !err.status ? (err.message || 'Could not confirm the update. Reopen the order before retrying.') : err.status
      ? `Could not save the order (${err.status}). Check your access and the order details, then try again.`
      : 'Could not confirm whether the order was saved. Check Frappe before trying again to avoid a duplicate.'
    return false
  } finally {
    submitting.value = false
  }
}
async function openPayment() {
  if (!cart.value.length || submitting.value || !canEditOrder.value) return
  if (viewingOrder.value && !(await createOrder())) return
  setCheckout({ items: cart.value.map(item => ({ name: item.name, item_name: item.item_name, quantity: item.quantity, selling_price: item.selling_price })), orderType: orderType.value, table: table.value, customer: customer.value, cashier: cashier.value, ...(viewingOrder.value ? { orderId: existingOrder.value.name, discountAmount: Number(existingOrder.value.discount_amount || 0), taxRatePercent: Number(existingOrder.value.tax_rate_percent || 0) } : {}) })
  router.push({ name: 'order-payment' })
}
async function loadExistingOrder(id) {
  viewingLoading.value = true
  viewingError.value = ''
  try {
    const response = await api.get(`/api/resource/Coffee%20Order/${encodeURIComponent(id)}`)
    const record = response?.data
    if (!record || Number(record.docstatus) !== 0 || ['Submitted', 'Cancelled'].includes(record.status)) throw new Error('This order is no longer an editable draft or could not be found.')
    existingOrder.value = record
    orderType.value = record.order_type || 'Dine In'
    table.value = record.table || ''
    customer.value = record.customer || ''
    cart.value = (record.items || []).map(item => ({ name: item.menu_item, item_name: item.item_name || item.menu_item, quantity: Number(item.quantity || 0), selling_price: Number(item.unit_price || 0), source: item }))
  } catch (err) {
    viewingError.value = err.status ? 'Could not load the pending order. Check your access and try again.' : (err.message || 'Could not load the pending order.')
  } finally { viewingLoading.value = false }
}
onMounted(() => {
  const checkout = getCheckout()
  if (checkout?.attempt && !checkout.result) {
    router.replace({ name: 'order-payment' })
    return
  }
  if (viewingOrder.value) {
    if (window.matchMedia('(max-width: 700px)').matches) mobileOrderView.value = true
    loadExistingOrder(route.query.viewOrder)
    loadProducts()
    loadLinkOptions('customer', 'Coffee Customer')
    return
  }
  if (checkout?.result) clearCheckout()
  if (!checkout?.result && checkout?.items?.length) {
    cart.value = checkout.items
    orderType.value = checkout.orderType || 'Dine In'
    table.value = checkout.table || ''
    customer.value = checkout.customer || ''
  }
  loadProducts(); loadCashier(); loadLinkOptions('customer', 'Coffee Customer', true)
})
</script>

<template>
  <div class="sales-layout" :class="{ 'mobile-order-view': mobileOrderView }">
    <section class="menu-panel" aria-labelledby="menu-title">
      <div class="menu-heading"><div><p id="menu-title" ref="menuHeading" class="section-label" tabindex="-1">{{ t("THE MENU") }}</p></div><button class="refresh" type="button" :disabled="loading" @click="loadProducts">↻ <span>{{ t("Refresh") }}</span></button></div>
      <div class="search-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input v-model="search" type="search" :aria-label="t('Search products')" :placeholder="t('Search the menu...')"></div>
      <div class="category-tabs" :aria-label="t('Product categories')"><button type="button" :class="{ selected: selectedCategory === 'all' }" :aria-pressed="selectedCategory === 'all'" @click="selectedCategory = 'all'">{{ t("All items") }}</button><button v-for="category in categories" :key="category.name" type="button" :class="{ selected: selectedCategory === category.name }" :aria-pressed="selectedCategory === category.name" @click="selectedCategory = category.name">{{ category.category_name || category.name }}</button></div>
      <div class="menu-list-heading"><h3>{{ t("Available items") }}</h3><span v-if="!loading && !error">{{ products.length }} {{ t(products.length === 1 ? 'item' : 'items') }}</span></div>
      <div v-if="loading" class="menu-state" role="status">{{ t("Loading the menu…") }}</div>
      <div v-else-if="error" class="menu-state" role="alert"><p>{{ t(error) }}</p><button type="button" @click="loadProducts">{{ t("Try again") }}</button></div>
      <div v-else-if="!products.length" class="menu-state">{{ t("No available items found.") }}</div>
      <div v-else class="product-grid" :class="{ 'custom-card-height': cardLayout.height }" :style="productGridStyle"><button v-for="product in products" :key="product.name" class="product-card" type="button" :disabled="!canEditOrder || submitting" @click="addItem(product)"><div class="product-image"><img v-if="product.image" :src="imageUrl(product.image)" alt=""><svg v-else viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M10 18h21v8a10.5 10.5 0 0 1-21 0v-8ZM31 20h3a4.5 4.5 0 0 1 0 9h-3M16 8v4M24 8v4M9 40h25" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="add-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span></div><span class="product-category">{{ product.categoryName }}</span><strong>{{ product.item_name || product.name }}</strong><span class="product-bottom"><span>{{ money(product.selling_price) }}</span><span class="add-text">{{ t("Add to order →") }}</span></span></button></div>
    </section>
    <aside class="order-panel" aria-labelledby="order-title"><button class="mobile-back-menu" type="button" @click="showMobileOrder(false)">{{ t("← Back to menu") }}</button><div v-if="viewingOrder" class="viewing-banner"><span v-if="viewingLoading">{{ t("Loading draft order…") }}</span><span v-else-if="viewingError" role="alert">{{ t(viewingError) }}</span><span v-else>{{ t(canEditOrder ? 'Editing' : 'Viewing') }} {{ t('Draft') }} {{ existingOrder?.order_code || existingOrder?.name }}{{ canEditOrder ? ' · Draft' : ' · Read only' }}</span><RouterLink :to="{ name: 'pending-orders' }">{{ t("Back") }}</RouterLink></div><div class="order-heading"><div><p id="order-title" ref="mobileOrderHeading" class="section-label" tabindex="-1">{{ t("CURRENT ORDER") }}</p></div></div>
      <div class="order-fields">
        <div class="order-chips">
          <span class="order-type-chip"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 9h11v4a5.5 5.5 0 0 1-11 0V9ZM16 10h1.5a2.5 2.5 0 0 1 0 5H16M7 4v2m5-2v2M4 20h14"/></svg><select id="order-type-select" v-model="orderType" :aria-label="t('Order type')" :disabled="submitting || !canEditOrder"><option value="Dine In">{{ t("Dine In") }}</option><option value="Takeaway">{{ t("Takeaway") }}</option></select></span>
          <button type="button" :disabled="submitting || !canEditOrder" :aria-expanded="openOrderField === 'table'" aria-controls="order-table-field" @click="toggleOrderField('table', 'Coffee Table')"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9h16M6 9v9m12-9v9M3 18h18M7 5h10l2 4H5l2-4Z"/></svg><span>{{ table || t('Table') }}</span> <span aria-hidden="true">⌄</span></button>
          <button type="button" :disabled="submitting || !canEditOrder" :aria-expanded="openOrderField === 'customer'" aria-controls="order-customer-field" @click="toggleOrderField('customer', 'Coffee Customer')"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a7 7 0 0 1 14 0v1H5Z"/></svg><span>{{ selectedCustomerName || t('Customer') }}</span> <span aria-hidden="true">⌄</span></button>
        </div>
        <div v-show="openOrderField === 'table'" id="order-table-field" class="order-field"><label for="order-table">{{ t("Table") }}</label><input id="order-table" v-model="table" list="order-tables" :disabled="submitting" :placeholder="t('Select or enter table ID')"><small v-if="linkErrors.table">{{ linkErrors.table }}</small></div>
        <datalist id="order-tables"><option v-for="item in linkOptions.table" :key="item.name" :value="item.name" /></datalist>
        <div v-show="openOrderField === 'customer'" id="order-customer-field" class="order-field"><label for="order-customer">{{ t("Customer") }}</label><select id="order-customer" v-model="customer" :disabled="submitting"><option value="">{{ t("Select customer") }}</option><option v-for="item in linkOptions.customer" :key="item.name" :value="item.name">{{ item.customer_name || item.name }}</option></select><small v-if="linkErrors.customer">{{ linkErrors.customer }}</small></div>
        <small v-if="cashierError" class="cashier-error" role="status">{{ t(cashierError) }}</small>
      </div>
      <div v-if="!cart.length" class="cart-empty"><div>♧</div><strong>{{ t("Your order is empty") }}</strong><p>{{ t("Choose an item from the menu to get started.") }}</p></div>
      <div v-else class="cart-items"><div v-for="item in cart" :key="item.source?.name || item.name" class="cart-row"><div class="cart-item-info"><span class="cart-thumbnail" aria-hidden="true"><img v-if="cartImage(item) && !brokenCartImages[cartImage(item)]" :src="cartImage(item)" alt="" @error="brokenCartImages[cartImage(item)] = true"><svg v-else viewBox="0 0 24 24" fill="none"><path d="M5 9h11v4a5.5 5.5 0 0 1-11 0V9ZM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 4v2m4-2v2M4 20h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div class="cart-item-main"><strong>{{ item.item_name || item.name }}</strong><span>{{ money(item.selling_price) }} {{ t('each') }}</span><div v-if="canEditOrder" class="quantity"><button type="button" :aria-label="`Remove one ${item.item_name}`" @click="changeQuantity(item.name, -1)">−</button><span>{{ item.quantity }}</span><button type="button" :aria-label="`Add one ${item.item_name}`" @click="changeQuantity(item.name, 1)">+</button></div></div></div><div class="cart-item-actions"><strong>{{ money(item.selling_price * item.quantity) }}</strong><button v-if="canEditOrder" class="remove-cart-item" type="button" :disabled="submitting" :aria-label="`${t('Remove item')}: ${item.item_name || item.name}`" :title="t('Remove item')" @click="removeItem(item)"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 4h4m-8 3 .8 12a2 2 0 0 0 2 1.8h6.4a2 2 0 0 0 2-1.8L18 7M10 11v6m4-6v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div></div>
      <div class="order-summary"><div><span>{{ t("Subtotal") }}</span><strong>{{ money(viewingOrder && !canEditOrder && existingOrder ? existingOrder.subtotal : subtotal) }}</strong></div><p>{{ t("Taxes and discounts are not included in this estimate.") }}</p><div class="order-total"><span>{{ t(viewingOrder && !canEditOrder ? 'Order total' : 'Estimated total') }}</span><strong>{{ money(viewingOrder && !canEditOrder && existingOrder ? existingOrder.grand_total : subtotal) }}</strong></div><p v-if="orderSuccess" class="order-success" role="status">{{ orderSuccess }}</p><p v-if="orderError" class="order-error" role="alert">{{ orderError }}</p><p v-if="viewingOrder && canEditOrder" class="pending-payment-note">{{ t("Changes will be saved before payment.") }}</p><div v-if="canEditOrder" class="order-actions"><button class="submit-order draft-order" type="button" :disabled="submitting || !cart.length" @click="createOrder">{{ submitting ? 'Saving…' : 'Save Draft' }}</button><button class="submit-order" type="button" :disabled="submitting || !cart.length" @click="openPayment">{{ t("Payment →") }}</button></div></div>
    </aside>
    <div v-if="!mobileOrderView" class="mobile-order-footer"><button type="button" @click="showMobileOrder(true)"><span>{{ t("Continue to Current Order") }}</span><span class="mobile-order-count">{{ itemCount }}</span></button></div>
    <dialog ref="exitDialog" class="exit-order-dialog" aria-labelledby="exit-order-title" aria-describedby="exit-order-description" @close="finishExit"><h2 id="exit-order-title">{{ t("Leave this order?") }}</h2><p id="exit-order-description">{{ t("Your current selection and any unsaved changes will be lost.") }}</p><div class="exit-order-actions"><button type="button" @click="exitDialog.close('stay')">{{ t("Stay") }}</button><button type="button" @click="exitDialog.close('leave')">{{ t("Leave order") }}</button></div></dialog>
  </div>
</template>

<style scoped>
.sales-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:36px;align-items:start}.menu-panel,.order-panel{background:#fff;border:1px solid #eaede7;border-radius:12px}.menu-panel{padding:27px;min-width:0}.menu-heading,.order-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.section-label{font-size:calc(10px * var(--font-scale, 1));letter-spacing:1.2px;font-weight:750;color:#8b9b88;margin:0 0 8px}.menu-heading h2,.order-heading h2{font-size:calc(19px * var(--font-scale, 1));letter-spacing:-.4px;color:#354035;font-weight:650;margin:0}.menu-heading p:last-child,.order-heading p:last-child{font-size:calc(13px * var(--font-scale, 1));color:#9aa399;margin:7px 0 0}.refresh{border:1px solid #e5eae2;border-radius:8px;background:#fff;color:#657663;padding:8px 11px;font-size:calc(13px * var(--font-scale, 1))}.refresh:disabled{opacity:.5}.search-box{height:45px;margin-top:25px;border:1px solid #e8ece6;border-radius:8px;display:flex;align-items:center;gap:10px;padding:0 13px;color:#9aa79a}.search-box:focus-within{border-color:#8fa88c}.search-box svg{width:17px;height:17px;stroke:currentColor;stroke-width:1.7}.search-box input{width:100%;border:0;outline:0;font-size:calc(13px * var(--font-scale, 1));color:#354035;background:transparent}.search-box input::placeholder{color:#afb8ad}.category-tabs{display:flex;gap:8px;overflow-x:auto;padding:20px 0 24px;border-bottom:1px solid #f0f2ee}.category-tabs button{border:1px solid #edf0eb;background:#fff;border-radius:7px;padding:8px 13px;white-space:nowrap;font-size:calc(12px * var(--font-scale, 1));color:#7a8777}.category-tabs button.selected{background:#345b3e;border-color:#345b3e;color:#fff}.menu-list-heading{display:flex;justify-content:space-between;align-items:center;margin:23px 0 16px}.menu-list-heading h3{font-size:calc(14px * var(--font-scale, 1));color:#3e4d3d;margin:0;font-weight:650}.menu-list-heading span{font-size:calc(12px * var(--font-scale, 1));color:#a2aca0}.product-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:14px}.product-card{text-align:left;min-width:0;padding:0 0 14px;border:1px solid #edf0eb;background:#fff;border-radius:10px;overflow:hidden;color:#354035;transition:border-color .15s,transform .15s}.product-card:hover{border-color:#b7cbb2;transform:translateY(-2px)}.product-image{height:112px;background:#f2f5ef;display:grid;place-items:center;position:relative;color:#97ab92}.product-image img{width:100%;height:100%;object-fit:cover}.product-image svg{width:45px;height:45px}.add-icon{position:absolute;right:0;bottom:9px;background:#fff;border-radius:7px;width:27px;height:27px;display:grid;place-items:center;color:#537451;font-size:calc(20px * var(--font-scale, 1));box-shadow:0 2px 8px #0000000a}.add-icon svg{width:16px;height:16px;display:block}.product-category{display:block;margin:13px 13px 5px;color:#93a48f;font-size:calc(10px * var(--font-scale, 1));text-transform:uppercase;letter-spacing:.7px;font-weight:700}.product-card strong{display:block;padding:0 13px;font-size:calc(13px * var(--font-scale, 1));overflow-wrap:anywhere}.product-bottom{display:flex;justify-content:space-between;align-items:center;gap:5px;margin:12px 13px 0;font-size:calc(13px * var(--font-scale, 1));font-weight:700;color:#456a48}.add-text{font-size:calc(10px * var(--font-scale, 1));font-weight:600;color:#a2b1a0}.menu-state{padding:50px 15px;text-align:center;font-size:calc(13px * var(--font-scale, 1));color:#929f90}.menu-state button{margin-top:12px;border:1px solid #e2e8e0;border-radius:7px;background:white;padding:8px 12px;color:#536650}.order-panel{padding:26px}.order-badge{display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:#f1f5ee;font-size:calc(18px * var(--font-scale, 1))}.order-type{display:flex;background:#f5f7f3;border-radius:8px;padding:4px;margin-top:24px}.order-type button{flex:1;border:0;border-radius:6px;background:transparent;padding:9px;font-size:calc(12px * var(--font-scale, 1));color:#8c9989}.order-type button.selected{background:#fff;color:#405d41;font-weight:650;box-shadow:0 1px 4px #233d1d12}.cart-empty{min-height:235px;display:flex;justify-content:center;align-items:center;flex-direction:column;text-align:center;color:#a1ada0}.cart-empty div{width:46px;height:46px;border-radius:13px;background:#f2f6f0;display:grid;place-items:center;font-size:calc(25px * var(--font-scale, 1));color:#99ae96;margin-bottom:15px}.cart-empty strong{font-size:calc(13px * var(--font-scale, 1));color:#677765}.cart-empty p{font-size:calc(12px * var(--font-scale, 1));line-height:1.6;max-width:190px;margin:6px 0}.cart-items{min-height:235px;padding:8px 0}.cart-row{display:flex;justify-content:space-between;gap:10px;padding:17px 0;border-bottom:1px solid #f1f3ef;font-size:calc(13px * var(--font-scale, 1));color:#425342}.cart-item-main>strong,.cart-item-main>span{display:block}.cart-item-main>span{font-size:calc(11px * var(--font-scale, 1));color:#a0ac9e;margin-top:5px}.quantity{display:flex;align-items:center;gap:12px;margin-top:10px;font-size:calc(12px * var(--font-scale, 1))}.quantity button{width:24px;height:24px;display:grid;place-items:center;border:1px solid #e7ece5;border-radius:6px;background:#fff;color:#5e795c}.order-summary{border-top:1px solid #edf1eb;padding-top:20px}.order-summary>div{display:flex;justify-content:space-between;font-size:calc(13px * var(--font-scale, 1));color:#849181}.order-summary strong{color:#3d503d}.order-summary p{font-size:calc(11px * var(--font-scale, 1));color:#a5afa3;margin:8px 0 20px}.order-summary .order-total{border-top:1px solid #edf1eb;padding-top:18px;font-size:calc(14px * var(--font-scale, 1));font-weight:650;color:#405040}.order-total strong{font-size:calc(19px * var(--font-scale, 1))}.order-summary .checkout-note{margin:20px 0 0;padding:12px;border-radius:8px;background:#f6f8f4;line-height:1.5;text-align:center;color:#83927f}@media(max-width:1100px){.sales-layout{grid-template-columns:1fr}.order-panel{max-width:none}.cart-empty,.cart-items{min-height:160px}}@media(max-width:600px){.sales-layout{margin-top:28px;gap:16px}.menu-panel,.order-panel{padding:20px}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.add-text{display:none}.product-image{height:100px}}
@media (min-width: 701px) {
  .sales-layout { flex: 1; min-height: 0; margin-top: 22px; align-items: stretch; }
  .menu-panel, .order-panel { min-height: 0; display: flex; flex-direction: column; }
  .menu-panel { overflow-y: auto; }
  .order-panel { overflow: hidden; }
  .cart-items { flex: 1; min-height: 0; overflow-y: auto; }
  .cart-empty { flex: 1; min-height: 0; }
  .order-summary { flex: none; }
}
@media (min-width: 701px) and (max-width: 1100px) {
  .sales-layout { grid-template-columns: minmax(0, 1fr) 290px; }
}
</style>


<style scoped>
.sales-layout { margin-top: 0; }
.custom-card-height .product-card { min-height: var(--order-card-height); display: flex; flex-direction: column; align-self: stretch; }
.custom-card-height .product-image { width: 100%; height: auto; flex: 1 0 80px; }
.custom-card-height .product-bottom { align-self: stretch; margin-top: auto; padding-top: 12px; }
.mobile-order-footer, .mobile-back-menu { display: none; }
.exit-order-dialog { position: fixed; inset: 0; margin: auto; width: min(420px, calc(100% - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 24px; border: 1px solid #e6ece3; border-radius: 14px; background: #fff; color: #354035; box-shadow: 0 18px 60px #1c301c30; }
.exit-order-dialog::backdrop { background: #17221780; }
.exit-order-dialog h2 { margin: 0; font-size: calc(19px * var(--font-scale, 1)); font-weight: 650; }
.exit-order-dialog p { margin: 10px 0 0; color: #758372; font-size: calc(13px * var(--font-scale, 1)); line-height: 1.6; }
.exit-order-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
.exit-order-actions button { padding: 10px 14px; border: 1px solid #e2e8e0; border-radius: 8px; background: #fff; color: #536650; font-size: calc(12px * var(--font-scale, 1)); font-weight: 650; }
.exit-order-actions button:last-child { border-color: #345b3e; background: #345b3e; color: #fff; }
.cart-item-info { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.cart-item-actions { display: flex; flex: none; flex-direction: column; align-items: flex-end; gap: 8px; }
.remove-cart-item { width: 32px; height: 32px; display: grid; place-items: center; border: 0; border-radius: 7px; background: transparent; color: #9ba899; }
.remove-cart-item:hover { background: #faf0ee; color: #b44d45; }
.remove-cart-item:disabled { opacity: .5; cursor: default; }
.remove-cart-item svg { width: 18px; height: 18px; }
.cart-item-main { min-width: 0; overflow-wrap: anywhere; }
.cart-thumbnail { width: 48px; height: 48px; flex: none; display: grid; place-items: center; overflow: hidden; border-radius: 9px; background: #f1f5ef; color: #8fa88c; }
.cart-thumbnail img { width: 100%; height: 100%; object-fit: contain; }
.cart-thumbnail svg { width: 26px; height: 26px; }
@media (max-width: 700px) {
  .sales-layout { display: block; }
  .sales-layout:not(.mobile-order-view) .order-panel, .mobile-order-view .menu-panel { display: none; }
  .sales-layout:not(.mobile-order-view) .menu-panel { padding-bottom: 100px; }
  .mobile-order-footer { display: block; position: fixed; z-index: 2; inset: auto 0 0; padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #e9ede6; }
  .mobile-order-footer button { width: 100%; min-height: 48px; display: flex; align-items: center; justify-content: center; gap: 10px; border: 0; border-radius: 9px; background: #345b3e; color: #fff; font-size: calc(14px * var(--font-scale, 1)); font-weight: 650; }
  .mobile-order-count { min-width: 23px; height: 23px; display: grid; place-items: center; padding: 0 5px; border-radius: 50%; background: #ffffff26; font-size: calc(11px * var(--font-scale, 1)); }
  .mobile-order-view .order-panel { min-height: calc(100dvh - 68px); border-radius: 0; }
  .mobile-back-menu { display: inline-flex; align-items: center; margin-bottom: 20px; padding: 0; border: 0; background: transparent; color: #5b795a; font-size: calc(13px * var(--font-scale, 1)); font-weight: 600; }
}
.menu-panel { scrollbar-width: none; -ms-overflow-style: none; }
.menu-panel::-webkit-scrollbar { display: none; }
.menu-heading, .search-box, .category-tabs, .menu-list-heading { flex-shrink: 0; }
.category-tabs { max-width: 100%; overflow-x: auto; overflow-y: hidden; align-items: center; padding: 16px 0; scrollbar-width: none; -ms-overflow-style: none; }
.category-tabs::-webkit-scrollbar { display: none; }
.category-tabs button { flex: 0 0 auto; line-height: 1.35; }
.viewing-banner { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 14px; border-radius: 8px; background: #f1f5ef; color: #60765d; font-size: calc(12px * var(--font-scale, 1)); line-height: 1.4; }
.viewing-banner a { color: #416b48; font-weight: 650; white-space: nowrap; }
.product-card:disabled { cursor: default; }
.product-card:disabled:hover { transform: none; border-color: #edf0eb; }
.product-grid { flex-shrink: 0; align-content: start; }
.add-icon { top: auto; left: auto; right: 9px; bottom: 9px; display: flex; align-items: center; justify-content: center; line-height: 1; transform: none; }
.product-card { height: auto; align-self: start; }
.product-image { overflow: hidden; }
.product-image img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
@media (min-width: 1101px) { .sales-layout { grid-template-columns: minmax(0, 1fr) 400px; } }
@media (min-width: 701px) and (max-width: 1100px) { .sales-layout { grid-template-columns: minmax(0, 1fr) 340px; } }
.submit-order { width: 100%; margin-top: 18px; padding: 12px; border: 0; border-radius: 8px; background: #345b3e; color: white; font-size: calc(13px * var(--font-scale, 1)); font-weight: 650; }
.submit-order:hover:not(:disabled) { background: #294c32; }
.submit-order:disabled { opacity: .5; cursor: default; }
.order-summary .order-actions { display: flex; gap: 8px; }
.order-actions .submit-order { flex: 1; }
.draft-order { background: #f1f5ef; color: #496549; }
.draft-order:hover:not(:disabled) { background: #e6eee3; }
.order-summary .order-success, .order-summary .order-error { margin: 14px 0 0; font-size: calc(12px * var(--font-scale, 1)); line-height: 1.5; }
.order-summary .order-success { color: #436b43; }
.order-summary .order-error { color: #b3443d; }
.order-fields { position: relative; margin-top: 12px; }
.order-type { align-self: flex-start; align-items: center; gap: 8px; margin-top: 16px; padding: 0; background: transparent; }
.order-type label { color: #70826d; font-size: calc(11px * var(--font-scale, 1)); font-weight: 600; }
.order-type select { padding: 6px 24px 6px 10px; border: 1px solid #e5ece2; border-radius: 20px; background: #f7faf5; color: #345b3e; font-size: calc(12px * var(--font-scale, 1)); cursor: pointer; }
.order-type select:focus-visible { outline: 3px solid #b3c6a4; outline-offset: 2px; }
.order-type select:disabled { opacity: .6; cursor: default; }
.order-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cashier-error { display: block; margin-top: 6px; }
.order-type-chip { position: relative; display: inline-flex; align-items: center; color: #5d755a; }
.order-type-chip svg { position: absolute; left: 9px; width: 14px; height: 14px; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
.order-chips select { max-width: 100%; padding: 6px 22px 6px 27px; border: 1px solid #e5ece2; border-radius: 20px; background: #f7faf5; color: #5d755a; font-size: calc(11px * var(--font-scale, 1)); cursor: pointer; }
.order-chips select:focus-visible { outline: 3px solid #b3c6a4; outline-offset: 2px; }
.order-chips select:disabled { opacity: .6; cursor: default; }
.order-chips button { display: flex; align-items: center; gap: 5px; max-width: 100%; padding: 6px 9px; border: 1px solid #e5ece2; border-radius: 20px; background: #f7faf5; color: #5d755a; font-size: calc(11px * var(--font-scale, 1)); }
.order-chips button svg { width: 14px; height: 14px; flex: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.order-chips button span:nth-child(2) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 125px; }
.order-chips button[aria-expanded="true"] { border-color: #9eb69a; background: #edf4ea; }
.order-field { position: absolute; z-index: 5; top: calc(100% + 8px); left: 0; width: min(260px, 100%); display: grid; gap: 6px; padding: 12px; border: 1px solid #e5ece2; border-radius: 10px; background: #fff; box-shadow: 0 12px 30px rgba(45, 66, 43, .14); }
.order-field label { font-size: calc(11px * var(--font-scale, 1)); font-weight: 600; color: #657663; }
.order-fields input, .order-fields select { min-width: 0; width: 100%; padding: 7px 9px; border: 1px solid #e2e8e0; border-radius: 7px; background: #fff; color: #354035; font-size: calc(12px * var(--font-scale, 1)); outline: none; }
.order-fields .order-type-chip select { width: 132px; padding: 7px 26px 7px 30px; border-radius: 20px; background: #f7faf5; color: #5d755a; }
.order-fields input:focus, .order-fields select:focus { border-color: #87a384; box-shadow: 0 0 0 3px #edf3eb; }
.order-fields small { font-size: calc(11px * var(--font-scale, 1)); font-weight: 400; color: #a15b50; }
@media (min-width: 701px) { .order-panel { overflow-y: auto; } .cart-empty, .cart-items { min-height: 80px; } }
</style>




