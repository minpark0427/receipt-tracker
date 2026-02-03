'use client'

import { useState, useEffect } from 'react'
import { type Receipt } from '@/lib/supabase'

interface ReceiptEditModalProps {
  receipt: Receipt
  onClose: () => void
  onSave: (updatedReceipt: Receipt) => void
  onDelete?: (receiptId: string) => void
}

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null

  const color = confidence >= 0.8 ? 'bg-green-500' :
                confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={`Confidence: ${(confidence * 100).toFixed(0)}%`} />
  )
}

export function ReceiptEditModal({ receipt, onClose, onSave, onDelete }: ReceiptEditModalProps) {
  const [date, setDate] = useState(receipt.date || '')
  const [time, setTime] = useState(receipt.time || '')
  const [location, setLocation] = useState(receipt.location || '')
  const [cost, setCost] = useState(receipt.cost?.toString() || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/receipts/${receipt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date || null,
          time: time || null,
          location: location || null,
          cost: cost ? parseFloat(cost) : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      onSave(data.receipt)
      onClose()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this receipt?')) return

    setSaving(true)
    try {
      const response = await fetch(`/api/receipts/${receipt.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete')
      }

      onDelete?.(receipt.id)
      onClose()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Edit Receipt</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {receipt.image_url && (
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
            <img src={receipt.image_url} alt="Receipt" className="w-full h-48 object-contain rounded" />
          </div>
        )}

        <div className="p-4 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Location
              <ConfidenceBadge confidence={receipt.ocr_confidence} />
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Store or restaurant name"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={e => setCost(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-3">
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
