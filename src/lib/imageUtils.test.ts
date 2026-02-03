import { describe, expect, test } from 'bun:test'

const isHeicFile = (file: File): boolean => {
  const name = file.name.toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif'
}

describe('isHeicFile', () => {
  test('detects .heic extension', () => {
    const file = new File([''], 'photo.heic', { type: 'image/heic' })
    expect(isHeicFile(file)).toBe(true)
  })

  test('detects .HEIC extension (uppercase)', () => {
    const file = new File([''], 'photo.HEIC', { type: '' })
    expect(isHeicFile(file)).toBe(true)
  })

  test('detects .heif extension', () => {
    const file = new File([''], 'photo.heif', { type: 'image/heif' })
    expect(isHeicFile(file)).toBe(true)
  })

  test('detects image/heic mime type', () => {
    const file = new File([''], 'photo', { type: 'image/heic' })
    expect(isHeicFile(file)).toBe(true)
  })

  test('returns false for jpg files', () => {
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    expect(isHeicFile(file)).toBe(false)
  })

  test('returns false for png files', () => {
    const file = new File([''], 'photo.png', { type: 'image/png' })
    expect(isHeicFile(file)).toBe(false)
  })
})
