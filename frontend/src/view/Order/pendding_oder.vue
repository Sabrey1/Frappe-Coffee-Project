<script setup>
import { t } from '../../utils/language.js'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../service/api_services'
import { formatDate } from '../../utils/dayjs'
import '../Payment/payment.css'

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
</script>

<template>
  <section class="payment-page pending-page">
    <div class="pending-layout"><div class="payment-card"><div class="payment-card-header"><div><h2>{{ t("Pending orders") }}</h2><p>{{ t("Filter orders by their current status.") }}</p></div><div class="pending-actions"><RouterLink class="payment-secondary" to="/sales">{{ t("＋ New order") }}</RouterLink><button class="payment-secondary" :disabled="loading" @click="loadOrders(page)">{{ t("↻ Refresh") }}</button></div></div><div class="pending-filter"><label for="order-filter">{{ t("Show orders") }}</label><select id="order-filter" v-model="filter" :disabled="loading" @change="loadOrders()"><option value="pending">{{ t("Status: Pending") }}</option><option value="unpaid">{{ t("Payment: Unpaid") }}</option><option value="draft">{{ t("Draft orders") }}</option></select></div>
      <div v-if="loading" class="payment-state" role="status">{{ t("Loading orders…") }}</div><div v-else-if="error" class="payment-state" role="alert"><p>{{ t(error) }}</p><button class="payment-secondary" @click="loadOrders(page)">{{ t("Try again") }}</button></div><div v-else-if="!orders.length" class="payment-state"><strong>{{ t("No orders found") }}</strong><p>{{ t("Orders matching this filter will appear here.") }}</p></div>
      <template v-else><div class="order-list"><button v-for="order in orders" :key="order.name" class="order-entry" :class="{ chosen: selected?.name === order.name }" type="button" @click="selectOrder(order)" @dblclick="openOrder(order)"><span><strong>{{ order.order_code || order.name }}</strong><small>{{ t(order.order_type || 'Order') }} · {{ formatDate(order.order_time) || formatDate(order.creation) || t('Time not set') }}</small></span><span class="order-entry-right"><strong>{{ amount(order.grand_total) }}</strong><small>{{ t(order.status || 'Draft') }}</small></span></button></div><div class="payment-footer"><span>{{ t('Page') }} {{ page + 1 }} · {{ orders.length }} {{ t('shown') }}</span><div><button class="payment-secondary" :disabled="page === 0" @click="loadOrders(page - 1)">{{ t("Previous") }}</button><button class="payment-secondary" :disabled="!hasNext" @click="loadOrders(page + 1)">{{ t("Next") }}</button></div></div></template></div>
      <aside class="payment-card pending-detail"><div class="payment-card-header"><div><h2>{{ t("Order details") }}</h2><p>{{ t("Review the selected order.") }}</p></div></div><div v-if="loadingDetails" class="payment-state" role="status">{{ t("Loading order…") }}</div><div v-else-if="detailError" class="payment-state" role="alert">{{ t(detailError) }}</div><div v-else-if="!selected" class="payment-state">{{ t("Select an order from the queue.") }}</div><div v-else class="detail-body"><div class="detail-title"><strong>{{ selected.order_code || selected.name }}</strong><span class="payment-status">{{ t(selected.status || 'Draft') }}</span></div><p class="detail-meta">{{ t(selected.order_type || 'Order') }} · {{ t(selected.payment_status || 'Payment status not set') }}</p><div v-if="selected.items?.length" class="detail-items"><div v-for="(item, index) in selected.items" :key="item.name || index"><span>{{ item.quantity }} × {{ item.item_name || item.menu_item }}</span><strong>{{ amount(item.amount) }}</strong></div></div><p v-else class="detail-meta">{{ t("No items in this order.") }}</p><div class="detail-total"><span>{{ t("Total") }}</span><strong>{{ amount(selected.grand_total) }}</strong></div><button v-if="Number(selected.docstatus) === 0 &amp;&amp; !['Submitted', 'Cancelled'].includes(selected.status)" class="payment-secondary" type="button" @click="openOrder(selected)">{{ t("Open in Sales") }}</button></div></aside></div>
  </section>
</template>

<style scoped>
.pending-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:20px;align-items:start}.pending-filter{display:flex;align-items:center;gap:12px;padding:0 26px 20px;color:#738270;font-size:calc(12px * var(--font-scale, 1));font-weight:600}.pending-filter select{border:1px solid #e2e8e0;background:#fff;color:#526451;border-radius:8px;padding:9px 11px;font:inherit}.order-list{border-top:1px solid #eef1ec}.order-entry{display:flex;justify-content:space-between;gap:20px;width:100%;padding:16px 26px;text-align:left;background:#fff;border:0;border-bottom:1px solid #f0f2ef;color:#41513f}.order-entry:hover,.order-entry.chosen{background:#f4f8f2}.order-entry strong,.order-entry small{display:block}.order-entry strong{font-size:calc(13px * var(--font-scale, 1))}.order-entry small{font-size:calc(12px * var(--font-scale, 1));color:#98a496;margin-top:5px}.order-entry-right{text-align:right}.detail-body{padding:0 26px 26px}.detail-title,.detail-total,.detail-items>div{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:calc(13px * var(--font-scale, 1));color:#465744}.detail-meta{color:#9aa399;font-size:calc(12px * var(--font-scale, 1));margin:8px 0 20px;line-height:1.5}.detail-items{border-top:1px solid #eef1ec;padding-top:10px}.detail-items>div{padding:10px 0;color:#758172}.detail-total{border-top:1px solid #eef1ec;margin-top:12px;padding-top:17px;font-weight:650}.detail-total strong{font-size:calc(17px * var(--font-scale, 1))}@media(max-width:1000px){.pending-layout{grid-template-columns:1fr}}
</style>



<style scoped>
.pending-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.pending-page { max-width: none; margin: 0; }
</style>





