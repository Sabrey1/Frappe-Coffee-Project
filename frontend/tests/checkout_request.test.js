import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCheckoutRequest } from '../src/view/Order/checkout_request.js'

test('existing draft checkout only sends order ID and payment details', () => {
  const request = buildCheckoutRequest({ checkoutKey: 'key', order: { orderId: 'O-001', orderType: 'Dine In', table: 'T', customer: 'C', items: [{ name: 'P', quantity: 2 }] }, paymentMethod: 'PM-001', amountReceived: 6, referenceNumber: ' ref ' })
  assert.deepEqual(request, { checkout_key: 'key', order_id: 'O-001', payment_method: 'PM-001', amount_received: 6, reference_number: 'ref' })
})

test('new order checkout includes the order details', () => {
  const request = buildCheckoutRequest({ checkoutKey: 'key', order: { orderType: 'Takeaway', items: [{ name: 'P', quantity: 2 }], customer: 'C' }, paymentMethod: 'PM', amountReceived: 6 })
  assert.deepEqual(request, { checkout_key: 'key', order_type: 'Takeaway', items: [{ menu_item: 'P', quantity: 2 }], customer: 'C', payment_method: 'PM', amount_received: 6 })
})

test('insufficient amount is a correctable server rejection', async () => {
  const { correctableCheckoutError } = await import('../src/view/Order/checkout_request.js')
  const error = { status: 417, data: { exc_type: 'ValidationError', _server_messages: JSON.stringify([JSON.stringify({ message: 'Amount received is less than the order total.' })]) } }
  assert.equal(correctableCheckoutError(error), 'Amount received is less than the order total.')
})

test('unknown or uncertain failures retain the original request', async () => {
  const { correctableCheckoutError } = await import('../src/view/Order/checkout_request.js')
  const response = message => ({ status: 417, data: { exc_type: 'ValidationError', _server_messages: JSON.stringify([JSON.stringify({ message })]) } })
  assert.equal(correctableCheckoutError(response('This checkout key was already used for a different request.')), '')
  assert.equal(correctableCheckoutError({ status: 500, data: response('Amount received is less than the order total.').data }), '')
  assert.equal(correctableCheckoutError({ status: 417, data: { exc_type: 'ValidationError', _server_messages: 'invalid' } }), '')
})
