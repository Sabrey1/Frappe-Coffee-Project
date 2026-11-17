<script setup>
import { t } from '../../../utils/language.js'
import { computed, nextTick, onMounted, ref } from 'vue'
import api from '../../../service/api_services'
import { getCheckout, setCheckout, clearCheckout } from '../order_checkout'
import { buildCheckoutRequest, correctableCheckoutError } from '../checkout_request'

const order = ref(getCheckout())
const entered = ref('0')
const methods = ref([])
const selectedMethod = ref('')
const loading = ref(false)
const error = ref('')
const confirmationDialog = ref(null)
const printAfterPayment = ref(false)
const reference = ref(order.value?.attempt?.reference_number || '')
const pendingRequest = ref(order.value?.attempt || null)
const paymentResult = ref(order.value?.result || null)
const submitting = ref(false)
const paymentError = ref('')
const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']
const method = computed(() => methods.value.find(item => item.name === selectedMethod.value))
const subtotal = computed(() => (order.value?.items || []).reduce((sum, item) => sum + Number(item.selling_price || 0) * Number(item.quantity || 0), 0))
const discount = computed(() => Number(order.value?.discountAmount || 0))
const tax = computed(() => Math.round(Math.max(0, subtotal.value - discount.value) * Number(order.value?.taxRatePercent || 0)) / 100)
const total = computed(() => Math.round((subtotal.value - discount.value + tax.value) * 100) / 100)
const received = computed(() => Number(entered.value) || 0)
const money = value => `$${Number(value || 0).toFixed(2)}`
function printReceipt() { window.print() }
function showConfirmation(print) {
  paymentError.value = ''
  if (!pendingRequest.value && method.value?.reference_required && !reference.value.trim()) {
    paymentError.value = 'Please enter the payment reference number.'
    return
  }
  if (!pendingRequest.value && received.value <= 0) {
    paymentError.value = 'Enter the amount received.'
    return
  }
  printAfterPayment.value = print
  confirmationDialog.value?.showModal()
}
function pressKey(key) {
  if (pendingRequest.value || submitting.value) return
  if (key === '⌫') { entered.value = entered.value.slice(0, -1) || '0'; return }
  if (key === '.' && entered.value.includes('.')) return
  if (entered.value.includes('.') && entered.value.split('.')[1].length >= 2) return
  if (entered.value.replace('.', '').length >= 9) return
  entered.value = entered.value === '0' && key !== '.' ? key : entered.value + key
}
async function confirmPayment() {
  if (submitting.value || paymentResult.value) return
  paymentError.value = ''
  if (!pendingRequest.value) {
    if (!globalThis.crypto?.randomUUID) {
      paymentError.value = 'A secure checkout ID could not be created. Use localhost or HTTPS.'
      return
    }
    pendingRequest.value = buildCheckoutRequest({ checkoutKey: globalThis.crypto.randomUUID(), order: order.value, paymentMethod: selectedMethod.value, amountReceived: received.value, referenceNumber: reference.value })
    order.value = { ...order.value, attempt: pendingRequest.value }
    setCheckout(order.value)
  }
  submitting.value = true
  try {
    const response = await api.post('/api/method/coffee_shop.api.v1.checkout.checkout', pendingRequest.value)
    const result = response?.message
    if (!result?.order_id || !result?.payment_id) throw new Error('Checkout did not return order and payment IDs.')
    paymentResult.value = result
    order.value = { ...order.value, result }
    setCheckout(order.value)
    confirmationDialog.value?.close()
    if (printAfterPayment.value) { await nextTick(); printReceipt() }
  } catch (err) {
    const validationMessage = correctableCheckoutError(err)
    if (validationMessage) {
      // These errors are raised before the server writes a payment. Allow a corrected attempt.
      pendingRequest.value = null
      order.value = { ...order.value, attempt: null }
      setCheckout(order.value)
      confirmationDialog.value?.close()
      paymentError.value = `${validationMessage} Please correct the payment details and try again.`
    } else {
      paymentError.value = err.status
        ? `Checkout failed (${err.status}). Check the server response and retry the same payment.`
        : 'Could not confirm the result. Retry this same payment to avoid a duplicate.'
    }
  } finally { submitting.value = false }
}
function startNewOrder() {
  clearCheckout()
}
async function loadMethods() {
  loading.value = true
  error.value = ''
  try {
    const response = await api.get('/api/resource/Coffee%20Payment%20Method', { params: { fields: ['name', 'method_name', 'payment_type', 'reference_required'], filters: [['enabled', '=', 1]], limit_page_length: 100, order_by: 'method_name asc' } })
    if (!Array.isArray(response?.data)) throw new Error('Unexpected response')
    methods.value = response.data
    if (!pendingRequest.value && !methods.value.some(item => item.name === selectedMethod.value)) selectedMethod.value = methods.value[0]?.name || ''
  } catch { error.value = 'Could not load payment methods. Check your access and try again.' }
  finally { loading.value = false }
}
onMounted(() => {
  if (pendingRequest.value) {
    entered.value = String(pendingRequest.value.amount_received)
    selectedMethod.value = pendingRequest.value.payment_method
  }
  loadMethods()
})
</script>

