'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Trip, type Receipt } from '@/lib/supabase'
import { UploadForm } from '@/components/UploadForm'
import { ReceiptEditModal } from '@/components/ReceiptEditModal'
import { ShareButton } from '@/components/ShareButton'
import { useRealtimeReceipts } from '@/hooks/useRealtimeReceipts'
import { ExportButton } from '@/components/ExportButton'
import { useToast } from '@/components/Toast'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface TripPageProps {
  params: Promise<{ tripId: string }>
}

export default function TripPage({ params }: TripPageProps) {
  const { tripId } = use(params)
  const router = useRouter()
  const { showToast } = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [tripName, setTripName] = useState('')
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetValue, setBudgetValue] = useState('')

  const { isConnected, lastEvent, clearLastEvent } = useRealtimeReceipts({
    tripId: trip?.id || null
  })

  useEffect(() => {
    if (!UUID_REGEX.test(tripId)) {
      router.replace('/')
      return
    }
    loadTrip()
  }, [tripId, router])

  useEffect(() => {
    if (!lastEvent) return

    switch (lastEvent.type) {
      case 'INSERT':
        setReceipts(prev => {
          if (prev.some(r => r.id === lastEvent.receipt.id)) return prev
          return [lastEvent.receipt, ...prev]
        })
        break
      case 'UPDATE':
        setReceipts(prev =>
          prev.map(r => r.id === lastEvent.receipt.id ? lastEvent.receipt : r)
        )
        break
      case 'DELETE':
        setReceipts(prev => prev.filter(r => r.id !== lastEvent.receipt.id))
        break
    }

    clearLastEvent()
  }, [lastEvent, clearLastEvent])

  async function loadTrip() {
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (tripError || !tripData) {
        setError('Trip not found')
        setLoading(false)
        return
      }

      setTrip(tripData)
      setTripName(tripData.name || 'Untitled Trip')
      setBudgetValue(tripData.budget?.toString() || '1280')
      localStorage.setItem('tripId', tripId)

      const { data: receiptsData } = await supabase
        .from('receipts')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })

      setReceipts(receiptsData || [])
      setLoading(false)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip')
      setLoading(false)
    }
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

  async function saveTripName() {
    if (!tripName.trim() || !trip) return
    
    const { error } = await supabase
      .from('trips')
      .update({ name: tripName.trim() })
      .eq('id', trip.id)
    
    if (error) {
      showToast('Failed to save name', 'error')
      return
    }
    
    setTrip({ ...trip, name: tripName.trim() })
    setEditingName(false)
    showToast('Trip name updated', 'success')
  }

  async function saveBudget() {
    if (!trip) return
    const newBudget = parseFloat(budgetValue) || 1280
    
    const { error } = await supabase
      .from('trips')
      .update({ budget: newBudget })
      .eq('id', trip.id)
    
    if (error) {
      showToast('Failed to save budget', 'error')
      return
    }
    
    setTrip({ ...trip, budget: newBudget })
    setEditingBudget(false)
    showToast('Budget updated', 'success')
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
        <div className="text-center">
          <p className="text-lg font-semibold text-red-500">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg"
          >
            Create New Trip
          </button>
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
        <header>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Trips
          </button>
          
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="flex-1 text-xl font-bold px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTripName()
                  if (e.key === 'Escape') {
                    setTripName(trip?.name || 'Untitled Trip')
                    setEditingName(false)
                  }
                }}
              />
              <button
                onClick={saveTripName}
                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTripName(trip?.name || 'Untitled Trip')
                  setEditingName(false)
                }}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="w-full text-left group"
            >
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                {trip?.name || 'Untitled Trip'}
                <svg className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </h1>
            </button>
          )}
          
          <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-zinc-400'
              }`}
              title={isConnected ? 'Real-time sync active' : 'Connecting...'}
            />
            {isConnected ? 'Real-time sync active' : 'Connecting...'}
          </p>
        </header>

        <ShareButton tripId={tripId} />

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              ${totalSpent.toFixed(2)} spent
            </span>
            <span className={`text-sm ${remaining < 0 ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
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
          {editingBudget ? (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">$</span>
              <input
                type="number"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
                className="w-32 text-lg font-semibold px-2 py-1 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-center"
                autoFocus
                min="0"
                step="0.01"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveBudget()
                  if (e.key === 'Escape') {
                    setBudgetValue(trip?.budget?.toString() || '1280')
                    setEditingBudget(false)
                  }
                }}
              />
              <button
                onClick={saveBudget}
                className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setBudgetValue(trip?.budget?.toString() || '1280')
                  setEditingBudget(false)
                }}
                className="p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingBudget(true)}
              className="w-full text-center mt-2 group"
            >
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1">
                ${budget.toFixed(2)} budget
                <svg className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </span>
            </button>
          )}
        </div>

        <UploadForm
          tripId={tripId}
          onUploadComplete={handleUploadComplete}
          onOcrComplete={handleOcrComplete}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Receipts ({receipts.length})
            </h2>
            <ExportButton receipts={receipts} tripId={tripId} />
          </div>
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
