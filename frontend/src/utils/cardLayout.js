const storageKey = 'frappe-coffee-order-card-layout'
export const defaultCardLayout = Object.freeze({ width: 0, height: 0, columns: 0 })

export function normalizeCardLayout(value) {
  const input = value && typeof value === 'object' ? value : {}
  const size = (number, min, max) => {
    const parsed = Number(number)
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return Math.min(max, Math.max(min, Math.round(parsed / 10) * 10))
  }
  const columns = Number(input.columns)
  return {
    width: size(input.width, 140, 320),
    height: size(input.height, 180, 360),
    columns: Number.isInteger(columns) && columns >= 1 && columns <= 6 ? columns : 0,
  }
}

export function loadCardLayout() {
  try { return normalizeCardLayout(JSON.parse(localStorage.getItem(storageKey) || 'null')) }
  catch { return { ...defaultCardLayout } }
}

export function saveCardLayout(value) {
  try { localStorage.setItem(storageKey, JSON.stringify(normalizeCardLayout(value))); return true }
  catch { return false }
}
