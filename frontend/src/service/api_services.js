// Vite proxies /api in development; production can use a configured Frappe origin.
const baseUrl = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_FRAPPE_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(method, endpoint, { params, data, headers = {}, csrfToken, signal } = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params || {})) {
    if (value != null) {
      query.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
    }
  }

  const queryString = query.toString()
  const url = `${baseUrl}${path}${queryString ? `${path.includes('?') ? '&' : '?'}${queryString}` : ''}`
  const requestHeaders = new Headers({ Accept: 'application/json', ...headers })
  if (data !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  const token = csrfToken || globalThis.frappe?.csrf_token
  if (token && method !== 'GET') requestHeaders.set('X-Frappe-CSRF-Token', token)

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    signal,
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  })
  const text = await response.text()
  let result = null
  if (text) {
    try { result = JSON.parse(text) } catch { result = text }
  }
  if (!response.ok) {
    throw new ApiError(result?.message || result?.exception || response.statusText || 'Request failed', response.status, result)
  }
  return result
}

const api = {
  get: (endpoint, options) => request('GET', endpoint, options),
  post: (endpoint, data, options = {}) => request('POST', endpoint, { ...options, data }),
  put: (endpoint, data, options = {}) => request('PUT', endpoint, { ...options, data }),
  delete: (endpoint, options) => request('DELETE', endpoint, options),
}

export default api


