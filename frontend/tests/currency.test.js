import test from 'node:test'
import assert from 'node:assert/strict'
import { convertAmount, formatExchangeRate, formatMoney } from '../src/utils/currency.js'

test('formats each product amount using its currency code', () => {
  const expected = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(12.5)
  assert.equal(formatMoney(12.5, 'USD'), expected)
})

test('does not assume a currency when a product has no currency', () => {
  assert.equal(formatMoney(12.5), '12.50')
})

test('falls back to the product currency code when it cannot be formatted', () => {
  assert.equal(formatMoney(12.5, 'US'), 'US 12.50')
})

test('converts an amount using the configured direct exchange rate', () => {
  assert.deepEqual(convertAmount(1, 'USD', { from_currency: 'USD', to_currency: 'KHR', exchange_rate: 4100 }), {
    amount: 4100,
    currency: 'KHR',
  })
})

test('formats the configured exchange rate with both currencies', () => {
  assert.equal(formatExchangeRate({ from_currency: 'USD', to_currency: 'KHR', exchange_rate: 4100 }), `${formatMoney(1, 'USD', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} = ${formatMoney(4100, 'KHR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
})
