# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## Frappe API service

`src/service/api_services.js` provides `get`, `post`, `put`, and `delete` methods. Set `VITE_FRAPPE_URL` in a local `.env` file to the Frappe site origin (for example, `http://localhost:8000`). Leave it unset when the frontend and Frappe API share an origin. Restart Vite after changing the variable.

```js
import api from './service/api_services'

const list = await api.get('/api/resource/Category', {
  params: { fields: ['name'], filters: [['disabled', '=', 0]] },
})
const created = await api.post('/api/resource/Category', { category_name: 'Coffee' })
const name = encodeURIComponent(created.data.name)
await api.put(`/api/resource/Category/${name}`, { category_name: 'Drinks' })
await api.delete(`/api/resource/Category/${name}`)
```

Methods return the full parsed Frappe response and throw an `ApiError` with `status` and `data` on HTTP errors. Requests include session cookies. For session-authenticated changes, pass `{ csrfToken: token }` as the options argument if `frappe.csrf_token` is not available globally. Cross-origin setups also need Frappe to allow the frontend origin and credentials. Keep API secrets on the server, not in Vite environment variables or frontend code.

During local development, Vite proxies `/api` to `VITE_FRAPPE_URL`, so browser requests use the frontend origin and can retain the Frappe session cookie. Restart the Vite server after changing `.env` or `vite.config.js`, then sign in again. In production, use a same-origin reverse proxy or configure cross-origin session cookies and CORS on the server. The signed-in user still needs read permission for the Category DocType.
