import { onMounted, ref } from 'vue'
import api from '../service/api_services'
import { formatMoney } from '../utils/currency.js'

export function useOrderList() {
  const orders = ref([])
  const loading = ref(false)
  const error = ref('')
  const status = ref('')
  const page = ref(0)
  const hasNext = ref(false)
  const pageSize = 20
  const selected = ref(null)
  const detailLoading = ref(false)
  const detailError = ref('')
  const detailDialog = ref(null)
  const customerNames = ref({})
  const customerNamesError = ref('')
  let detailRequest = 0

  function customerLabel(id) {
    return id ? (customerNames.value[id] || id) : '—'
  }

  async function loadCustomerNames(items) {
    const ids = [...new Set(items.map(item => item.customer).filter(Boolean))]
    customerNames.value = {}
    customerNamesError.value = ''
    if (!ids.length) return
    try {
      const result = await api.get('/api/resource/Coffee%20Customer', { params: {
        fields: ['name', 'customer_name'], filters: [['name', 'in', ids]], limit_page_length: ids.length,
      } })
      if (!Array.isArray(result?.data)) throw new Error('Unexpected response')
      customerNames.value = Object.fromEntries(result.data.map(customer => [customer.name, customer.customer_name || customer.name]))
      if (ids.some(id => !customerNames.value[id])) customerNamesError.value = 'Some customer names are unavailable; their IDs are shown.'
    } catch {
      customerNamesError.value = 'Customer names could not be loaded; IDs are shown.'
    }
  }

  async function loadOrders(targetPage = page.value) {
    if (loading.value) return
    loading.value = true
    error.value = ''
    customerNamesError.value = ''
    selected.value = null
    detailRequest++
    detailLoading.value = false
    detailError.value = ''
    try {
      const result = await api.get('/api/resource/Coffee%20Order', { params: {
        fields: ['name', 'order_code', 'order_type', 'order_time', 'creation', 'customer', 'status', 'payment_status', 'currency', 'grand_total', 'docstatus'],
        ...(status.value ? { filters: [['status', '=', status.value]] } : {}),
        order_by: 'creation desc', limit_start: targetPage * pageSize, limit_page_length: pageSize + 1,
      } })
      if (!Array.isArray(result?.data)) throw new Error('Unexpected response')
      orders.value = result.data.slice(0, pageSize)
      await loadCustomerNames(orders.value)
      hasNext.value = result.data.length > pageSize
      page.value = targetPage
    } catch (err) {
      error.value = err.status === 401 || err.status === 403 ? 'You do not have permission to view sales. Sign in and check your access.' : 'Could not load sales. Please try again.'
    } finally { loading.value = false }
  }
  async function viewOrder(order) {
    const request = ++detailRequest
    selected.value = null
    detailError.value = ''
    detailLoading.value = true
    if (!detailDialog.value?.open) detailDialog.value?.showModal()
    try {
      const response = await api.get(`/api/resource/Coffee%20Order/${encodeURIComponent(order.name)}`)
      if (!response?.data) throw new Error('Unexpected response')
      if (request === detailRequest) selected.value = response.data
    } catch { if (request === detailRequest) detailError.value = 'Could not load order details.' }
    finally { if (request === detailRequest) detailLoading.value = false }
  }
  function closeDetails() { detailRequest++; selected.value = null; detailError.value = ''; detailLoading.value = false }
  const amount = (value, currency) => value == null ? '—' : formatMoney(value, currency || '')
  onMounted(() => loadOrders())

  return { orders, loading, error, status, page, hasNext, selected, detailLoading, detailError, detailDialog, customerNamesError, customerLabel, loadOrders, viewOrder, closeDetails, amount }
}
