<script setup>
import { t } from '../../utils/language.js'
import './payment.css'
import { useAddPayment } from '../../composable/useAddPayment.js'

const { form, saving, error, savePayment } = useAddPayment()
</script>

<template>
  <section class="payment-page"><div class="payment-heading"><div><RouterLink class="payment-back" to="/payments">{{ t("← All payments") }}</RouterLink><p class="payment-kicker">{{ t("NEW PAYMENT") }}</p><h1>{{ t("Add payment") }}</h1><p>{{ t("Record a payment against an existing coffee order.") }}</p></div></div>
    <form class="payment-card payment-form" @submit.prevent="savePayment"><div class="payment-form-heading"><h2>{{ t("Payment details") }}</h2><p>{{ t("Fields marked with an asterisk are required.") }}</p></div>
      <div class="payment-grid"><label>{{ t("Order ID") }} <span>*</span><input v-model="form.order" required :placeholder="t('Coffee Order record ID')"></label><label>{{ t("Payment time") }} <span>*</span><input v-model="form.payment_time" type="datetime-local" required></label><label>{{ t("Payment method record ID") }} <span>*</span><input v-model="form.payment_method" required :placeholder="t('Existing Coffee Payment ID')"><small>{{ t("Payment method links to an existing Coffee Payment record in your schema.") }}</small></label><label>{{ t("Amount applied") }} <span>*</span><input v-model="form.amount" type="number" min="0.01" step="0.01" required placeholder="0.00"></label><label>{{ t("Cash received") }}<input v-model="form.cash_received" type="number" min="0" step="0.01" placeholder="0.00"></label><label>{{ t("Change amount") }}<input v-model="form.change_amount" type="number" min="0" step="0.01" placeholder="0.00"></label><label>{{ t("Reference number") }}<input v-model="form.reference_number" :placeholder="t('Optional')"></label><label>{{ t("Received by") }}<input v-model="form.received_by" :placeholder="t('User ID (optional)')"></label><label class="payment-full">{{ t("Notes") }}<textarea v-model="form.notes" rows="3" :placeholder="t('Add a note (optional)')"></textarea></label></div>
      <p v-if="error" class="payment-error" role="alert">{{ t(error) }}</p><div class="payment-actions"><RouterLink class="payment-secondary" to="/payments">{{ t("Cancel") }}</RouterLink><button class="payment-primary" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save draft' }}</button></div>
    </form>
  </section>
</template>
