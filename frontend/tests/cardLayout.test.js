import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultCardLayout, loadCardLayout, normalizeCardLayout, saveCardLayout } from '../src/utils/cardLayout.js'

const storage = new Map()
globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null }, setItem(key, value) { storage.set(key, value) } }

test('saves and restores card layout settings', () => {
  assert.deepEqual(loadCardLayout(), defaultCardLayout)
  assert.equal(saveCardLayout({ width: 240, height: 280, columns: 3 }), true)
  assert.deepEqual(loadCardLayout(), { width: 240, height: 280, columns: 3 })
  saveCardLayout(defaultCardLayout)
  assert.deepEqual(loadCardLayout(), defaultCardLayout)
})

test('bounds layout values and handles invalid stored data', () => {
  assert.deepEqual(normalizeCardLayout({ width: 1000, height: 20, columns: 9 }), { width: 320, height: 180, columns: 0 })
  storage.set('frappe-coffee-order-card-layout', '{invalid')
  assert.deepEqual(loadCardLayout(), defaultCardLayout)
})
