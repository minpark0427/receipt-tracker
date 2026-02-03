import { describe, expect, test } from 'bun:test'
import { isTabscannerError, type TabscannerResult, type TabscannerError } from './tabscanner'

describe('isTabscannerError', () => {
  test('returns true for error objects', () => {
    const error: TabscannerError = {
      code: 'NO_API_KEY',
      message: 'API key not configured'
    }
    expect(isTabscannerError(error)).toBe(true)
  })

  test('returns false for result objects', () => {
    const result: TabscannerResult = {
      establishment: 'Coffee Shop',
      date: '2025-01-15',
      time: '14:30:00',
      total: 5.50,
      currency: 'USD',
      confidence: {
        establishment: 0.95,
        date: 0.90,
        total: 0.99,
        overall: 0.95
      }
    }
    expect(isTabscannerError(result)).toBe(false)
  })
})
