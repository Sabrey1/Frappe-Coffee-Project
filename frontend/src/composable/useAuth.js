import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../service/api_services'

export function useAuth() {
  const router = useRouter()
  const username = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const loading = ref(false)
  const error = ref('')

  async function login() {
    if (loading.value) return
    error.value = ''
    loading.value = true
    try {
      await api.post('/api/method/login', { usr: username.value, pwd: password.value })
      await router.push('/sales')
      if (router.currentRoute.value.name === 'login') {
        error.value = 'Could not verify your session. Please try again.'
      }
    } catch {
      error.value = 'Unable to sign in. Please check your details and try again.'
    } finally {
      loading.value = false
    }
  }

  return { username, password, showPassword, loading, error, login }
}
