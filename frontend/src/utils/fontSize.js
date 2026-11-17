import { ref } from 'vue'

const storageKey = 'frappe-coffee-font-size'
const legacySizes = { normal: 100, large: 115, 'extra-large': 130 }
export const fontSize = ref(100)

function applyFontSize(value) {
  const number = value == null || value === '' ? NaN : Number(legacySizes[value] ?? value)
  const size = Number.isFinite(number) ? Math.min(130, Math.max(90, Math.round(number / 5) * 5)) : 100
  fontSize.value = size
  document.documentElement.style.setProperty('--font-scale', String(size / 100))
}

export function initializeFontSize() {
  try { applyFontSize(localStorage.getItem(storageKey)) }
  catch { applyFontSize(100) }
}

export function setFontSize(value) {
  applyFontSize(value)
  try { localStorage.setItem(storageKey, String(fontSize.value)); return true }
  catch { return false }
}
