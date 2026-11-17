const key = 'frappe_checkout_draft'
let current = null

export function getCheckout() {
  if (current) return current
  try { current = JSON.parse(sessionStorage.getItem(key) || 'null') } catch { current = null }
  return current
}
export function setCheckout(value) {
  current = value
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the draft in memory when storage is unavailable. */ }
}
export function clearCheckout() {
  current = null
  try { sessionStorage.removeItem(key) } catch { /* Storage may be unavailable. */ }
}
