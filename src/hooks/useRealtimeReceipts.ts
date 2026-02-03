'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, type Receipt } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeReceiptsOptions {
  tripId: string | null
}

interface RealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  receipt: Receipt
}

export function useRealtimeReceipts({ tripId }: UseRealtimeReceiptsOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!tripId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`receipts:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setLastEvent({ type: 'INSERT', receipt: payload.new as Receipt })
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setLastEvent({ type: 'UPDATE', receipt: payload.new as Receipt })
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setLastEvent({ type: 'DELETE', receipt: payload.old as Receipt })
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tripId])

  return { isConnected, lastEvent, clearLastEvent: () => setLastEvent(null) }
}
