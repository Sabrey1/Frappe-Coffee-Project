import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initializeFontSize } from './utils/fontSize'
import { i18n, initializeLanguage } from './utils/language'

initializeFontSize()
initializeLanguage()

createApp(App).use(i18n).use(router).mount('#app')

