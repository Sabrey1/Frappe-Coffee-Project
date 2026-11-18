import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../service/api_services'
import dayjs, { formatDate } from '../utils/dayjs'

export function useAddPayment() {
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

  return { form, saving, error, savePayment }
}
