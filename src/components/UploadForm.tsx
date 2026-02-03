'use client'

import { useState, useRef } from 'react'

interface UploadFormProps {
  tripId: string
  onUploadComplete?: (receipt: Record<string, unknown>) => void
  onOcrComplete?: (receipt: Record<string, unknown>) => void
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export function UploadForm({ tripId, onUploadComplete, onOcrComplete }: UploadFormProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setState('uploading')
    setError(null)
    setOcrStatus(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('tripId', tripId)

    try {
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      onUploadComplete?.(uploadData.receipt)

      setState('processing')
      setOcrStatus('Analyzing receipt...')

      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: uploadData.receipt.id,
          imageUrl: uploadData.imageUrl
        })
      })

      const ocrData = await ocrResponse.json()

      if (ocrData.success && ocrData.receipt) {
        onOcrComplete?.(ocrData.receipt)
        setOcrStatus('Data extracted!')
      } else {
        setOcrStatus(ocrData.error || 'OCR skipped - you can edit manually')
      }

      setState('success')

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      setTimeout(() => {
        setState('idle')
        setOcrStatus(null)
      }, 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }

  const renderContent = () => {
    switch (state) {
      case 'uploading':
        return (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
            <p className="text-sm text-zinc-500 mt-2">Uploading...</p>
          </>
        )
      case 'processing':
        return (
          <>
            <div className="animate-pulse rounded-full h-8 w-8 bg-yellow-400" />
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">{ocrStatus}</p>
          </>
        )
      case 'success':
        return (
          <>
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-500 mt-2">Upload complete!</p>
            {ocrStatus && <p className="text-xs text-zinc-500">{ocrStatus}</p>}
          </>
        )
      case 'error':
        return (
          <>
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm text-red-500 mt-2">{error}</p>
          </>
        )
      default:
        return (
          <>
            <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-sm text-zinc-500 mt-2">
              <span className="font-semibold">Click to upload</span> receipt
            </p>
            <p className="text-xs text-zinc-400">PNG, JPG up to 10MB</p>
          </>
        )
    }
  }

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {renderContent()}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={state !== 'idle' && state !== 'error'}
          className="hidden"
        />
      </label>
    </div>
  )
}
