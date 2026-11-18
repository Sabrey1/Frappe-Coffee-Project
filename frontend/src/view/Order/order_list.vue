<script setup>
import { t } from '../../utils/language.js'
import { formatDate } from '../../utils/dayjs'
import '../Payment/payment.css'
import { useOrderList } from '../../composable/useOrderList.js'

const { orders, loading, error, status, page, hasNext, selected, detailLoading, detailError, detailDialog, customerNamesError, customerLabel, loadOrders, viewOrder, closeDetails, amount } = useOrderList()
</script>

<template>
  <section class="payment-page sales-list">
    <div class="payment-card"><div class="payment-card-header"><div><h2>{{ t("All orders") }}</h2><p>{{ t("View orders and their payment status.") }}</p></div><div class="list-tools"><label for="sales-status" class="visually-hidden">{{ t("Filter by order status") }}</label><select id="sales-status" v-model="status" :disabled="loading" @change="loadOrders(0)"><option value="">{{ t("All statuses") }}</option><option value="Pending">{{ t("Pending") }}</option><option value="Submitted">{{ t("Submitted") }}</option><option value="Cancelled">{{ t("Cancelled") }}</option></select><button class="payment-secondary" :disabled="loading" @click="loadOrders()">{{ t("↻ Refresh") }}</button><RouterLink class="payment-primary" to="/sales">{{ t("＋ New sale") }}</RouterLink></div></div>
      <p v-if="customerNamesError" class="customer-name-notice" role="status">{{ t(customerNamesError) }}</p>
      <div v-if="loading" class="payment-state" role="status">{{ t("Loading sales…") }}</div><div v-else-if="error" class="payment-state" role="alert"><p>{{ t(error) }}</p><button class="payment-secondary" @click="loadOrders()">{{ t("Try again") }}</button></div><div v-else-if="!orders.length" class="payment-state"><strong>{{ t("No orders found") }}</strong><p>{{ t("Orders matching this filter will appear here.") }}</p></div>
      <template v-else><div class="payment-table-wrap"><table class="payment-table"><thead><tr><th scope="col">{{ t("ORDER") }}</th><th scope="col">{{ t("DATE") }}</th><th scope="col">{{ t("TYPE") }}</th><th scope="col">{{ t("CUSTOMER") }}</th><th scope="col">{{ t("STATUS") }}</th><th scope="col">{{ t("PAYMENT") }}</th><th scope="col">{{ t("TOTAL") }}</th><th scope="col"><span class="visually-hidden">{{ t("Details") }}</span></th></tr></thead><tbody><tr v-for="order in orders" :key="order.name"><td :data-label="t('ORDER')"><strong>{{ order.order_code || order.name }}</strong></td><td :data-label="t('DATE')">{{ formatDate(order.order_time) || formatDate(order.creation) || '—' }}</td><td :data-label="t('TYPE')">{{ order.order_type || '—' }}</td><td :data-label="t('CUSTOMER')">{{ customerLabel(order.customer) }}</td><td :data-label="t('STATUS')"><span class="payment-status">{{ order.status || '—' }}</span></td><td :data-label="t('PAYMENT')">{{ order.payment_status || '—' }}</td><td :data-label="t('TOTAL')">{{ amount(order.grand_total, order.currency) }}</td><td class="mobile-card-action"><button class="details-button" @click="viewOrder(order)">{{ t("View") }}<span class="visually-hidden"> {{ order.order_code || order.name }}</span></button></td></tr></tbody></table></div><div class="payment-footer"><span>{{ t('Page') }} {{ page + 1 }} · {{ orders.length }} {{ t('shown') }}</span><div><button class="payment-secondary" :disabled="page === 0" @click="loadOrders(page - 1)">{{ t("Previous") }}</button><button class="payment-secondary" :disabled="!hasNext" @click="loadOrders(page + 1)">{{ t("Next") }}</button></div></div></template>
    </div>
    <dialog ref="detailDialog" class="order-dialog" aria-labelledby="order-dialog-title" @close="closeDetails"><div class="payment-card-header"><div><h2 id="order-dialog-title">{{ t("Order details") }}</h2><p v-if="selected">{{ selected.order_code || selected.name }}</p></div><button type="button" class="payment-secondary" @click="detailDialog.close()">{{ t("Close") }}</button></div><div v-if="detailLoading" class="payment-state" role="status">{{ t("Loading order…") }}</div><div v-else-if="detailError" class="payment-state" role="alert">{{ t(detailError) }}</div><div v-else-if="selected" class="detail-content"><div class="detail-meta"><span>{{ t("Type:") }} <strong>{{ selected.order_type || '—' }}</strong></span><span>{{ t("Customer:") }} <strong>{{ customerLabel(selected.customer) }}</strong></span><span>{{ t("Cashier:") }} <strong>{{ selected.cashier || '—' }}</strong></span></div><div v-if="selected.items?.length" class="detail-items"><div v-for="(item, index) in selected.items" :key="item.name || index"><span>{{ item.quantity }} × {{ item.item_name || item.menu_item }}</span><strong>{{ amount(item.amount, selected.currency) }}</strong></div></div><p v-else>{{ t("No items found for this order.") }}</p><div class="detail-total"><span>{{ t("Total") }}</span><strong>{{ amount(selected.grand_total, selected.currency) }}</strong></div></div></dialog>
  </section>
</template>

<style scoped>
.list-tools{display:flex;align-items:center;gap:8px}.list-tools select{border:1px solid #e2e8e0;border-radius:8px;padding:9px 11px;background:#fff;color:#586b56;font-size:calc(12px * var(--font-scale, 1))}.visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.details-button{border:0;background:transparent;color:#4f7950;font-size:calc(12px * var(--font-scale, 1));font-weight:650}.detail-card{margin-top:18px}.detail-content{padding:0 26px 24px;color:#758172;font-size:calc(13px * var(--font-scale, 1))}.detail-meta{display:flex;flex-wrap:wrap;gap:12px 24px;padding-bottom:16px}.detail-meta strong{color:#455744}.detail-items{border-top:1px solid #eef1ec}.detail-items>div,.detail-total{display:flex;justify-content:space-between;gap:15px;padding:12px 0;border-bottom:1px solid #eef1ec}.detail-items strong,.detail-total strong{color:#455744}.detail-total{font-weight:650;border:0}.payment-card-header{flex-wrap:wrap}@media(max-width:600px){.list-tools{width:100%;justify-content:space-between}.detail-content{padding:0 20px 20px}}
</style>
<style scoped>
.list-tools { flex-wrap: wrap; }
.customer-name-notice { margin: 0; padding: 8px 24px; color: #806c45; background: #faf7ef; font-size: calc(12px * var(--font-scale, 1)); }
.order-dialog { position: fixed; inset: 0; margin: auto; width: min(560px, calc(100% - 32px)); max-height: min(80dvh, 720px); padding: 0; border: 1px solid #e6ece3; border-radius: 12px; background: #fff; color: #354035; box-shadow: 0 18px 60px #1c301c30; overflow-y: auto; }
.order-dialog::backdrop { background: #17221780; }
</style>




