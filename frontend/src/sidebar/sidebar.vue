<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../service/api_services'
import { navigation } from '../router'
import { clearProfile, loadProfile, profile, profileImageUrl } from '../utils/profile'
import { language, setLanguage, t } from '../utils/language'

const route = useRoute()
const router = useRouter()
const loggingOut = ref(false)
const activePage = ref(null)
const selectedManagement = ref(null)
const activeItem = computed(() => selectedManagement.value || route.meta.label || 'Category')
watch(() => route.fullPath, () => { selectedManagement.value = null; closeProfileMenu() })
const menuOpen = ref(false)
const profileMenuOpen = ref(false)
const showLanguages = ref(false)
const profileMenu = ref(null)
const profileTrigger = ref(null)
const profileFirstAction = ref(null)
const languageBack = ref(null)
const languageStorageError = ref(false)
const profileImageError = ref(false)
const profileInitial = computed(() => (profile.value?.fullName || profile.value?.id || '?').trim().charAt(0).toUpperCase())
watch(() => profile.value?.image, () => { profileImageError.value = false })
function closeProfileMenu(restoreFocus = false) {
  profileMenuOpen.value = false
  showLanguages.value = false
  if (restoreFocus) nextTick(() => profileTrigger.value?.focus())
}
async function toggleProfileMenu() {
  if (profileMenuOpen.value) { closeProfileMenu(); return }
  profileMenuOpen.value = true
  await nextTick()
  profileFirstAction.value?.focus()
}
async function openLanguageMenu() {
  showLanguages.value = true
  await nextTick()
  languageBack.value?.focus()
}
async function backToProfileMenu() {
  showLanguages.value = false
  await nextTick()
  profileFirstAction.value?.focus()
}
function chooseLanguage(value) {
  languageStorageError.value = !setLanguage(value)
}
function handleOutsideClick(event) {
  if (profileMenuOpen.value && !profileMenu.value?.contains(event.target)) closeProfileMenu()
}
async function openProfile() {
  closeProfileMenu()
  const failure = await router.push({ name: 'profile' })
  if (!failure || route.name === 'profile') { selectedManagement.value = null; menuOpen.value = false }
}
onMounted(() => { loadProfile(); document.addEventListener('pointerdown', handleOutsideClick) })
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsideClick))

const management = [
  { label: 'Reports', icon: 'reports' },
]

async function logout() {
  if (loggingOut.value) return
  if (activePage.value?.confirmExitOrder && !(await activePage.value.confirmExitOrder(true))) return
  loggingOut.value = true
  try {
    await api.get('/api/method/logout')
  } catch (error) {
    console.warn('Frappe logout request failed; the server session may still be active.', error)
  } finally {
    clearProfile()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    loggingOut.value = false
    await router.replace('/login')
  }
}

async function selectItem(label) {
  if (label === 'Settings') {
    if (route.name === 'settings') {
      selectedManagement.value = null
      menuOpen.value = false
      return
    }
    const failure = await router.push({ name: 'settings' })
    if (!failure) { selectedManagement.value = null; menuOpen.value = false }
    return
  }
  if (activePage.value?.confirmExitOrder && !(await activePage.value.confirmExitOrder())) return
  selectedManagement.value = label
  menuOpen.value = false
}
</script>

