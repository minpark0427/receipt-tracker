export function getImageSrc(imageUrl: string): string {
  const storagePath = extractStoragePath(imageUrl)
  return `/api/image?path=${encodeURIComponent(storagePath)}`
}

function extractStoragePath(imageUrl: string): string {
  if (!imageUrl.startsWith('http')) {
    return imageUrl
  }

  // Supabase signed URL: https://{project}.supabase.co/storage/v1/object/sign/receipt-images/{path}?token=...
  const marker = '/receipt-images/'
  const idx = imageUrl.indexOf(marker)
  if (idx !== -1) {
    const afterMarker = imageUrl.substring(idx + marker.length)
    const qIdx = afterMarker.indexOf('?')
    return qIdx !== -1 ? afterMarker.substring(0, qIdx) : afterMarker
  }

  return imageUrl
}
