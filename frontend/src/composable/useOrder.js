import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import api from '../service/api_services'
import { getCheckout, setCheckout, clearCheckout } from '../view/Order/order_checkout'
import { loadCardLayout } from '../utils/cardLayout'
import { convertAmount, formatMoney } from '../utils/currency.js'
import { useExchangeRate } from './useExchangeRate.js'

export function useOrder() {
  const { exchangeRate, targetCurrency, exchangeRateError: rateLoadError, exchangeRateLoading, exchangeRateLabel, loadExchangeRate } = useExchangeRate()
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
  const orderCurrency = computed(() => targetCurrency.value || existingOrder.value?.currency || cart.value[0]?.currency || '')
  const convertPrice = (value, currency) => convertAmount(value, currency || orderCurrency.value, exchangeRate.value)
  const subtotal = computed(() => cart.value.reduce((sum, item) => sum + convertPrice(item.selling_price, item.currency).amount * item.quantity, 0))
  const money = (value, currency) => {
    const converted = convertPrice(value, currency)
    return formatMoney(converted.amount, converted.currency || orderCurrency.value)
  }
  const exchangeRateError = computed(() => {
    if (rateLoadError.value) return rateLoadError.value
    const invalidItem = cart.value.find(item => item.currency && orderCurrency.value && item.currency !== orderCurrency.value
      && !(exchangeRate.value?.from_currency === item.currency && exchangeRate.value.to_currency === orderCurrency.value))
    return invalidItem ? `No exchange rate is configured from ${invalidItem.currency} to ${orderCurrency.value}.` : ''
  })
  const imageUrl = value => !value ? '' : /^(https?:|data:|blob:)/i.test(value) ? value : `${(import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')}/${value.replace(/^\//, '')}`
  const productImages = computed(() => new Map(categories.value.flatMap(category => (category.products || []).map(product => [product.name, product.image]))))
  const productCurrency = name => categories.value.flatMap(category => category.products || []).find(product => product.name === name)?.currency || ''
  function refreshCartCurrencies() {
    cart.value = cart.value.map(item => ({ ...item, currency: item.currency || productCurrency(item.name) }))
  }
  const orderItemData = item => {
    const converted = convertPrice(item.selling_price, item.currency)
    const unitPrice = Number(converted.amount.toFixed(2))
    return { menu_item: item.name, item_name: item.item_name, quantity: item.quantity, unit_price: unitPrice, amount: Number((unitPrice * item.quantity).toFixed(2)) }
  }
  const cartImage = item => imageUrl(item.image || productImages.value.get(item.name))

  async function loadProducts() {
    loading.value = true
    error.value = ''
    try {
      const response = await api.get('/api/method/coffee_shop.api.v1.product_category.get_products_by_category')
      if (!Array.isArray(response?.message)) throw new Error('Unexpected response')
      categories.value = response.message.filter(category => Number(category.enabled) === 1)
      refreshCartCurrencies()
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
      else setCheckout({ ...saved, items: cart.value.map(entry => ({ name: entry.name, item_name: entry.item_name, quantity: entry.quantity, selling_price: entry.selling_price, currency: entry.currency })) })
    }
  }
  async function createOrder() {
    if (submitting.value || !canEditOrder.value || !cart.value.length) return
    if (exchangeRateLoading.value || exchangeRateError.value) {
      orderError.value = exchangeRateError.value || 'Loading the exchange rate. Try again shortly.'
      return
    }
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
          currency: orderCurrency.value,
          discount_amount: Number(convertPrice(existingOrder.value.discount_amount || 0, existingOrder.value.currency || orderCurrency.value).amount.toFixed(2)),
          table: table.value.trim() || null,
          customer: customer.value.trim() || null,
          items: cart.value.map(item => ({
            ...(item.source || {}),
            ...orderItemData(item),
          })),
        })
        if (!response?.data?.name) throw new Error('The server did not return the saved order. Reopen it to check the result.')
        existingOrder.value = response.data
        cart.value = (response.data.items || []).map(item => ({ name: item.menu_item, item_name: item.item_name || item.menu_item, quantity: Number(item.quantity || 0), selling_price: Number(item.unit_price || 0), currency: response.data.currency || productCurrency(item.menu_item), source: item }))
        refreshCartCurrencies()
        orderSuccess.value = `Order ${response.data.name} updated.`
        return true
      }
      const response = await api.post('/api/resource/Coffee%20Order', {
        naming_series: 'O-.YYYY.MM.DD.-.###',
        order_type: orderType.value,
        currency: orderCurrency.value,
        ...(table.value.trim() ? { table: table.value.trim() } : {}),
        ...(customer.value.trim() ? { customer: customer.value.trim() } : {}),
        ...(cashier.value.trim() ? { cashier: cashier.value.trim() } : {}),
        status: 'Pending',
        payment_status: 'Unpaid',
        items: cart.value.map(orderItemData),
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
    if (exchangeRateLoading.value || exchangeRateError.value) {
      orderError.value = exchangeRateError.value || 'Loading the exchange rate. Try again shortly.'
      return
    }
    if (viewingOrder.value && !(await createOrder())) return
    setCheckout({ currency: orderCurrency.value, items: cart.value.map(item => ({ name: item.name, item_name: item.item_name, quantity: item.quantity, selling_price: orderItemData(item).unit_price, currency: orderCurrency.value })), orderType: orderType.value, table: table.value, customer: customer.value, cashier: cashier.value, ...(viewingOrder.value ? { orderId: existingOrder.value.name, discountAmount: convertPrice(existingOrder.value.discount_amount || 0, existingOrder.value.currency || orderCurrency.value).amount, taxRatePercent: Number(existingOrder.value.tax_rate_percent || 0) } : {}) })
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
      cart.value = (record.items || []).map(item => ({ name: item.menu_item, item_name: item.item_name || item.menu_item, quantity: Number(item.quantity || 0), selling_price: Number(item.unit_price || 0), currency: record.currency || productCurrency(item.menu_item), source: item }))
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

  return { viewingOrder, existingOrder, canEditOrder, viewingError, viewingLoading, categories, brokenCartImages, selectedCategory, search, cart, orderType, table, customer, cashier, openOrderField, linkOptions, linkErrors, cashierError, selectedCustomerName, loading, error, submitting, orderError, orderSuccess, mobileOrderView, mobileOrderHeading, menuHeading, exitDialog, cardLayout, productGridStyle, finishExit, confirmExitOrder, showMobileOrder, products, itemCount, subtotal, orderCurrency, exchangeRateError, exchangeRateLoading, exchangeRateLabel, money, imageUrl, cartImage, loadProducts, loadExchangeRate, toggleOrderField, addItem, changeQuantity, removeItem, createOrder, openPayment }
}
