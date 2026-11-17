export function buildCheckoutRequest({ checkoutKey, order, paymentMethod, amountReceived, referenceNumber }) {
  return {
    checkout_key: checkoutKey,
    ...(order.orderId ? { order_id: order.orderId } : {
      order_type: order.orderType,
      items: order.items.map(item => ({ menu_item: item.name, quantity: item.quantity })),
      ...(order.table?.trim() ? { table: order.table.trim() } : {}),
      ...(order.customer?.trim() ? { customer: order.customer.trim() } : {}),
    }),
    payment_method: paymentMethod,
    amount_received: amountReceived,
    ...(referenceNumber?.trim() ? { reference_number: referenceNumber.trim() } : {}),
  }
}

// Only these validation failures occur before checkout saves an order or payment.
// Other errors may have an uncertain outcome and must retain the original request.
const correctableMessages = [
  'Amount received is less than the order total.',
  'Non-cash payments must match the order total.',
  'A payment reference is required for this payment method.',
  'Amount received must be positive and have at most two decimal places.',
]

export function correctableCheckoutError(error) {
  if (error?.status !== 417 || error?.data?.exc_type !== 'ValidationError') return ''
  let messages = error.data._server_messages
  try { if (typeof messages === 'string') messages = JSON.parse(messages) } catch { return '' }
  if (!Array.isArray(messages)) return ''
  for (let entry of messages) {
    try { if (typeof entry === 'string') entry = JSON.parse(entry) } catch { continue }
    const message = typeof entry?.message === 'string' ? entry.message : ''
    if (correctableMessages.includes(message)) return message
  }
  return ''
}
