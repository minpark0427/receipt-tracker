'use client'

import { useState, useRef } from 'react'
import { processImageForUpload } from '@/lib/imageUtils'

interface UploadFormProps {
  tripId: string
  onUploadComplete?: (receipt: Record<string, unknown>) => void
  onOcrComplete?: (receipt: Record<string, unknown>) => void
}

type UploadState = 'idle' | 'converting' | 'uploading' | 'processing' | 'success' | 'error'

export function UploadForm({ tripId, onUploadComplete, onOcrComplete }: UploadFormProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    setPendingFile(file)
  }

  const cancelPreview = () => {
    setPreview(null)
    setPendingFile(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  const confirmUpload = async () => {
    if (!pendingFile) return

    setState('converting')
    setError(null)
    setOcrStatus(null)

    try {
      const processedFile = await processImageForUpload(pendingFile, (status) => {
        setOcrStatus(status)
      })

      setState('uploading')
      setOcrStatus(null)

      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('tripId', tripId)

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
      setPreview(null)
      setPendingFile(null)

      if (cameraInputRef.current) cameraInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''

      setTimeout(() => {
        setState('idle')
        setOcrStatus(null)
      }, 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
      setPreview(null)
      setPendingFile(null)
    }
  }

  if (preview && state === 'idle') {
    return (
      <div className="w-full">
        <div className="relative rounded-lg overflow-hidden border-2 border-zinc-300 dark:border-zinc-600">
          <img
            src={preview}
            alt="Receipt preview"
            className="w-full h-48 object-contain bg-zinc-100 dark:bg-zinc-800"
          />
          <div className="absolute bottom-0 left-0 right-0 flex gap-2 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <button
              onClick={cancelPreview}
              className="flex-1 py-2 px-4 rounded-lg bg-zinc-500 hover:bg-zinc-600 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmUpload}
              className="flex-1 py-2 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state !== 'idle') {
    return (
      <div className="w-full">
        <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg bg-zinc-50 dark:bg-zinc-800">
          {state === 'converting' && (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">{ocrStatus || 'Preparing image...'}</p>
            </>
          )}
          {state === 'uploading' && (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
              <p className="text-sm text-zinc-500 mt-2">Uploading...</p>
            </>
          )}
          {state === 'processing' && (
            <>
              <div className="animate-pulse rounded-full h-8 w-8 bg-yellow-400" />
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">{ocrStatus}</p>
            </>
          )}
          {state === 'success' && (
            <>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-500 mt-2">Upload complete!</p>
              {ocrStatus && <p className="text-xs text-zinc-500">{ocrStatus}</p>}
            </>
          )}
          {state === 'error' && (
            <>
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="text-sm text-red-500 mt-2">{error}</p>
              <button
                onClick={() => setState('idle')}
                className="mt-2 text-xs text-zinc-500 underline"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex gap-3">
        <label className="flex-1 flex flex-col items-center justify-center h-28 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">Camera</p>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        <label className="flex-1 flex flex-col items-center justify-center h-28 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 font-medium">Gallery</p>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>
      <p className="text-xs text-zinc-400 text-center mt-2">PNG, JPG, HEIC up to 10MB</p>
    </div>
  )
}
