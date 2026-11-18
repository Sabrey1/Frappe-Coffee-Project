import { onMounted, ref } from 'vue'
import api from '../service/api_services'
import { formatMoney } from '../utils/currency.js'

export function usePayment() {
  const payments = ref([])
  const loading = ref(false)
  const error = ref('')
  const page = ref(0)
  const hasNext = ref(false)
  const pageSize = 20

  async function loadPayments(targetPage = page.value) {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      const result = await api.get('/api/resource/Coffee%20Payment', { params: {
        fields: ['name', 'payment_code', 'order', 'payment_time', 'payment_method', 'currency', 'amount', 'docstatus'],
        order_by: 'creation desc', limit_start: targetPage * pageSize, limit_page_length: pageSize + 1,
      } })
      if (!Array.isArray(result?.data)) throw new Error('Unexpected response')
      payments.value = result.data.slice(0, pageSize)
      hasNext.value = result.data.length > pageSize
      page.value = targetPage
    } catch (err) {
      error.value = err.status === 401 || err.status === 403 ? 'You do not have permission to view payments. Please sign in and check your access.' : 'Could not load payments. Please try again.'
    } finally { loading.value = false }
  }
  const status = value => value === 1 ? 'Submitted' : value === 2 ? 'Cancelled' : 'Draft'
  const amount = (value, currency) => value == null ? '—' : formatMoney(value, currency || '')
  onMounted(() => loadPayments())

  return { payments, loading, error, page, hasNext, loadPayments, status, amount }
}
