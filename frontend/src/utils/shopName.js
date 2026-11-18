import { ref } from 'vue'
import api from '../service/api_services'

export const shopName = ref('')
let loading

export function loadShopName() {
  if (!loading) {
    loading = api.get('/api/resource/Coffee%20Settings/Coffee%20Settings', {
      params: { fields: ['shop_name'] },
    }).then(response => {
      if (typeof response?.data?.shop_name !== 'string' || !response.data.shop_name.trim()) {
        throw new Error('Coffee Settings did not return a shop name.')
      }
      shopName.value = response.data.shop_name.trim()
    }).catch(error => {
      console.warn('Could not load the shop name from Coffee Settings.', error)
    }).finally(() => {
      loading = null
    })
  }
  return loading
}
