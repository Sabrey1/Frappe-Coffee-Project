import { computed, onMounted, ref } from 'vue'
import api from '../service/api_services'
import { formatExchangeRate } from '../utils/currency.js'

export function useExchangeRate() {
  const exchangeRate = ref(null)
  const targetCurrency = ref('')
  const exchangeRateError = ref('')
  const exchangeRateLoading = ref(false)

  async function loadExchangeRate() {
    exchangeRateLoading.value = true
    exchangeRateError.value = ''
    try {
      const settings = await api.get('/api/resource/Coffee%20Settings/Coffee%20Settings', {
        params: { fields: ['currency_code', 'exchange_rate'] },
      })
      if (!settings?.data || typeof settings.data !== 'object') throw new Error('Unexpected settings response')
      targetCurrency.value = settings.data.currency_code || ''
      if (!settings.data.exchange_rate) {
        exchangeRate.value = null
        return
      }

      const response = await api.get(`/api/resource/Coffee%20Exchange%20Rate/${encodeURIComponent(settings.data.exchange_rate)}`, {
        params: { fields: ['from_currency', 'to_currency', 'exchange_rate', 'enabled'] },
      })
      const rate = response?.data
      const value = Number(rate?.exchange_rate)
      if (!rate || Number(rate.enabled) !== 1 || !rate.from_currency || !rate.to_currency || !Number.isFinite(value) || value <= 0) {
        throw new Error('Invalid configured exchange rate')
      }
      exchangeRate.value = { ...rate, exchange_rate: value }
      targetCurrency.value = rate.to_currency
    } catch {
      exchangeRate.value = null
      targetCurrency.value = ''
      exchangeRateError.value = 'Could not load the exchange rate configured in Coffee Settings.'
    } finally {
      exchangeRateLoading.value = false
    }
  }

  const exchangeRateLabel = computed(() => exchangeRate.value ? formatExchangeRate(exchangeRate.value) : '')
  onMounted(loadExchangeRate)

  return { exchangeRate, targetCurrency, exchangeRateError, exchangeRateLoading, exchangeRateLabel, loadExchangeRate }
}
