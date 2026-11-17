import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateTime } from '../src/utils/dayjs.js'

test('formats Frappe dates and datetimes', () => {
  assert.equal(formatDate('2026-11-14'), '14/11/2026')
  assert.equal(formatDateTime('2026-11-14 15:16:03.169523'), '14/11/2026 15:16')
  assert.equal(formatDate('2026-11-14T15:16', 'YYYY-MM-DD HH:mm:ss'), '2026-11-14 15:16:00')
})

test('returns an empty value for missing or invalid dates', () => {
  assert.equal(formatDateTime(null), '')
  assert.equal(formatDate('invalid'), '')
})
