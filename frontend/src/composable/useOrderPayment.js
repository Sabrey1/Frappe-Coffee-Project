import { computed, nextTick, onMounted, ref, watch } from 'vue'
import api from '../service/api_services'
import { getCheckout, setCheckout, clearCheckout } from '../view/Order/order_checkout'
import { buildCheckoutRequest, correctableCheckoutError } from '../view/Order/checkout_request'
import { convertAmount, formatMoney } from '../utils/currency.js'
import { useExchangeRate } from './useExchangeRate.js'

export function useOrderPayment() {
  const { exchangeRate, targetCurrency, exchangeRateError: rateLoadError, exchangeRateLoading, exchangeRateLabel, loadExchangeRate } = useExchangeRate()
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
  const orderCurrency = computed(() => order.value?.currency || targetCurrency.value || order.value?.items?.[0]?.currency || '')
  const discount = computed(() => Number(order.value?.discountAmount || 0))
  const tax = computed(() => Math.round(Math.max(0, subtotal.value - discount.value) * Number(order.value?.taxRatePercent || 0)) / 100)
  const total = computed(() => Math.round((subtotal.value - discount.value + tax.value) * 100) / 100)
  const received = computed(() => Number(entered.value) || 0)
  const money = (value, currencyCode = orderCurrency.value) => formatMoney(value, currencyCode)
  const exchangeRateError = computed(() => {
    if (rateLoadError.value) return rateLoadError.value
    const invalidItem = order.value?.items?.find(item => item.currency && orderCurrency.value && item.currency !== orderCurrency.value
      && !(exchangeRate.value?.from_currency === item.currency && exchangeRate.value.to_currency === orderCurrency.value))
    return invalidItem ? `No exchange rate is configured from ${invalidItem.currency} to ${orderCurrency.value}.` : ''
  })

  watch(exchangeRate, rate => {
    if (!rate || !order.value?.items?.length || pendingRequest.value || paymentResult.value) return
    const items = order.value.items.map(item => {
      const converted = convertAmount(item.selling_price, item.currency || orderCurrency.value || rate.from_currency, rate)
      return { ...item, selling_price: Number(converted.amount.toFixed(2)), currency: converted.currency || orderCurrency.value }
    })
    const discount = convertAmount(order.value.discountAmount || 0, order.value.currency || rate.from_currency, rate)
    order.value = { ...order.value, currency: rate.to_currency, discountAmount: Number(discount.amount.toFixed(2)), items }
    setCheckout(order.value)
  })
  function printReceipt() { window.print() }
  function showConfirmation(print) {
    paymentError.value = ''
    if (exchangeRateLoading.value || exchangeRateError.value) {
      paymentError.value = exchangeRateError.value || 'Loading the exchange rate. Try again shortly.'
      return
    }
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
    if (exchangeRateLoading.value || exchangeRateError.value) {
      paymentError.value = exchangeRateError.value || 'Loading the exchange rate. Try again shortly.'
      return
    }
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

  return { order, entered, methods, selectedMethod, loading, error, confirmationDialog, printAfterPayment, reference, pendingRequest, paymentResult, submitting, paymentError, keys, method, subtotal, discount, tax, total, received, orderCurrency, exchangeRateError, exchangeRateLoading, exchangeRateLabel, loadExchangeRate, money, printReceipt, showConfirmation, pressKey, confirmPayment, startNewOrder, loadMethods }
}
