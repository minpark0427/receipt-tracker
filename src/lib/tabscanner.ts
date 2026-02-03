const TABSCANNER_API_KEY = process.env.TABSCANNER_API_KEY
const TABSCANNER_BASE_URL = 'https://api.tabscanner.com'

export interface TabscannerResult {
  establishment: string | null
  date: string | null
  time: string | null
  total: number | null
  currency: string | null
  confidence: {
    establishment: number
    date: number
    total: number
    overall: number
  }
}

export interface TabscannerError {
  code: string
  message: string
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function processReceipt(imageUrl: string): Promise<TabscannerResult | TabscannerError> {
  if (!TABSCANNER_API_KEY || TABSCANNER_API_KEY === 'your-tabscanner-api-key') {
    return {
      code: 'NO_API_KEY',
      message: 'Tabscanner API key not configured. Add TABSCANNER_API_KEY to .env.local'
    }
  }

  try {
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return { code: 'IMAGE_FETCH_FAILED', message: `Failed to fetch image: ${imageResponse.status}` }
    }

    const imageBlob = await imageResponse.blob()
    
    const formData = new FormData()
    formData.append('file', imageBlob, 'receipt.jpg')

    const processResponse = await fetch(`${TABSCANNER_BASE_URL}/api/2/process`, {
      method: 'POST',
      headers: {
        'apikey': TABSCANNER_API_KEY
      },
      body: formData
    })

    const processData = await processResponse.json()

    if (!processResponse.ok || processData.status === 'failed') {
      if (processResponse.status === 401 || processData.code === 401) {
        return { code: 'RATE_LIMIT', message: 'Tabscanner rate limit exceeded (200/month)' }
      }
      return { 
        code: 'PROCESS_FAILED', 
        message: processData.message || `Process request failed: ${processResponse.status}` 
      }
    }

    const token = processData.token

    if (!token) {
      return { code: 'NO_TOKEN', message: 'No processing token received' }
    }

    await delay(5000)

    let attempts = 0
    const maxAttempts = 30

    while (attempts < maxAttempts) {
      const resultResponse = await fetch(`${TABSCANNER_BASE_URL}/api/result/${token}`, {
        headers: { 'apikey': TABSCANNER_API_KEY }
      })

      if (!resultResponse.ok) {
        return { code: 'RESULT_FAILED', message: `Result request failed: ${resultResponse.status}` }
      }

      const resultData = await resultResponse.json()

      if (resultData.status === 'done') {
        const result = resultData.result || {}

        const dateParts = result.date ? result.date.split(' ') : []
        const dateOnly = dateParts[0] || null
        const timeOnly = dateParts[1] || result.time || null
        
        return {
          establishment: result.establishment || null,
          date: dateOnly,
          time: timeOnly,
          total: result.total ? parseFloat(result.total) : null,
          currency: result.currency || null,
          confidence: {
            establishment: result.establishmentConfidence || 0,
            date: result.dateConfidence || 0,
            total: result.totalConfidence || 0,
            overall: ((result.establishmentConfidence || 0) + (result.dateConfidence || 0) + (result.totalConfidence || 0)) / 3
          }
        }
      }

      if (resultData.status === 'failed') {
        return { code: 'OCR_FAILED', message: 'OCR processing failed' }
      }

      await delay(1000)
      attempts++
    }

    return { code: 'TIMEOUT', message: 'OCR processing timed out' }

  } catch (error) {
    return {
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Network error occurred'
    }
  }
}

export function isTabscannerError(result: TabscannerResult | TabscannerError): result is TabscannerError {
  return 'code' in result && 'message' in result
}
