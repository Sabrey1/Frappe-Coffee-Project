import { createRouter, createWebHistory } from 'vue-router'

export const routes = [
  { path: '/', redirect: '/sales' },
  { path: '/profile', name: 'profile', component: () => import('../view/Profile/profile.vue'), meta: { label: 'My profile' } },
  { path: '/settings', name: 'settings', component: () => import('../view/Settings/settings.vue'), meta: { label: 'Settings' } },
  { path: '/login', name: 'login', component: () => import('../auth/login.vue'), meta: { standalone: true } },
  { path: '/dashboard', name: 'dashboard', component: () => import('../view/Dashboard/dasboard.vue'), meta: { label: 'Dashboard', icon: 'overview', navigation: true } },
  { path: '/sales', name: 'sales', component: () => import('../view/Order/order.vue'), meta: { label: 'Sales', icon: 'menu', navigation: true } },
  { path: '/sales/list', name: 'sales-list', component: () => import('../view/Order/order_list.vue'), meta: { label: 'Sales List', icon: 'orders', navigation: true } },
  { path: '/sales/payment', name: 'order-payment', component: () => import('../view/Order/order_payment.vue/index.vue'), meta: { label: 'Payment' } },
  { path: '/pending-orders', name: 'pending-orders', component: () => import('../view/Order/pendding_oder.vue'), meta: { label: 'Pending Orders' } },
  { path: '/payments', name: 'payments', component: () => import('../view/Payment/payment_list.vue'), meta: { label: 'Payments', icon: 'orders', navigation: true } },
  { path: '/payments/new', name: 'add-payment', component: () => import('../view/Payment/add_payment.vue'), meta: { label: 'Payments' } },
  // {
  //   path: '/category',
  //   name: 'category',
  //   component: () => import('../view/Category/category.vue'),
  //   meta: { label: 'Category', icon: 'overview', navigation: true },
  // },
]

export const navigation = routes
  .filter((route) => route.meta?.navigation)
  .map((route) => ({ label: route.meta.label, icon: route.meta.icon, to: route.path }))

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})








