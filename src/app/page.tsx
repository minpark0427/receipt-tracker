'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Trip } from '@/lib/supabase'
import { useToast } from '@/components/Toast'

export default function Home() {
  const router = useRouter()
  const { showToast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTripName, setNewTripName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [newTripBudget, setNewTripBudget] = useState('1280')

  useEffect(() => {
    loadTrips()
  }, [])

  async function loadTrips() {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .order('created_at', { ascending: false })
    
    setTrips(data || [])
    setLoading(false)
  }

  async function createNewTrip() {
    if (!newTripName.trim()) return
    
    setCreating(true)
    try {
      const budget = parseFloat(newTripBudget) || 1280
      const { data, error } = await supabase
        .from('trips')
        .insert({ 
          name: newTripName.trim(),
          budget, 
          currency: 'USD' 
        })
        .select()
        .single()

      if (error) throw error

      localStorage.setItem('tripId', data.id)
      router.push(`/${data.id}`)

    } catch (err) {
      console.error('Failed to create trip:', err)
      showToast('Failed to create trip', 'error')
      setCreating(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  async function deleteTrip(trip: Trip) {
    setDeleting(true)
    try {
      await supabase
        .from('receipts')
        .delete()
        .eq('trip_id', trip.id)
      
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', trip.id)
      
      if (error) throw error
      
      setTrips(prev => prev.filter(t => t.id !== trip.id))
      setTripToDelete(null)
      showToast(`"${trip.name || 'Untitled Trip'}" deleted`, 'success')
      
      if (localStorage.getItem('tripId') === trip.id) {
        localStorage.removeItem('tripId')
      }
    } catch (err) {
      console.error('Failed to delete trip:', err)
      showToast('Failed to delete trip', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-md mx-auto space-y-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Receipt Tracker
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Track your business trip expenses
          </p>
        </div>

        {showCreateForm ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              New Trip
            </h2>
            <input
              type="text"
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
              placeholder="Trip name (e.g., LA Business Trip)"
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 mb-3"
              autoFocus
            />
            <div className="mb-4">
              <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                Budget (USD)
              </label>
              <input
                type="number"
                value={newTripBudget}
                onChange={(e) => setNewTripBudget(e.target.value)}
                placeholder="1280"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewTripName('')
                  setNewTripBudget('1280')
                }}
                className="flex-1 px-4 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewTrip}
                disabled={creating || !newTripName.trim()}
                className="flex-1 px-4 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full px-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Trip
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
          </div>
        ) : trips.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
              Your Trips ({trips.length})
            </h2>
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                <button
                  onClick={() => {
                    localStorage.setItem('tripId', trip.id)
                    router.push(`/${trip.id}`)
                  }}
                  className="w-full p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {trip.name || 'Untitled Trip'}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        Created {formatDate(trip.created_at)}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-2 flex justify-end bg-zinc-50 dark:bg-zinc-800/50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setTripToDelete(trip)
                    }}
                    className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 px-3 py-1.5 rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            <p>No trips yet. Create your first trip!</p>
          </div>
        )}

        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 text-center">
            Have a trip link? Just paste it in your browser.
          </p>
        </div>
      </div>

      {tripToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Delete Trip?
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Are you sure you want to delete &ldquo;{tripToDelete.name || 'Untitled Trip'}&rdquo;? 
              This will also delete all receipts and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setTripToDelete(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTrip(tripToDelete)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
