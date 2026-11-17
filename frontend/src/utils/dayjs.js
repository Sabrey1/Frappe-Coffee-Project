import dayjs from 'dayjs'

export function formatDate(value, format = 'DD/MM/YYYY') {
  if (!value) return ''

  const date = dayjs(value)
  return date.isValid() ? date.format(format) : ''
}

export function formatDateTime(value) {
  return formatDate(value, 'DD/MM/YYYY HH:mm')
}

export default dayjs
