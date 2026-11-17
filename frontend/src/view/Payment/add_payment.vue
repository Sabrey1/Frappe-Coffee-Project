<script setup>
import { t } from '../../utils/language.js'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../service/api_services'
import dayjs, { formatDate } from '../../utils/dayjs'
import './payment.css'

const router = useRouter()
const localTime = dayjs().format('YYYY-MM-DDTHH:mm')
const form = reactive({ order: '', payment_time: localTime, payment_method: '', amount: '', cash_received: '', change_amount: '', reference_number: '', received_by: '', notes: '' })
const saving = ref(false)
const error = ref('')

async function savePayment() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    const data = { order: form.order.trim(), payment_time: formatDate(form.payment_time, 'YYYY-MM-DD HH:mm:ss'), payment_method: form.payment_method.trim(), amount: Number(form.amount) }
    for (const key of ['cash_received', 'change_amount']) if (form[key] !== '') data[key] = Number(form[key])
    for (const key of ['reference_number', 'received_by', 'notes']) if (form[key].trim()) data[key] = form[key].trim()
    const response = await api.post('/api/resource/Coffee%20Payment', data)
    if (!response?.data?.name) throw new Error('The server did not return a payment record.')
    await router.replace({ name: 'payments', query: { created: response.data.name } })
  } catch (err) {
    error.value = err.data?.message || (err.status === 403 ? 'You do not have permission to create a payment, or your session has expired.' : 'Could not save the payment. Check the fields and try again.')
  } finally { saving.value = false }
}
</script>

<template>
  <section class="payment-page"><div class="payment-heading"><div><RouterLink class="payment-back" to="/payments">{{ t("← All payments") }}</RouterLink><p class="payment-kicker">{{ t("NEW PAYMENT") }}</p><h1>{{ t("Add payment") }}</h1><p>{{ t("Record a payment against an existing coffee order.") }}</p></div></div>
    <form class="payment-card payment-form" @submit.prevent="savePayment"><div class="payment-form-heading"><h2>{{ t("Payment details") }}</h2><p>{{ t("Fields marked with an asterisk are required.") }}</p></div>
      <div class="payment-grid"><label>{{ t("Order ID") }} <span>*</span><input v-model="form.order" required :placeholder="t('Coffee Order record ID')"></label><label>{{ t("Payment time") }} <span>*</span><input v-model="form.payment_time" type="datetime-local" required></label><label>{{ t("Payment method record ID") }} <span>*</span><input v-model="form.payment_method" required :placeholder="t('Existing Coffee Payment ID')"><small>{{ t("Payment method links to an existing Coffee Payment record in your schema.") }}</small></label><label>{{ t("Amount applied") }} <span>*</span><input v-model="form.amount" type="number" min="0.01" step="0.01" required placeholder="0.00"></label><label>{{ t("Cash received") }}<input v-model="form.cash_received" type="number" min="0" step="0.01" placeholder="0.00"></label><label>{{ t("Change amount") }}<input v-model="form.change_amount" type="number" min="0" step="0.01" placeholder="0.00"></label><label>{{ t("Reference number") }}<input v-model="form.reference_number" :placeholder="t('Optional')"></label><label>{{ t("Received by") }}<input v-model="form.received_by" :placeholder="t('User ID (optional)')"></label><label class="payment-full">{{ t("Notes") }}<textarea v-model="form.notes" rows="3" :placeholder="t('Add a note (optional)')"></textarea></label></div>
      <p v-if="error" class="payment-error" role="alert">{{ t(error) }}</p><div class="payment-actions"><RouterLink class="payment-secondary" to="/payments">{{ t("Cancel") }}</RouterLink><button class="payment-primary" type="submit" :disabled="saving">{{ saving ? 'Saving…' : 'Save draft' }}</button></div>
    </form>
  </section>
</template>
