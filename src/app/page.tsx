'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const storedTripId = localStorage.getItem('tripId')

    if (storedTripId) {
      supabase
        .from('trips')
        .select('id')
        .eq('id', storedTripId)
        .single()
        .then(({ data }) => {
          if (data) {
            router.replace(`/${storedTripId}`)
          } else {
            localStorage.removeItem('tripId')
          }
        })
    }
  }, [router])

  async function createNewTrip() {
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({ budget: 1280, currency: 'USD' })
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Receipt Tracker
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Track your business trip expenses in real-time with your team
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Start Tracking
            </h2>
            <p className="text-sm text-zinc-500 mb-4">
              Create a new trip to start uploading receipts. Share the link with your team for collaborative tracking.
            </p>
            <button
              onClick={createNewTrip}
              disabled={creating}
              className="w-full px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Creating...
                </span>
              ) : (
                'Create New Trip'
              )}
            </button>
          </div>

          <div className="text-sm text-zinc-500">
            <p>Have a trip link? Just paste it in your browser.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Features</h3>
          <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Photo upload with OCR
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Real-time team sync
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Budget tracking
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              CSV export
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
