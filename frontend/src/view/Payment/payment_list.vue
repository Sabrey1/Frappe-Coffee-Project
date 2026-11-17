<script setup>
import { t } from '../../utils/language.js'
import { onMounted, ref } from 'vue'
import api from '../../service/api_services'
import { formatDate } from '../../utils/dayjs'
import './payment.css'

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
      fields: ['name', 'payment_code', 'order', 'payment_time', 'payment_method', 'amount', 'docstatus'],
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
const amount = value => Number(value || 0).toFixed(2)
onMounted(() => loadPayments())
</script>

<template>
  <section class="payment-page sales-list">
    <div v-if="$route.query.created" class="payment-success" role="status">{{ t('Payment') }} {{ $route.query.created }} {{ t('was saved as a draft.') }}</div>
    <div class="payment-card"><div class="payment-card-header"><div><h2>{{ t("Payment history") }}</h2><p>{{ t("Your recent payment records.") }}</p></div><div class="payment-list-actions"><button class="payment-secondary" :disabled="loading" @click="loadPayments()">{{ t("↻ Refresh") }}</button></div></div>
      <div v-if="loading" class="payment-state" role="status">{{ t("Loading payments…") }}</div>
      <div v-else-if="error" class="payment-state" role="alert"><p>{{ t(error) }}</p><button class="payment-secondary" @click="loadPayments()">{{ t("Try again") }}</button></div>
      <div v-else-if="!payments.length" class="payment-state"><strong>{{ t("No payments yet") }}</strong><p>{{ t("Payment records will appear here.") }}</p></div>
      <template v-else><div class="payment-table-wrap"><table class="payment-table"><thead><tr><th>{{ t("PAYMENT") }}</th><th>{{ t("ORDER") }}</th><th>{{ t("DATE") }}</th><th>{{ t("METHOD") }}</th><th>{{ t("AMOUNT") }}</th><th>{{ t("STATUS") }}</th></tr></thead><tbody><tr v-for="payment in payments" :key="payment.name"><td :data-label="t('PAYMENT')"><strong>{{ payment.payment_code || payment.name }}</strong></td><td :data-label="t('ORDER')">{{ payment.order || '—' }}</td><td :data-label="t('DATE')">{{ formatDate(payment.payment_time) || '—' }}</td><td :data-label="t('METHOD')">{{ payment.payment_method || '—' }}</td><td :data-label="t('AMOUNT')">{{ amount(payment.amount) }}</td><td :data-label="t('STATUS')"><span class="payment-status">{{ t(status(payment.docstatus)) }}</span></td></tr></tbody></table></div><div class="payment-footer"><span>{{ t('Page') }} {{ page + 1 }} · {{ payments.length }} {{ t('shown') }}</span><div><button class="payment-secondary" :disabled="page === 0" @click="loadPayments(page - 1)">{{ t("Previous") }}</button><button class="payment-secondary" :disabled="!hasNext" @click="loadPayments(page + 1)">{{ t("Next") }}</button></div></div></template>
    </div>
  </section>
</template>

<style scoped>
.payment-list-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.payment-card-header { gap: 16px; flex-wrap: wrap; }
</style>


