export const CURRENCIES = [
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
] as const

export type CurrencyCode = typeof CURRENCIES[number]['code']

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol || code
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode)
  if (currencyCode === 'KRW' || currencyCode === 'JPY') {
    return `${symbol}${Math.round(amount).toLocaleString()}`
  }
  return `${symbol}${amount.toFixed(2)}`
}
