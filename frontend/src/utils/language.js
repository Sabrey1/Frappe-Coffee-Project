import { createI18n } from 'vue-i18n'
import en from '../locales/en.json' with { type: 'json' }
import km from '../locales/km.json' with { type: 'json' }

const storageKey = 'frappe-coffee-language'
const messages = { en, km }

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
  missingWarn: false,
  fallbackWarn: false,
  // Existing translation keys are full sentences and can contain periods.
  messageResolver: (message, key) => Object.hasOwn(message, key) ? message[key] : null,
})

export const language = i18n.global.locale

// Server messages and user-provided names remain unchanged when no key exists.
export function t(value) {
  if (typeof value !== 'string' || (!Object.hasOwn(en, value) && !Object.hasOwn(km, value))) return value
  return i18n.global.t(value)
}

export function setLanguage(value) {
  if (!Object.hasOwn(messages, value)) return false
  language.value = value
  document.documentElement.lang = value
  try { localStorage.setItem(storageKey, value); return true } catch { return false }
}

export function initializeLanguage() {
  let saved = 'en'
  try { saved = localStorage.getItem(storageKey) || 'en' } catch { /* Use English when storage is unavailable. */ }
  setLanguage(Object.hasOwn(messages, saved) ? saved : 'en')
}
