import { describe, expect, test } from 'bun:test'
import { generateCsv } from './exportCsv'
import type { Receipt } from './supabase'

const mockReceipt = (overrides: Partial<Receipt> = {}): Receipt => ({
  id: 'test-id',
  trip_id: 'trip-123',
  image_url: 'https://example.com/image.jpg',
  date: '2025-01-15',
  time: '14:30',
  location: 'Coffee Shop',
  cost: 5.50,
  original_currency: 'USD',
  ocr_confidence: 0.95,
  created_at: '2025-01-15T14:30:00Z',
  ...overrides
})

describe('generateCsv', () => {
  test('generates CSV with headers and data rows', () => {
    const receipts = [mockReceipt()]
    const csv = generateCsv(receipts)
    
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Date,Time,Location,Cost,Currency')
    expect(lines[1]).toBe('2025-01-15,14:30,Coffee Shop,5.5,USD')
  })

  test('sorts receipts by date ascending', () => {
    const receipts = [
      mockReceipt({ id: '1', date: '2025-01-20', location: 'Second' }),
      mockReceipt({ id: '2', date: '2025-01-10', location: 'First' }),
      mockReceipt({ id: '3', date: '2025-01-15', location: 'Middle' }),
    ]
    const csv = generateCsv(receipts)
    
    const lines = csv.split('\n')
    expect(lines[1]).toContain('First')
    expect(lines[2]).toContain('Middle')
    expect(lines[3]).toContain('Second')
  })

  test('handles null values', () => {
    const receipts = [mockReceipt({ date: null, time: null, location: null, cost: null })]
    const csv = generateCsv(receipts)
    
    const lines = csv.split('\n')
    expect(lines[1]).toBe(',,,,USD')
  })

  test('escapes fields containing commas', () => {
    const receipts = [mockReceipt({ location: 'Shop, Inc.' })]
    const csv = generateCsv(receipts)
    
    expect(csv).toContain('"Shop, Inc."')
  })

  test('escapes fields containing quotes', () => {
    const receipts = [mockReceipt({ location: 'The "Best" Shop' })]
    const csv = generateCsv(receipts)
    
    expect(csv).toContain('"The ""Best"" Shop"')
  })

  test('returns only headers for empty receipts', () => {
    const csv = generateCsv([])
    expect(csv).toBe('Date,Time,Location,Cost,Currency')
  })
})
