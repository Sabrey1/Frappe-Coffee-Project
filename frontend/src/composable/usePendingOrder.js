import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../service/api_services'

export function usePendingOrder() {
  const orders = ref([])
  const selected = ref(null)
  const loading = ref(false)
  const loadingDetails = ref(false)
  const error = ref('')
  const detailError = ref('')
  const filter = ref('pending')
  const page = ref(0)
  const hasNext = ref(false)
  const pageSize = 20
  const router = useRouter()
  let detailRequest = 0

  async function loadOrders(targetPage = 0) {
    if (loading.value) return
    loading.value = true
    error.value = ''
    detailRequest++
    selected.value = null
    detailError.value = ''
    loadingDetails.value = false
    const filters = filter.value === 'pending' ? [['status', '=', 'Pending']] : filter.value === 'unpaid' ? [['payment_status', '=', 'Unpaid']] : [['docstatus', '=', 0]]
    try {
      const response = await api.get('/api/resource/Coffee%20Order', { params: { fields: ['name', 'order_code', 'order_type', 'order_time', 'creation', 'status', 'payment_status', 'grand_total', 'docstatus'], filters, order_by: 'creation desc', limit_start: targetPage * pageSize, limit_page_length: pageSize + 1 } })
      if (!Array.isArray(response?.data)) throw new Error('Unexpected response')
      orders.value = response.data.slice(0, pageSize)
      hasNext.value = response.data.length > pageSize
      page.value = targetPage
    } catch (err) {
      error.value = err.status === 401 || err.status === 403 ? 'You do not have permission to view orders. Sign in and check your access.' : 'Could not load orders. Please try again.'
    } finally { loading.value = false }
  }
  async function selectOrder(order) {
    const request = ++detailRequest
    selected.value = null
    detailError.value = ''
    loadingDetails.value = true
    try {
      const response = await api.get(`/api/resource/Coffee%20Order/${encodeURIComponent(order.name)}`)
      if (!response?.data) throw new Error('Unexpected response')
      if (request === detailRequest) selected.value = response.data
    } catch {
      if (request === detailRequest) detailError.value = 'Could not load order details. Please try again.'
    } finally { if (request === detailRequest) loadingDetails.value = false }
  }
  const amount = value => Number(value || 0).toFixed(2)
  function openOrder(order) {
    if (Number(order.docstatus) === 0 && !['Submitted', 'Cancelled'].includes(order.status)) router.push({ name: 'sales', query: { viewOrder: order.name } })
  }
  onMounted(() => loadOrders())

  return { orders, selected, loading, loadingDetails, error, detailError, filter, page, hasNext, loadOrders, selectOrder, amount, openOrder }
}
