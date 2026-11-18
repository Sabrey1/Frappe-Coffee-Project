<script setup>
import { computed } from 'vue'
import DashboardChart from '../../components/DashboardChart.vue'
import { useDashboard } from '../../composable/useDashboard.js'
import { t } from '../../utils/language.js'

const { orders, loading, error, dailyOrders, statuses, total, loadDashboard } = useDashboard()
const money = value => `$${Number(value || 0).toFixed(2)}`
const salesOption = computed(() => ({
  color: ['#62856b'],
  tooltip: { trigger: 'axis', valueFormatter: value => money(value) },
  grid: { left: 56, right: 20, top: 25, bottom: 35 },
  xAxis: { type: 'category', data: dailyOrders.value.map(day => day.label), axisTick: { show: false }, axisLine: { lineStyle: { color: '#dfe7de' } }, axisLabel: { color: '#7b897c' } },
  yAxis: { type: 'value', axisLabel: { color: '#7b897c', formatter: value => `$${value}` }, splitLine: { lineStyle: { color: '#edf1ec' } } },
  series: [{ name: t('Order value'), type: 'bar', data: dailyOrders.value.map(day => Number(day.total.toFixed(2))), barMaxWidth: 36, itemStyle: { borderRadius: [5, 5, 0, 0] } }],
}))
const statusOption = computed(() => ({
  color: ['#62856b', '#a8bd9f', '#d8b775', '#b6c6c1', '#d99e87', '#a7a8b7'],
  tooltip: { trigger: 'item' },
  series: [{ name: t('Orders'), type: 'pie', radius: ['48%', '72%'], center: ['50%', '50%'], avoidLabelOverlap: true, label: { formatter: '{b}: {c}', color: '#596b5c' }, data: statuses.value }],
}))
</script>

<template>
  <section class="dashboard">
    <header class="dashboard-header">
      <div><p class="eyebrow">{{ t('OVERVIEW') }}</p><h1>{{ t('Dashboard') }}</h1><p>{{ t('Your orders over the last 7 days.') }}</p></div>
      <button type="button" :disabled="loading" @click="loadDashboard">{{ t('Refresh') }}</button>
    </header>
    <div v-if="loading" class="state" role="status">{{ t('Loading dashboard…') }}</div>
    <div v-else-if="error" class="state" role="alert"><p>{{ t(error) }}</p><button type="button" @click="loadDashboard">{{ t('Try again') }}</button></div>
    <template v-else>
      <div class="summary">
        <article><span>{{ t('Orders') }}</span><strong>{{ orders.length }}</strong><small>{{ t('Last 7 days') }}</small></article>
        <article><span>{{ t('Order value') }}</span><strong>{{ money(total) }}</strong><small>{{ t('Excludes cancelled orders') }}</small></article>
      </div>
      <div v-if="!orders.length" class="state"><strong>{{ t('No orders in the last 7 days') }}</strong><p>{{ t('Orders will appear here when they are created.') }}</p></div>
      <div v-else class="charts">
        <article class="chart-card"><h2>{{ t('Order value by day') }}</h2><p>{{ t('Total order value, including unpaid orders.') }}</p><DashboardChart :option="salesOption" :label="t('Bar chart of order value by day')" /></article>
        <article class="chart-card"><h2>{{ t('Order status') }}</h2><p>{{ t('Orders created in the last 7 days.') }}</p><DashboardChart :option="statusOption" :label="t('Chart of orders by status')" /></article>
      </div>
      <details v-if="orders.length" class="data-details"><summary>{{ t('View chart data') }}</summary><div class="table-wrap"><table><thead><tr><th>{{ t('Date') }}</th><th>{{ t('Orders') }}</th><th>{{ t('Order value') }}</th></tr></thead><tbody><tr v-for="day in dailyOrders" :key="day.date"><td>{{ day.date }}</td><td>{{ day.count }}</td><td>{{ money(day.total) }}</td></tr></tbody></table><table><thead><tr><th>{{ t('Status') }}</th><th>{{ t('Orders') }}</th></tr></thead><tbody><tr v-for="status in statuses" :key="status.name"><td>{{ t(status.name) }}</td><td>{{ status.value }}</td></tr></tbody></table></div></details>
    </template>
  </section>
</template>

<style scoped>
.dashboard{padding:32px;max-width:1500px;margin:auto;color:#304035}.dashboard-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px}.dashboard-header h1{font-size:28px;margin:4px 0}.dashboard-header p,.chart-card p,.state p{color:#879589;font-size:14px;margin:6px 0}.dashboard-header .eyebrow{font-size:10px;letter-spacing:1.3px;font-weight:700;color:#8da08d}.dashboard button{border:1px solid #dce6dc;background:white;color:#456449;border-radius:8px;padding:10px 16px;cursor:pointer;font-weight:600}.dashboard button:disabled{opacity:.6;cursor:wait}.summary,.charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-bottom:18px}.summary article,.chart-card,.state,.data-details{background:#fff;border:1px solid #e8eee7;border-radius:12px;padding:22px}.summary article span,.summary article small{display:block;color:#849286;font-size:13px}.summary article strong{display:block;font-size:28px;margin:12px 0 6px}.chart-card h2{font-size:16px;margin:0}.chart-card p{margin-bottom:10px}.state{text-align:center;padding:48px 20px}.state button{margin-top:12px}.data-details summary{cursor:pointer;font-weight:600}.table-wrap{display:flex;gap:30px;flex-wrap:wrap;margin-top:16px}table{border-collapse:collapse;min-width:240px;font-size:13px}th,td{text-align:left;padding:8px 16px 8px 0;border-bottom:1px solid #edf1ec}th{color:#778879}@media(max-width:700px){.dashboard{padding:20px 16px}.summary,.charts{grid-template-columns:1fr}.dashboard-header h1{font-size:24px}}
</style>
