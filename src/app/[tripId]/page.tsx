'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Trip, type Receipt, type ExchangeRate } from '@/lib/supabase'
import { UploadForm } from '@/components/UploadForm'
import { ReceiptEditModal } from '@/components/ReceiptEditModal'
import { ShareButton } from '@/components/ShareButton'
import { useRealtimeReceipts } from '@/hooks/useRealtimeReceipts'
import { ExportButton } from '@/components/ExportButton'
import { DownloadAllButton } from '@/components/DownloadAllButton'
import { useToast } from '@/components/Toast'
import { getImageSrc } from '@/lib/imageUrl'
import { CURRENCIES, getCurrencySymbol, formatCurrency } from '@/lib/currency'

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
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [showRateSettings, setShowRateSettings] = useState(false)
  const [editingRates, setEditingRates] = useState<{ currency: string; rate: string }[]>([])

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

      const { data: ratesData } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('trip_id', tripId)

      setRates(ratesData || [])
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

  const [editingBaseCurrency, setEditingBaseCurrency] = useState('')

  function openRateSettings() {
    setEditingRates(rates.map(r => ({ currency: r.from_currency, rate: r.rate.toString() })))
    setEditingBaseCurrency(trip?.currency || 'KRW')
    setShowRateSettings(true)
  }

  function addEditingRate() {
    const usedCurrencies = [editingBaseCurrency || trip?.currency || 'KRW', ...editingRates.map(r => r.currency)]
    const available = CURRENCIES.find(c => !usedCurrencies.includes(c.code))
    if (available) {
      setEditingRates(prev => [...prev, { currency: available.code, rate: '' }])
    }
  }

  async function saveRates() {
    if (!trip) return

    // Update base currency if changed
    if (editingBaseCurrency !== trip.currency) {
      const { error: currError } = await supabase
        .from('trips')
        .update({ currency: editingBaseCurrency })
        .eq('id', trip.id)
      if (currError) {
        showToast('Failed to update currency', 'error')
        return
      }
      setTrip({ ...trip, currency: editingBaseCurrency })
    }

    // Delete existing rates for this trip
    await supabase.from('exchange_rates').delete().eq('trip_id', trip.id)

    // Insert new rates
    const validRates = editingRates.filter(r => r.rate && parseFloat(r.rate) > 0)
    if (validRates.length > 0) {
      const { error } = await supabase.from('exchange_rates').insert(
        validRates.map(r => ({
          trip_id: trip.id,
          from_currency: r.currency,
          rate: parseFloat(r.rate)
        }))
      )
      if (error) {
        showToast('Failed to save rates', 'error')
        return
      }
    }

    // Reload rates
    const { data: ratesData } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('trip_id', trip.id)
    setRates(ratesData || [])
    setShowRateSettings(false)
    showToast('Exchange rates updated', 'success')
  }

  function getConvertedCost(receipt: Receipt): number {
    const cost = receipt.cost || 0
    const baseCurrency = trip?.currency || 'KRW'
    const receiptCurrency = receipt.original_currency || baseCurrency

    if (receiptCurrency === baseCurrency) return cost

    // Use stored converted_cost if available
    if (receipt.converted_cost !== null) return receipt.converted_cost

    // Look up rate
    const rate = rates.find(r => r.from_currency === receiptCurrency)
    if (rate) return cost * rate.rate

    return cost // no rate found, use original
  }

  function hasNoRate(receipt: Receipt): boolean {
    const baseCurrency = trip?.currency || 'KRW'
    const receiptCurrency = receipt.original_currency || baseCurrency
    if (receiptCurrency === baseCurrency) return false
    if (receipt.converted_cost !== null) return false
    return !rates.find(r => r.from_currency === receiptCurrency)
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

  const baseCurrency = trip?.currency || 'KRW'
  const totalSpent = receipts.reduce((sum, r) => sum + getConvertedCost(r), 0)
  const budget = trip?.budget || 1280
  const remaining = budget - totalSpent
  const percentUsed = Math.min((totalSpent / budget) * 100, 100)
  const missingRates = receipts.filter(r => hasNoRate(r))

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
              {formatCurrency(totalSpent, baseCurrency)} spent
            </span>
            <span className={`text-sm ${remaining < 0 ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
              {formatCurrency(remaining, baseCurrency)} remaining
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
          {missingRates.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {[...new Set(missingRates.map(r => r.original_currency))].join(', ')} exchange rate not set.
                <button onClick={openRateSettings} className="underline ml-1">Set rates</button>
              </p>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-2">
            {editingBudget ? (
              <>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{getCurrencySymbol(baseCurrency)}</span>
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
              </>
            ) : (
              <button
                onClick={() => setEditingBudget(true)}
                className="text-center group"
              >
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1">
                  {formatCurrency(budget, baseCurrency)} budget
                  <svg className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </span>
              </button>
            )}
          </div>
          <button
            onClick={openRateSettings}
            className="w-full mt-3 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Currency & Exchange Rate Settings
          </button>
          {rates.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 justify-center">
              {rates.map(r => (
                <span key={r.id} className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  1 {r.from_currency} = {r.rate.toLocaleString()} {baseCurrency}
                </span>
              ))}
            </div>
          )}
        </div>

        <UploadForm
          tripId={tripId}
          onUploadComplete={handleUploadComplete}
          onOcrComplete={handleOcrComplete}
        />

        <DownloadAllButton receipts={receipts} tripName={trip?.name} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Receipts ({receipts.length})
            </h2>
            <ExportButton receipts={receipts} tripId={tripId} baseCurrency={baseCurrency} />
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
                    src={getImageSrc(receipt.image_url)}
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
                    {receipt.cost !== null ? formatCurrency(getConvertedCost(receipt), baseCurrency) : 'N/A'}
                  </p>
                  {receipt.cost !== null && receipt.original_currency && receipt.original_currency !== baseCurrency && (
                    <p className="text-xs text-zinc-400">
                      {formatCurrency(receipt.cost, receipt.original_currency)}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedReceipt && (
        <ReceiptEditModal
          receipt={selectedReceipt}
          baseCurrency={baseCurrency}
          rates={rates}
          onClose={() => setSelectedReceipt(null)}
          onSave={handleReceiptSave}
          onDelete={handleReceiptDelete}
        />
      )}

      {showRateSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowRateSettings(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Currency Settings</h2>
            <div className="mb-4">
              <label className="block text-sm text-zinc-500 mb-1">Base Currency</label>
              <select
                value={editingBaseCurrency}
                onChange={(e) => setEditingBaseCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.code} - {c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 mb-4">
              {editingRates.map((er, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500 w-4">1</span>
                  <select
                    value={er.currency}
                    onChange={(e) => setEditingRates(prev => prev.map((r, idx) => idx === i ? { ...r, currency: e.target.value } : r))}
                    className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                  >
                    {CURRENCIES.filter(c => c.code !== editingBaseCurrency && (c.code === er.currency || !editingRates.some(r => r.currency === c.code))).map(c => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
                    ))}
                  </select>
                  <span className="text-sm text-zinc-500">=</span>
                  <input
                    type="number"
                    value={er.rate}
                    onChange={(e) => setEditingRates(prev => prev.map((r, idx) => idx === i ? { ...r, rate: e.target.value } : r))}
                    placeholder="0"
                    min="0"
                    step="0.0001"
                    className="w-28 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm"
                  />
                  <span className="text-sm text-zinc-500">{getCurrencySymbol(editingBaseCurrency)}</span>
                  <button
                    onClick={() => setEditingRates(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-zinc-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addEditingRate}
              className="w-full mb-4 px-4 py-2 border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 rounded-lg text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              + Add Currency
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRateSettings(false)}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRates}
                className="flex-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