<template>
  <div class="checkout-page">
    <div class="checkout-top"><RouterLink v-if="!pendingRequest && !paymentResult" class="back-link" :to="order?.orderId ? { name: 'sales', query: { viewOrder: order.orderId } } : { name: 'sales' }">{{ t("← Back to order") }}</RouterLink><div class="checkout-tag">{{ t(order?.orderType || 'Order') }}</div></div>
    <div v-if="paymentResult" class="payment-complete"><div class="checkout-receipt"><p class="checkout-kicker">{{ t("PAYMENT COMPLETE") }}</p><h1>{{ t("Payment received") }}</h1><p>{{ t('Order:') }} {{ paymentResult.order_id }}</p><p>{{ t('Payment:') }} {{ paymentResult.payment_id }}</p><div v-if="paymentResult.receipt?.items?.length" class="receipt-items"><div v-for="(item, index) in paymentResult.receipt.items" :key="index"><span>{{ item.quantity }} × {{ item.item_name || item.menu_item }}</span><span v-if="item.amount != null">{{ money(item.amount) }}</span></div></div><p v-if="paymentResult.grand_total != null"><strong>{{ t('Total:') }} {{ money(paymentResult.grand_total) }}</strong></p></div><div class="complete-actions"><button type="button" @click="printReceipt">{{ t("Print receipt") }}</button><RouterLink to="/sales" @click="startNewOrder">{{ t("New order") }}</RouterLink></div></div>
    <div v-else-if="!order?.items?.length" class="empty-checkout"><strong>{{ t("No order to review") }}</strong><p>{{ t("Add items to an order before opening payment.") }}</p><RouterLink to="/sales">{{ t("Go to Sales →") }}</RouterLink></div>
    <template v-else>
      <div class="checkout-grid">
        <section class="checkout-card"><div class="card-title"><span class="step">01</span><div><h2>{{ t("Enter amount") }}</h2><p>{{ t("Amount received from customer") }}</p></div></div><div class="amount-display"><span>{{ t("AMOUNT RECEIVED") }}</span><strong>{{ money(received) }}</strong></div><div class="keypad"><button v-for="key in keys" :key="key" type="button" :disabled="!!pendingRequest || submitting" :aria-label="key === '⌫' ? 'Backspace' : key" @click="pressKey(key)">{{ key }}</button></div><button class="clear-button" type="button" :disabled="!!pendingRequest || submitting" @click="entered = '0'">{{ t("Clear amount") }}</button></section>
        <section class="checkout-card"><div class="card-title"><span class="step">02</span><div><h2>{{ t("Payment method") }}</h2><p>{{ t("Choose how the customer will pay") }}</p></div></div><div v-if="loading" class="method-note" role="status">{{ t("Loading payment methods…") }}</div><div v-else-if="error" class="method-note" role="alert">{{ t(error) }} <button class="retry" @click="loadMethods">{{ t("Retry") }}</button></div><div v-else-if="!methods.length" class="method-note">{{ t("No enabled payment methods found.") }}</div><div v-else class="methods"><button v-for="option in methods" :key="option.name" type="button" :disabled="!!pendingRequest || submitting" :class="{ active: selectedMethod === option.name }" :aria-pressed="selectedMethod === option.name" @click="selectedMethod = option.name"><span class="method-icon" aria-hidden="true">{{ option.payment_type === 'Cash' ? '▣' : '▤' }}</span><span><strong>{{ option.method_name || option.name }}</strong><small>{{ t(option.payment_type || 'Payment method') }}</small></span><span class="method-check" aria-hidden="true">{{ selectedMethod === option.name ? '✓' : '' }}</span></button></div><label v-if="method?.reference_required || reference" class="reference-field">{{ t("Reference number") }}<input v-model="reference" :disabled="!!pendingRequest || submitting" :placeholder="t('Enter reference number')"></label></section>
        <section class="checkout-card preview-card"><div class="card-title"><span class="step">03</span><div><h2>{{ t("Payment preview") }}</h2><p>{{ t("Check the details before payment") }}</p></div></div><div class="preview-items"><div v-for="item in order.items" :key="item.name"><span>{{ item.quantity }} × {{ item.item_name || item.name }}</span><strong>{{ money(item.selling_price * item.quantity) }}</strong></div></div><div class="preview-summary"><div><span>{{ t("Order type") }}</span><strong>{{ t(order.orderType) }}</strong></div><div><span>{{ t("Payment method") }}</span><strong>{{ method?.method_name || t('Not selected') }}</strong></div><div><span>{{ t("Payment type") }}</span><strong>{{ method?.payment_type || '—' }}</strong></div><div><span>{{ t("Subtotal") }}</span><strong>{{ money(subtotal) }}</strong></div><div v-if="order.orderId"><span>{{ t("Discount") }}</span><strong>−{{ money(discount) }}</strong></div><div v-if="order.orderId"><span>{{ t("Estimated tax") }}</span><strong>{{ money(tax) }}</strong></div><div><span>{{ t("Amount received") }}</span><strong>{{ money(received) }}</strong></div><div><span>{{ t("Balance due") }}</span><strong>{{ money(Math.max(0, total - received)) }}</strong></div><div><span>{{ t("Change") }}</span><strong>{{ money(Math.max(0, received - total)) }}</strong></div><div class="preview-total"><span>{{ t("Estimated total") }}</span><strong>{{ money(total) }}</strong></div></div><p class="method-note">{{ t("This is an estimate. Frappe will calculate the final total. No payment has been recorded.") }}</p><p v-if="paymentError" class="payment-error" role="alert">{{ t(paymentError) }}</p><p v-if="pendingRequest" class="method-note">{{ t("Retry this same checkout until its result is confirmed.") }}</p><div class="preview-actions"><button type="button" :disabled="(!method && !pendingRequest) || submitting" @click="showConfirmation(false)">{{ t("Payment") }}</button><button type="button" :disabled="(!method && !pendingRequest) || submitting" @click="showConfirmation(true)">{{ t("Payment & Print") }}</button></div></section>
      </div>
      <dialog ref="confirmationDialog" class="confirm-dialog" aria-labelledby="confirm-title" @cancel="submitting && $event.preventDefault()"><h2 id="confirm-title">{{ t("Confirm payment?") }}</h2><p>{{ t('Order total:') }} {{ money(total) }}. {{ t('Amount received:') }} {{ money(received) }}. {{ t('Payment method:') }} {{ method?.method_name || pendingRequest?.payment_method }}{{ printAfterPayment ? t(' and print a receipt') : '' }}.</p><p v-if="paymentError" class="confirm-warning" role="alert">{{ t(paymentError) }}</p><div class="confirm-actions"><button type="button" :disabled="submitting" @click="confirmationDialog.close()">{{ t("Cancel") }}</button><button type="button" :disabled="submitting" @click="confirmPayment">{{ submitting ? 'Processing…' : 'Confirm payment' }}</button></div></dialog>
    </template>
  </div>
