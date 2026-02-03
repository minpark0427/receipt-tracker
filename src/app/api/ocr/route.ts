import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { processReceipt, isTabscannerError } from '@/lib/tabscanner'

export async function POST(request: NextRequest) {
  try {
    const { receiptId, imageUrl } = await request.json()

    if (!receiptId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing receiptId or imageUrl' },
        { status: 400 }
      )
    }

    const result = await processReceipt(imageUrl)

    if (isTabscannerError(result)) {
      return NextResponse.json({
        success: false,
        error: result.message,
        code: result.code
      }, { status: result.code === 'NO_API_KEY' ? 503 : 400 })
    }

    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        location: result.establishment,
        date: result.date,
        cost: result.total,
        original_currency: result.currency,
        ocr_confidence: result.confidence.overall
      })
      .eq('id', receiptId)

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message
      }, { status: 500 })
    }

    const { data: updatedReceipt } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single()

    return NextResponse.json({
      success: true,
      receipt: updatedReceipt,
      ocrResult: result
    })

  } catch (error) {
    console.error('OCR handler error:', error)
    return NextResponse.json(
      { error: 'Failed to process OCR' },
      { status: 500 }
    )
  }
}
