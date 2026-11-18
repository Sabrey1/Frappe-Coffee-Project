<script setup>
import { t } from '../../utils/language.js'
import { formatDate } from '../../utils/dayjs'
import './payment.css'
import { usePayment } from '../../composable/usePayment.js'

const { payments, loading, error, page, hasNext, loadPayments, status, amount } = usePayment()
</script>

<template>
  <section class="payment-page sales-list">
    <div v-if="$route.query.created" class="payment-success" role="status">{{ t('Payment') }} {{ $route.query.created }} {{ t('was saved as a draft.') }}</div>
    <div class="payment-card"><div class="payment-card-header"><div><h2>{{ t("Payment history") }}</h2><p>{{ t("Your recent payment records.") }}</p></div><div class="payment-list-actions"><button class="payment-secondary" :disabled="loading" @click="loadPayments()">{{ t("↻ Refresh") }}</button></div></div>
      <div v-if="loading" class="payment-state" role="status">{{ t("Loading payments…") }}</div>
      <div v-else-if="error" class="payment-state" role="alert"><p>{{ t(error) }}</p><button class="payment-secondary" @click="loadPayments()">{{ t("Try again") }}</button></div>
      <div v-else-if="!payments.length" class="payment-state"><strong>{{ t("No payments yet") }}</strong><p>{{ t("Payment records will appear here.") }}</p></div>
      <template v-else><div class="payment-table-wrap"><table class="payment-table"><thead><tr><th>{{ t("PAYMENT") }}</th><th>{{ t("ORDER") }}</th><th>{{ t("DATE") }}</th><th>{{ t("METHOD") }}</th><th>{{ t("AMOUNT") }}</th><th>{{ t("STATUS") }}</th></tr></thead><tbody><tr v-for="payment in payments" :key="payment.name"><td :data-label="t('PAYMENT')"><strong>{{ payment.payment_code || payment.name }}</strong></td><td :data-label="t('ORDER')">{{ payment.order || '—' }}</td><td :data-label="t('DATE')">{{ formatDate(payment.payment_time) || '—' }}</td><td :data-label="t('METHOD')">{{ payment.payment_method || '—' }}</td><td :data-label="t('AMOUNT')">{{ amount(payment.amount, payment.currency) }}</td><td :data-label="t('STATUS')"><span class="payment-status">{{ t(status(payment.docstatus)) }}</span></td></tr></tbody></table></div><div class="payment-footer"><span>{{ t('Page') }} {{ page + 1 }} · {{ payments.length }} {{ t('shown') }}</span><div><button class="payment-secondary" :disabled="page === 0" @click="loadPayments(page - 1)">{{ t("Previous") }}</button><button class="payment-secondary" :disabled="!hasNext" @click="loadPayments(page + 1)">{{ t("Next") }}</button></div></div></template>
    </div>
  </section>
</template>

<style scoped>
.payment-list-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.payment-card-header { gap: 16px; flex-wrap: wrap; }
</style>


