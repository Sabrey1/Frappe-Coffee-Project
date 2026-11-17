import test from 'node:test'
import assert from 'node:assert/strict'
import { initializeLanguage, language, setLanguage, t } from '../src/utils/language.js'
import en from '../src/locales/en.json' with { type: 'json' }
import km from '../src/locales/km.json' with { type: 'json' }

const store = new Map()
globalThis.document = { documentElement: { lang: '' } }
globalThis.localStorage = { getItem(key) { return store.get(key) ?? null }, setItem(key, value) { store.set(key, value) } }

test('switches and restores the selected language', () => {
  initializeLanguage()
  assert.equal(language.value, 'en')
  assert.equal(t('Sales'), 'Sales')
  assert.equal(setLanguage('km'), true)
  assert.equal(t('Sales'), 'ការលក់')
  assert.equal(document.documentElement.lang, 'km')
  setLanguage('en')
  store.set('frappe-coffee-language', 'km')
  initializeLanguage()
  assert.equal(language.value, 'km')
})

test('keeps unsupported text and rejects invalid language codes', () => {
  assert.equal(t('Custom product name'), 'Custom product name')
  assert.equal(setLanguage('xx'), false)
  assert.equal(language.value, 'km')
})

test('all JSON messages resolve in both languages, including keys with punctuation', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(km).sort())
  setLanguage('en')
  for (const [key, value] of Object.entries(en)) assert.equal(t(key), value, key)
  setLanguage('km')
  for (const [key, value] of Object.entries(km)) assert.equal(t(key), value, key)
})
