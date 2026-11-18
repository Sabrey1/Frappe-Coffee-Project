export function formatMoney(value, currencyCode = '', options = {}) {
  const amount = Number(value || 0)
  if (!currencyCode) return amount.toFixed(2)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, ...options }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`
  }
}

export function convertAmount(value, currencyCode, exchangeRate) {
  const amount = Number(value || 0)
  if (exchangeRate && currencyCode === exchangeRate.from_currency) {
    return { amount: amount * Number(exchangeRate.exchange_rate), currency: exchangeRate.to_currency }
  }
  return { amount, currency: currencyCode }
}

export function formatExchangeRate(exchangeRate) {
  const wholeCurrency = { minimumFractionDigits: 0, maximumFractionDigits: 0 }
  return `${formatMoney(1, exchangeRate.from_currency, wholeCurrency)} = ${formatMoney(exchangeRate.exchange_rate, exchangeRate.to_currency, wholeCurrency)}`
}
