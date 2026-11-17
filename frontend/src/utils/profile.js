import { ref } from 'vue'
import api from '../service/api_services'

export const profile = ref(null)
export const profileLoading = ref(false)
export const profileError = ref('')
export const profileDetailsUnavailable = ref(false)
let requestId = 0

export async function loadProfile() {
  const request = ++requestId
  profile.value = null
  profileLoading.value = true
  profileError.value = ''
  profileDetailsUnavailable.value = false
  try {
    const session = await api.get('/api/method/frappe.auth.get_logged_user')
    if (!session?.message || session.message === 'Guest') throw new Error('Please sign in to view your profile.')
    const userId = session.message
    if (request !== requestId) return
    profile.value = { id: userId, fullName: userId, email: '', image: '' }
    try {
      const response = await api.get(`/api/resource/User/${encodeURIComponent(userId)}`)
      if (!response?.data) throw new Error('Profile details unavailable')
      if (request !== requestId) return
      const user = response.data
      profile.value = { id: userId, fullName: user.full_name || userId, email: user.email || '', image: user.user_image || '' }
    } catch {
      if (request === requestId) profileDetailsUnavailable.value = true
    }
  } catch (err) {
    if (request === requestId) profileError.value = err.message === 'Please sign in to view your profile.' ? err.message : 'Could not load your profile. Please try again.'
  } finally {
    if (request === requestId) profileLoading.value = false
  }
}

export function clearProfile() {
  requestId++
  profile.value = null
  profileLoading.value = false
  profileError.value = ''
  profileDetailsUnavailable.value = false
}

export function profileImageUrl(image) {
  if (!image) return ''
  if (/^(https?:|data:|blob:)/i.test(image)) return image
  return `${(import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')}/${image.replace(/^\//, '')}`
}
