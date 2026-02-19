'use client'

import { useState } from 'react'
import JSZip from 'jszip'
import { type Receipt } from '@/lib/supabase'
import { generateFilename, getExtensionFromUrl } from '@/lib/downloadUtils'
import { getImageSrc } from '@/lib/imageUrl'

interface DownloadAllButtonProps {
  receipts: Receipt[]
  tripName?: string
}

export function DownloadAllButton({ receipts, tripName }: DownloadAllButtonProps) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)

  const receiptsWithImages = receipts.filter(r => r.image_url)

  const handleDownloadAll = async () => {
    if (receiptsWithImages.length === 0) return

    setDownloading(true)
    setProgress(0)

    try {
      const zip = new JSZip()
      const folder = zip.folder('receipts')
      if (!folder) throw new Error('Failed to create folder')

      const usedNames = new Set<string>()

      for (let i = 0; i < receiptsWithImages.length; i++) {
        const receipt = receiptsWithImages[i]
        if (!receipt.image_url) continue

        try {
          const proxiedUrl = getImageSrc(receipt.image_url)
          const response = await fetch(proxiedUrl)
          if (!response.ok) continue

          const blob = await response.blob()
          const extension = getExtensionFromUrl(receipt.image_url)
          let filename = generateFilename(receipt.location, receipt.date, extension)

          let counter = 1
          const baseName = filename.replace(/\.[^.]+$/, '')
          const ext = filename.split('.').pop() || 'jpg'
          while (usedNames.has(filename)) {
            filename = `${baseName}_${counter}.${ext}`
            counter++
          }
          usedNames.add(filename)

          folder.file(filename, blob)
          setProgress(Math.round(((i + 1) / receiptsWithImages.length) * 100))
        } catch (err) {
          console.error(`Failed to download ${receipt.id}:`, err)
        }
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const zipFilename = tripName
        ? `${tripName.replace(/[^a-zA-Z0-9가-힣\s-]/g, '').replace(/\s+/g, '_')}_receipts.zip`
        : 'receipts.zip'

      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = zipFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download all failed:', err)
    } finally {
      setDownloading(false)
      setProgress(0)
    }
  }

  if (receiptsWithImages.length === 0) return null

  return (
    <button
      onClick={handleDownloadAll}
      disabled={downloading}
      className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors disabled:opacity-50"
    >
      {downloading ? (
        <>
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-700 dark:border-zinc-500 dark:border-t-zinc-200 rounded-full animate-spin" />
          <span>Downloading... {progress}%</span>
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Download All ({receiptsWithImages.length} images)</span>
        </>
      )}
    </button>
  )
}
