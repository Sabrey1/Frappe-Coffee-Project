<script setup>
import { t } from '../../utils/language.js'
import { onMounted, ref } from 'vue'
import api from '../../service/api_services'

const categories = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(0)
const hasNext = ref(false)
const pageSize = 20
const brokenImages = ref({})
const imageUrl = value => /^(https?:|data:|blob:)/i.test(value) ? value : `${(import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')}/${value.replace(/^\//, '')}`

async function loadCategories(targetPage = page.value) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await api.get('/api/resource/Coffee%20Category', {
      params: { fields: ['name', 'image', 'category_code', 'category_name', 'description'], limit_start: targetPage * pageSize, limit_page_length: pageSize + 1, order_by: 'name asc' },
    })
    if (!Array.isArray(response?.data)) throw new Error('Unexpected response')
    hasNext.value = response.data.length > pageSize
    categories.value = response.data.slice(0, pageSize)
    brokenImages.value = {}
    page.value = targetPage
  } catch (err) {
    error.value = err.status === 401 || err.status === 403
      ? 'You do not have access to categories. Sign in and check your permissions.'
      : 'Unable to load categories. Check your connection and try again.'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadCategories())
</script>

<template>
  <section class="category-panel" aria-labelledby="categories-heading">
    <div class="panel-header">
      <div><p class="panel-kicker">{{ t("YOUR MENU") }}</p><h2 id="categories-heading">{{ t("Categories") }}</h2><p class="panel-description">{{ t("Browse the categories in your workspace.") }}</p></div>
      <button class="refresh-button" type="button" :disabled="loading" @click="loadCategories()"><span aria-hidden="true">↻</span> {{ t("Refresh") }}</button>
    </div>
    <div v-if="loading" class="panel-state" role="status">{{ t("Loading categories…") }}</div>
    <div v-else-if="error" class="panel-state" role="alert"><p>{{ t(error) }}</p><button type="button" class="retry-button" @click="loadCategories()">{{ t("Try again") }}</button><RouterLink v-if="error.includes('Sign in')" to="/login">{{ t("Sign in") }}</RouterLink></div>
    <div v-else-if="!categories.length" class="panel-state"><div class="empty-icon" aria-hidden="true">◇</div><strong>{{ t("No categories yet") }}</strong><p>{{ t("Categories from Frappe will appear here.") }}</p></div>
    <template v-else>
      <div class="table-wrap"><table><thead><tr><th scope="col">{{ t("CATEGORY NAME") }}</th><th scope="col">{{ t("CODE") }}</th><th scope="col">{{ t("DESCRIPTION") }}</th></tr></thead><tbody><tr v-for="category in categories" :key="category.name"><td><div class="category-name"><span class="category-icon" aria-hidden="true"><img v-if="category.image && !brokenImages[category.name]" :src="imageUrl(category.image)" alt="" @error="brokenImages[category.name] = true"><template v-else>{{ (category.category_name || category.name || '?').charAt(0).toUpperCase() }}</template></span>{{ category.category_name || '—' }}</div></td><td>{{ category.category_code || '—' }}</td><td>{{ category.description || '—' }}</td> </tr></tbody></table></div>
      <div class="panel-footer"><span>{{ t('Page') }} {{ page + 1 }} · {{ categories.length }} {{ t(categories.length === 1 ? 'category' : 'categories') }} {{ t('shown') }}</span><div class="pagination"><button type="button" :disabled="page === 0" @click="loadCategories(page - 1)">{{ t("Previous") }}</button><button type="button" :disabled="!hasNext" @click="loadCategories(page + 1)">{{ t("Next") }}</button></div></div>
    </template>
  </section>
</template>

<style scoped>
.category-panel{margin-top:36px;background:#fff;border:1px solid #eaede7;border-radius:12px;overflow:hidden}.panel-header{padding:25px 27px;display:flex;justify-content:space-between;align-items:center;gap:20px}.panel-kicker{font-size:calc(10px * var(--font-scale, 1));font-weight:700;letter-spacing:1.2px;color:#8b9b88;margin:0 0 8px}.panel-header h2{font-size:calc(18px * var(--font-scale, 1));font-weight:650;letter-spacing:-.4px;color:#354035;margin:0}.panel-description{font-size:calc(13px * var(--font-scale, 1));color:#929b90;margin:6px 0 0}.refresh-button,.pagination button,.retry-button{border:1px solid #e2e8e0;background:#fff;border-radius:8px;color:#536650;font-size:calc(12px * var(--font-scale, 1));font-weight:600;padding:9px 13px}.refresh-button span{font-size:calc(16px * var(--font-scale, 1));margin-right:4px}.refresh-button:hover,.pagination button:not(:disabled):hover,.retry-button:hover{background:#f5f8f3}.refresh-button:disabled,.pagination button:disabled{opacity:.45;cursor:default}.table-wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;text-align:left}th{background:#fafbf9;color:#9aa599;font-size:calc(10px * var(--font-scale, 1));letter-spacing:.9px;font-weight:700;padding:13px 27px;border-top:1px solid #eef1ec;border-bottom:1px solid #eef1ec}td{padding:14px 27px;border-bottom:1px solid #f0f2ef;font-size:calc(13px * var(--font-scale, 1));color:#536050}tr:last-child td{border-bottom:0}.category-name{display:flex;align-items:center;gap:12px;font-weight:600;color:#3e4a3d}.category-icon{width:36px;height:36px;display:grid;place-items:center;flex:none;background:#eff4ec;color:#698365;border-radius:9px;font-size:calc(13px * var(--font-scale, 1))}.type-label{color:#849080;font-size:calc(12px * var(--font-scale, 1))}.panel-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid #eef1ec;padding:16px 27px;color:#929b90;font-size:calc(12px * var(--font-scale, 1))}.pagination{display:flex;gap:8px}.panel-state{min-height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;border-top:1px solid #eef1ec;text-align:center;padding:35px 24px;color:#8c998a;font-size:calc(13px * var(--font-scale, 1))}.panel-state p{margin:0}.panel-state strong{color:#475747;font-size:calc(14px * var(--font-scale, 1))}.panel-state a{color:#416b48;text-decoration:underline}.empty-icon{width:42px;height:42px;border-radius:12px;background:#eff4ec;color:#698365;display:grid;place-items:center;font-size:calc(24px * var(--font-scale, 1))}@media(max-width:600px){.category-panel{margin-top:28px}.panel-header{padding:22px 18px}th,td{padding-left:18px;padding-right:18px}.panel-footer{padding:16px 18px;flex-wrap:wrap}}
</style>
<style scoped>
.category-icon { overflow: hidden; }
.category-icon img { width: 100%; height: 100%; object-fit: cover; }
</style>

