import heic2any from 'heic2any'
import imageCompression from 'browser-image-compression'

const MAX_FILE_SIZE_MB = 2
const MAX_WIDTH_OR_HEIGHT = 2048

export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif'
}

export async function convertHeicToJpg(file: File): Promise<File> {
  const blob = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9
  })

  const resultBlob = Array.isArray(blob) ? blob[0] : blob
  const newName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg')
  
  return new File([resultBlob], newName, { type: 'image/jpeg' })
}

export async function compressImage(file: File): Promise<File> {
  const fileSizeMB = file.size / 1024 / 1024
  
  if (fileSizeMB <= MAX_FILE_SIZE_MB && !isHeicFile(file)) {
    return file
  }

  return imageCompression(file, {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
    fileType: 'image/jpeg'
  })
}

export async function processImageForUpload(
  file: File,
  onProgress?: (status: string) => void
): Promise<File> {
  let processedFile = file

  if (isHeicFile(file)) {
    onProgress?.('Converting HEIC to JPG...')
    processedFile = await convertHeicToJpg(file)
  }

  const fileSizeMB = processedFile.size / 1024 / 1024
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    onProgress?.('Compressing image...')
    processedFile = await compressImage(processedFile)
  }

  return processedFile
}
