'use client'

import { useState, useEffect } from 'react'
import { supabase, type Trip, type Receipt } from '@/lib/supabase'
import { UploadForm } from '@/components/UploadForm'
import { ReceiptEditModal } from '@/components/ReceiptEditModal'

export default function Home() {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)

  useEffect(() => {
    initializeTrip()
  }, [])

  async function initializeTrip() {
    try {
      const storedTripId = localStorage.getItem('tripId')

      if (storedTripId) {
        const { data: existingTrip, error: fetchError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', storedTripId)
          .single()

        if (existingTrip && !fetchError) {
          setTrip(existingTrip)
          await loadReceipts(existingTrip.id)
          setLoading(false)
          return
        }
      }

      const { data: newTrip, error: createError } = await supabase
        .from('trips')
        .insert({ budget: 1280, currency: 'USD' })
        .select()
        .single()

      if (createError) throw createError

      localStorage.setItem('tripId', newTrip.id)
      setTrip(newTrip)
      setLoading(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize')
      setLoading(false)
    }
  }

  async function loadReceipts(tripId: string) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading receipts:', error)
      return
    }

    setReceipts(data || [])
  }

  function handleUploadComplete(receipt: Record<string, unknown>) {
    setReceipts(prev => [receipt as unknown as Receipt, ...prev])
  }

  function handleOcrComplete(updatedReceipt: Record<string, unknown>) {
    setReceipts(prev =>
      prev.map(r =>
        r.id === (updatedReceipt as unknown as Receipt).id
          ? (updatedReceipt as unknown as Receipt)
          : r
      )
    )
  }

  function handleReceiptSave(updatedReceipt: Receipt) {
    setReceipts(prev => prev.map(r => r.id === updatedReceipt.id ? updatedReceipt : r))
  }

  function handleReceiptDelete(receiptId: string) {
    setReceipts(prev => prev.filter(r => r.id !== receiptId))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const totalSpent = receipts.reduce((sum, r) => sum + (r.cost || 0), 0)
  const budget = trip?.budget || 1280
  const remaining = budget - totalSpent
  const percentUsed = Math.min((totalSpent / budget) * 100, 100)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-md mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Receipt Tracker
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Business Trip Budget
          </p>
        </header>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              ${totalSpent.toFixed(2)} spent
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              ${remaining.toFixed(2)} remaining
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                percentUsed >= 100 ? 'bg-red-500' :
                percentUsed >= 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <p className="text-center mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            ${budget.toFixed(2)} budget
          </p>
        </div>

        {trip && (
          <UploadForm
            tripId={trip.id}
            onUploadComplete={handleUploadComplete}
            onOcrComplete={handleOcrComplete}
          />
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Receipts ({receipts.length})
          </h2>
          {receipts.length === 0 ? (
            <p className="text-center text-zinc-500 py-8">
              No receipts yet. Upload your first receipt!
            </p>
          ) : (
            receipts.map(receipt => (
              <button
                key={receipt.id}
                onClick={() => setSelectedReceipt(receipt)}
                className="w-full bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-sm flex items-center gap-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {receipt.image_url && (
                  <img
                    src={receipt.image_url}
                    alt="Receipt"
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {receipt.location || 'Unknown location'}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {receipt.date || 'No date'} {receipt.time || ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {receipt.cost !== null ? `$${receipt.cost.toFixed(2)}` : 'N/A'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedReceipt && (
        <ReceiptEditModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onSave={handleReceiptSave}
          onDelete={handleReceiptDelete}
        />
      )}
    </div>
  )
}
