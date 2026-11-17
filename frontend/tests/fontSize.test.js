import test from 'node:test'
import assert from 'node:assert/strict'
import { fontSize, initializeFontSize, setFontSize } from '../src/utils/fontSize.js'

const storage = new Map()
let appliedScale

globalThis.document = { documentElement: { style: { setProperty(name, value) { if (name === '--font-scale') appliedScale = value } } } }
globalThis.localStorage = { getItem(key) { return storage.get(key) ?? null }, setItem(key, value) { storage.set(key, value) } }

test('applies and restores the slider preference', () => {
  initializeFontSize()
  assert.equal(fontSize.value, 100)
  assert.equal(appliedScale, '1')
  assert.equal(setFontSize(120), true)
  assert.equal(appliedScale, '1.2')
  setFontSize(100)
  storage.set('frappe-coffee-font-size', '125')
  initializeFontSize()
  assert.equal(fontSize.value, 125)
  assert.equal(appliedScale, '1.25')
})

test('restores old choices and handles invalid or out-of-range values', () => {
  storage.set('frappe-coffee-font-size', 'extra-large')
  initializeFontSize()
  assert.equal(fontSize.value, 130)
  storage.set('frappe-coffee-font-size', 'unknown')
  initializeFontSize()
  assert.equal(fontSize.value, 100)
  setFontSize(500)
  assert.equal(fontSize.value, 130)
  setFontSize(80)
  assert.equal(fontSize.value, 90)
})
