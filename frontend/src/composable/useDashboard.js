import { computed, onMounted, ref } from 'vue'
import dayjs from '../utils/dayjs'
import api from '../service/api_services'

export function useDashboard() {
  const orders = ref([])
  const loading = ref(false)
  const error = ref('')

  const days = computed(() => Array.from({ length: 7 }, (_, index) => {
    const date = dayjs().startOf('day').subtract(6 - index, 'day')
    return { date: date.format('YYYY-MM-DD'), label: date.format('MMM D'), total: 0, count: 0 }
  }))
  const dailyOrders = computed(() => {
    const result = days.value.map(day => ({ ...day }))
    const byDate = new Map(result.map(day => [day.date, day]))
    for (const order of orders.value) {
      const day = byDate.get((order.creation || '').slice(0, 10))
      if (day) {
        day.count++
        day.total += Number(order.grand_total) || 0
      }
    }
    return result
  })
  const statuses = computed(() => {
    const counts = new Map()
    for (const order of orders.value) {
      const status = order.status || 'Unknown'
      counts.set(status, (counts.get(status) || 0) + 1)
    }
    return Array.from(counts, ([name, value]) => ({ name, value }))
  })
  const total = computed(() => dailyOrders.value.reduce((sum, day) => sum + day.total, 0))

  async function loadDashboard() {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      const records = []
      const pageSize = 100
      let page
      do {
        const response = await api.get('/api/resource/Coffee%20Order', { params: {
          fields: ['name', 'creation', 'status', 'grand_total', 'docstatus'],
          filters: [['creation', '>=', `${days.value[0].date} 00:00:00`], ['docstatus', '!=', 2]],
          order_by: 'creation desc', limit_start: records.length, limit_page_length: pageSize,
        } })
        if (!Array.isArray(response?.data)) throw new Error('Unexpected response')
        page = response.data
        records.push(...page)
      } while (page.length === pageSize)
      orders.value = records.filter(order => days.value.some(day => day.date === (order.creation || '').slice(0, 10)))
    } catch {
      orders.value = []
      error.value = 'Could not load dashboard orders. Please check your access and try again.'
    } finally {
      loading.value = false
    }
  }

  onMounted(loadDashboard)
  return { orders, loading, error, dailyOrders, statuses, total, loadDashboard }
}
