import type { Receipt } from './supabase'

export function generateCsv(receipts: Receipt[], baseCurrency?: string): string {
  const base = baseCurrency || 'KRW'
  const headers = ['Date', 'Time', 'Location', 'Original Cost', 'Currency', 'Converted Cost', 'Base Currency', 'Exchange Rate']
  const rows = receipts
    .sort((a, b) => {
      const dateA = a.date || ''
      const dateB = b.date || ''
      return dateA.localeCompare(dateB)
    })
    .map(r => [
      r.date || '',
      r.time || '',
      escapeCsvField(r.location || ''),
      r.cost?.toString() || '',
      r.original_currency || base,
      r.converted_cost?.toString() || r.cost?.toString() || '',
      base,
      r.exchange_rate?.toString() || ''
    ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function downloadCsv(receipts: Receipt[], tripId: string, baseCurrency?: string): void {
  const csv = generateCsv(receipts, baseCurrency)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `expenses-${tripId.slice(0, 8)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
