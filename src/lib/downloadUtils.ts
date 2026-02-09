/**
 * Utility functions for downloading receipt images
 */

/**
 * Sanitize a string for use in a filename
 */
export function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9가-힣\s\-_.]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 100) // Limit length
}

/**
 * Generate a download filename from receipt metadata
 * Format: {location}_{date}.{extension}
 */
export function generateFilename(
  location: string | null,
  date: string | null,
  extension: string = 'jpg'
): string {
  const loc = sanitizeFilename(location || 'Unknown')
  const d = date || 'no-date'
  return `${loc}_${d}.${extension}`
}

/**
 * Get file extension from URL or content-type
 */
export function getExtensionFromUrl(url: string): string {
  // Try to get from URL path
  const urlPath = url.split('?')[0]
  const match = urlPath.match(/\.([a-zA-Z0-9]+)$/)
  if (match) {
    const ext = match[1].toLowerCase()
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext
    }
  }
  return 'jpg' // Default
}

/**
 * Download a single image with custom filename
 */
export async function downloadImage(
  imageUrl: string,
  filename: string
): Promise<void> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

/**
 * Download receipt image with auto-generated filename
 */
export async function downloadReceiptImage(
  imageUrl: string,
  location: string | null,
  date: string | null
): Promise<void> {
  const extension = getExtensionFromUrl(imageUrl)
  const filename = generateFilename(location, date, extension)
  await downloadImage(imageUrl, filename)
}