</template>

<style scoped>
.checkout-page{height:100%;min-height:0;display:flex;flex-direction:column;padding:25px 30px;background:#f8f9f6}.checkout-top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:20px}.back-link{display:inline-block;color:#6d866b;font-size:calc(12px * var(--font-scale, 1));text-decoration:none;margin-bottom:13px}.checkout-kicker{font-size:calc(10px * var(--font-scale, 1));letter-spacing:1.2px;color:#8b9b88;font-weight:750;margin:0 0 7px}.checkout-top h1{font-size:calc(25px * var(--font-scale, 1))}.checkout-top p:last-child{margin:6px 0 0;color:#98a296;font-size:calc(12px * var(--font-scale, 1))}.checkout-tag{background:#edf3eb;border-radius:20px;padding:7px 12px;color:#698365;font-size:calc(11px * var(--font-scale, 1));font-weight:600}.checkout-grid{display:grid;grid-template-columns:1fr .9fr 1fr;gap:16px;flex:1;min-height:0}.checkout-card{background:white;border:1px solid #eaede7;border-radius:12px;padding:22px;min-height:0;overflow:auto}.card-title{display:flex;align-items:flex-start;gap:11px}.step{width:30px;height:30px;border-radius:9px;background:#eff4ec;color:#718c6d;display:grid;place-items:center;font-size:calc(10px * var(--font-scale, 1));font-weight:700;flex:none}.card-title h2{font-size:calc(15px * var(--font-scale, 1));color:#354035;margin:0;font-weight:650}.card-title p{font-size:calc(11px * var(--font-scale, 1));color:#9aa399;margin:5px 0 0}.amount-display{background:#f6f8f4;border:1px solid #edf1eb;border-radius:9px;padding:15px;margin:20px 0 14px;text-align:right}.amount-display span{display:block;color:#a1ada0;font-size:calc(9px * var(--font-scale, 1));letter-spacing:1px;font-weight:700}.amount-display strong{display:block;margin-top:4px;color:#354e38;font-size:calc(25px * var(--font-scale, 1))}.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.keypad button{height:45px;border:1px solid #edf1eb;background:#fff;border-radius:8px;color:#40513f;font-size:calc(16px * var(--font-scale, 1));font-weight:600}.keypad button:hover{background:#f4f8f2}.clear-button,.retry{border:0;background:transparent;color:#718d6c;font-size:calc(11px * var(--font-scale, 1));margin-top:13px}.clear-button{width:100%}.methods{display:grid;gap:9px;margin-top:22px}.methods button{display:flex;align-items:center;gap:11px;padding:13px;border:1px solid #edf1eb;border-radius:9px;background:white;text-align:left;color:#50614e}.methods button.active{border-color:#a2bd9c;background:#f5f9f3}.method-icon{width:35px;height:35px;display:grid;place-items:center;border-radius:9px;background:#eff4ec;color:#698365;font-size:calc(17px * var(--font-scale, 1));flex:none}.methods strong,.methods small{display:block}.methods strong{font-size:calc(12px * var(--font-scale, 1))}.methods small{font-size:calc(10px * var(--font-scale, 1));color:#a2aca0;margin-top:4px}.method-check{margin-left:auto;color:#537b52}.method-note{font-size:calc(11px * var(--font-scale, 1));line-height:1.6;color:#8a9887;margin:18px 0 0}.preview-items{margin-top:22px;padding-bottom:12px;border-bottom:1px solid #edf1eb;max-height:160px;overflow:auto}.preview-items>div,.preview-summary>div{display:flex;justify-content:space-between;gap:10px;font-size:calc(12px * var(--font-scale, 1));color:#899687;padding:7px 0}.preview-items strong,.preview-summary strong{color:#4d604b;white-space:nowrap}.preview-summary{padding-top:10px}.preview-summary .preview-total{margin-top:8px;padding-top:15px;border-top:1px solid #edf1eb;color:#3e503e;font-weight:700}.preview-total strong{font-size:calc(18px * var(--font-scale, 1))}.checkout-footer{display:flex;align-items:center;gap:18px;margin-top:16px;padding:15px 20px;background:#fff;border:1px solid #eaede7;border-radius:10px;flex-wrap:wrap}.checkout-footer>div:first-child{margin-right:auto}.checkout-footer strong,.checkout-footer span{display:block}.checkout-footer strong{font-size:calc(18px * var(--font-scale, 1));color:#3d563f}.checkout-footer span{font-size:calc(10px * var(--font-scale, 1));color:#a3aea0;margin-top:3px}.checkout-actions{display:flex;gap:8px}.checkout-footer button{border:0;border-radius:8px;background:#345b3e;color:#fff;padding:11px 18px;font-size:calc(12px * var(--font-scale, 1));font-weight:650}.checkout-footer button:disabled{opacity:.45;cursor:not-allowed}.checkout-footer p{width:100%;margin:0;color:#899887;font-size:calc(11px * var(--font-scale, 1))}.empty-checkout{margin:auto;text-align:center;color:#647862}.empty-checkout p{font-size:calc(13px * var(--font-scale, 1));color:#9ba799}.empty-checkout a{font-size:calc(13px * var(--font-scale, 1));color:#416b48}@media(max-width:1000px){.checkout-page{height:auto}.checkout-grid{grid-template-columns:1fr 1fr}.checkout-card:last-child{grid-column:1/-1}}@media(max-width:700px){.checkout-page{padding:20px}.checkout-grid{grid-template-columns:1fr}.checkout-card:last-child{grid-column:auto}.checkout-actions{width:100%}.checkout-actions button{flex:1}}
</style>
<style scoped>
.preview-card { display: flex; flex-direction: column; }
.preview-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 20px; }
.preview-actions button { flex: 1; padding: 11px 8px; border: 0; border-radius: 8px; background: #345b3e; color: #fff; font-size: calc(12px * var(--font-scale, 1)); font-weight: 650; }
.preview-actions button:disabled { opacity: .45; cursor: not-allowed; }
.confirm-dialog { position: fixed; inset: 0; margin: auto; width: min(420px, calc(100% - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; border: 1px solid #e6ece3; border-radius: 14px; padding: 24px; color: #354035; box-shadow: 0 18px 60px #1c301c30; }
.confirm-dialog::backdrop { background: #17221780; }
.confirm-dialog h2 { margin: 0; font-size: calc(19px * var(--font-scale, 1)); font-weight: 650; }
.confirm-dialog p { font-size: calc(13px * var(--font-scale, 1)); line-height: 1.6; color: #758372; }
.confirm-dialog .confirm-warning { padding: 10px 12px; border-radius: 8px; background: #f8f5ed; color: #806c45; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
.confirm-actions button { padding: 10px 14px; border: 1px solid #e2e8e0; border-radius: 8px; background: #fff; color: #536650; font-size: calc(12px * var(--font-scale, 1)); font-weight: 650; }
.confirm-actions button:disabled { background: #345b3e; color: #fff; opacity: .45; cursor: not-allowed; }
</style>

<style scoped>
.reference-field{display:grid;gap:6px;margin-top:18px;color:#657663;font-size:calc(12px * var(--font-scale, 1));font-weight:600}.reference-field input{width:100%;padding:9px 10px;border:1px solid #e2e8e0;border-radius:7px;font:inherit;background:#fff}.payment-error{font-size:calc(12px * var(--font-scale, 1));color:#b3443d;line-height:1.5}.payment-complete{margin:auto;width:min(480px,100%);background:#fff;border:1px solid #eaede7;border-radius:12px;padding:28px}.checkout-receipt h1{font-size:calc(24px * var(--font-scale, 1))}.checkout-receipt p{font-size:calc(13px * var(--font-scale, 1));color:#647862}.receipt-items{margin:18px 0;padding:12px 0;border-block:1px solid #edf1eb}.receipt-items div{display:flex;justify-content:space-between;gap:12px;padding:5px 0;font-size:calc(13px * var(--font-scale, 1))}.complete-actions{display:flex;gap:10px;margin-top:22px}.complete-actions button,.complete-actions a{padding:10px 14px;border:1px solid #345b3e;border-radius:8px;background:#345b3e;color:white;font-size:calc(12px * var(--font-scale, 1));text-decoration:none}.complete-actions a{background:white;color:#345b3e}@media print{:global(body *){visibility:hidden}.checkout-receipt,.checkout-receipt *{visibility:visible}.checkout-receipt{position:fixed;left:0;top:0;width:100%;color:#000}}
</style>


