'use client'

import type { Receipt } from '@/lib/supabase'
import { downloadCsv } from '@/lib/exportCsv'

interface ExportButtonProps {
  receipts: Receipt[]
  tripId: string
}

export function ExportButton({ receipts, tripId }: ExportButtonProps) {
  const handleExport = () => {
    if (receipts.length === 0) return
    downloadCsv(receipts, tripId)
  }

  return (
    <button
      onClick={handleExport}
      disabled={receipts.length === 0}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export CSV
    </button>
  )
}
