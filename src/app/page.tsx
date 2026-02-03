'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type Trip } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTripName, setNewTripName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

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
      const { data, error } = await supabase
        .from('trips')
        .insert({ 
          name: newTripName.trim(),
          budget: 1280, 
          currency: 'USD' 
        })
        .select()
        .single()

      if (error) throw error

      localStorage.setItem('tripId', data.id)
      router.push(`/${data.id}`)

    } catch (err) {
      console.error('Failed to create trip:', err)
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
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewTripName('')
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
              <button
                key={trip.id}
                onClick={() => {
                  localStorage.setItem('tripId', trip.id)
                  router.push(`/${trip.id}`)
                }}
                className="w-full bg-white dark:bg-zinc-900 rounded-xl p-4 shadow-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
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
    </div>
  )
}