<template>
  <div class="app-shell" :class="{ 'sales-list-shell': ['sales-list', 'payments', 'settings', 'profile'].includes(route.name) }">
    <button v-if="menuOpen" class="mobile-overlay" :aria-label="t('Close navigation')" @click="menuOpen = false"></button>

    <aside class="sidebar" :class="{ 'sidebar-open': menuOpen }" :aria-label="t('Main navigation')">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 9h11v4.5a5.5 5.5 0 0 1-11 0V9Z" stroke="currentColor" stroke-width="1.7"/><path d="M16 10h1.25a2.25 2.25 0 1 1 0 4.5H16M8 4.5v1.7M12 4.5v1.7M4 20h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        </div>
        <div><strong>Frappe</strong><span>{{ t("COFFEE WORKSPACE") }}</span></div>
        <button class="close-menu" :aria-label="t('Close navigation')" @click="menuOpen = false">&times;</button>
      </div>

      <nav class="navigation">
        <p class="nav-heading">{{ t("WORKSPACE") }}</p>
        <RouterLink v-for="item in navigation" :key="item.label" :to="item.to" class="nav-item" :class="{ active: activeItem === item.label }" :aria-current="activeItem === item.label ? 'page' : undefined" @click="selectedManagement = null; menuOpen = false">
          <svg v-if="item.icon === 'overview'" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>
          <svg v-else-if="item.icon === 'orders'" viewBox="0 0 24 24" fill="none"><path d="M6 4.5h12v16l-3-1.8-3 1.8-3-1.8-3 1.8v-16Z"/><path d="M9 9h6M9 12.5h6"/></svg>
          <svg v-else-if="item.icon === 'menu'" viewBox="0 0 24 24" fill="none"><path d="M5 8h11v5a5.5 5.5 0 0 1-11 0V8ZM16 9h1.5a2.5 2.5 0 0 1 0 5H16M4 20h14M8 3v2M12 3v2"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1a5.5 5.5 0 0 1 11 0v1H3.5ZM16 5.5a3 3 0 0 1 0 5.8M17 13a4.5 4.5 0 0 1 3.5 4.4V19H18"/></svg>
          <span>{{ t(item.label) }}</span>
        </RouterLink>
        <p class="nav-heading management-heading">{{ t("MANAGEMENT") }}</p>
        <button v-for="item in management" :key="item.label" class="nav-item" :class="{ active: activeItem === item.label }" :aria-current="activeItem === item.label ? 'page' : undefined" @click="selectItem(item.label)">
          <svg v-if="item.icon === 'reports'" viewBox="0 0 24 24" fill="none"><path d="M4 20h16M6.5 17v-5M12 17V5M17.5 17V9"/></svg>
          <span>{{ t(item.label) }}</span>
        </button>
        <div class="sidebar-bottom">
          <button class="nav-item" type="button" :class="{ active: activeItem === 'Settings' }" :aria-current="activeItem === 'Settings' ? 'page' : undefined" @click="selectItem('Settings')">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.5 7.5 0 0 0 0-3l1.5-1-1.5-2.6-1.8.6a7.7 7.7 0 0 0-2.6-1.5L14.3 4h-3l-.4 2a7.7 7.7 0 0 0-2.6 1.5l-1.8-.6L5 9.5l1.5 1a7.5 7.5 0 0 0 0 3l-1.5 1 1.5 2.6 1.8-.6a7.7 7.7 0 0 0 2.6 1.5l.4 2h3l.4-2a7.7 7.7 0 0 0 2.6-1.5l1.8.6 1.5-2.6-1.6-1Z"/></svg>
            <span>{{ t('Settings') }}</span>
          </button>
          <button class="nav-item sidebar-logout" type="button" :disabled="loggingOut" @click="logout">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></svg>
            <span>{{ t(loggingOut ? 'Signing out…' : 'Log out') }}</span>
          </button>
        </div>
      </nav>
    </aside>

    <div class="main-column">
      <header class="header">
        <div class="header-left"><button class="menu-toggle" :aria-label="t('Open navigation')" :aria-expanded="menuOpen" @click="menuOpen = true"><span></span><span></span><span></span></button><span class="breadcrumb-muted">{{ t("Workspace") }}</span><span class="breadcrumb-divider">/</span><span class="breadcrumb-current">{{ t(activeItem) }}</span></div>
        <div class="header-right"><RouterLink class="pending-shortcut" :to="{ name: 'pending-orders' }" :aria-label="t('Pending Orders')" :title="t('Pending Orders')" @click="selectedManagement = null; menuOpen = false"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 4.5h12v16l-3-1.8-3 1.8-3-1.8-3 1.8v-16ZM9 9h6M9 12.5h6"/></svg></RouterLink><div class="header-divider"></div><div ref="profileMenu" class="profile-menu-wrap" @keydown.esc.stop.prevent="closeProfileMenu(true)"><button ref="profileTrigger" type="button" class="avatar profile-link" :aria-label="t('Your account')" :aria-expanded="profileMenuOpen" aria-controls="profile-dropdown" @click="toggleProfileMenu"><img v-if="profile?.image && !profileImageError" :src="profileImageUrl(profile.image)" alt="" @error="profileImageError = true"><span v-else>{{ profileInitial }}</span></button><div v-if="profileMenuOpen" id="profile-dropdown" class="profile-dropdown"><template v-if="!showLanguages"><div class="profile-dropdown-header"><strong>{{ profile?.fullName || t('Your account') }}</strong><span v-if="profile?.email || profile?.id">{{ profile.email || profile.id }}</span></div><button ref="profileFirstAction" type="button" class="profile-action" @click="openProfile"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a7 7 0 0 1 14 0v1H5Z"/></svg>{{ t('View Profile') }}</button><button type="button" class="profile-action" @click="openLanguageMenu"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>{{ t('Change language') }}<span class="profile-action-arrow" aria-hidden="true">›</span></button><button type="button" class="profile-action profile-logout" :disabled="loggingOut" @click="closeProfileMenu(); logout()"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"/></svg>{{ t('Logout') }}</button></template><template v-else><button ref="languageBack" type="button" class="profile-language-back" @click="backToProfileMenu">← {{ t('Back') }}</button><p class="profile-language-title">{{ t('Language') }}</p><button type="button" class="profile-action" :aria-pressed="language === 'en'" @click="chooseLanguage('en')">{{ t("English") }} <span v-if="language === 'en'" class="profile-action-arrow" aria-hidden="true">✓</span></button><button type="button" class="profile-action" :aria-pressed="language === 'km'" @click="chooseLanguage('km')">ភាសាខ្មែរ <span v-if="language === 'km'" class="profile-action-arrow" aria-hidden="true">✓</span></button><p v-if="languageStorageError" class="profile-language-error" role="alert">{{ t('Could not save language preference.') }}</p></template></div></div></div>
      </header>
      <main class="content" :class="{ 'sales-content': ['sales', 'order-payment'].includes(route.name), 'category-content': ['category', 'sales-list', 'pending-orders', 'payments', 'add-payment', 'settings', 'profile'].includes(route.name), 'add-payment-content': route.name === 'add-payment', 'order-list-content': ['sales-list', 'pending-orders', 'payments'].includes(route.name), 'pending-content': route.name === 'pending-orders', 'settings-content': ['settings', 'profile'].includes(route.name) }">
        <div v-if="route.name !== 'sales' && route.name !== 'order-payment' && route.name !== 'category' && route.name !== 'sales-list' && route.name !== 'pending-orders' && route.name !== 'payments' && route.name !== 'add-payment' && route.name !== 'settings' && route.name !== 'profile'" class="page-intro"><div><p class="eyebrow">{{ t("YOUR WORKSPACE") }}</p><h1>{{ t(activeItem) }}</h1><p class="subtitle">{{ t("A little space to keep your coffee business running smoothly.") }}</p></div><div class="date-badge"><span class="status-dot"></span> {{ t("Your workspace") }}</div></div>
        <RouterView v-if="!selectedManagement" v-slot="{ Component }"><component :is="Component" :key="route.fullPath" ref="activePage" /></RouterView>
        <div v-else class="welcome-card"><div class="welcome-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M5 9h11v4.5a5.5 5.5 0 0 1-11 0V9ZM16 10h1.25a2.25 2.25 0 1 1 0 4.5H16M8 4v2M12 4v2M4 20h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><p class="card-kicker">{{ t("WELCOME TO FRAPPE") }}</p><h2>{{ t("Good things start here.") }}</h2><p>{{ t('Your workspace is ready. Select an item from the sidebar to explore.') }}</p></div>
      </main>
    </div>
  </div>
</template>













