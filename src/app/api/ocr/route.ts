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

    // Look up trip to get base currency and exchange rates
    const { data: receipt } = await supabase
      .from('receipts')
      .select('trip_id')
      .eq('id', receiptId)
      .single()

    let convertedCost = null
    let exchangeRate = null

    if (receipt && result.total && result.currency) {
      const { data: tripData } = await supabase
        .from('trips')
        .select('currency')
        .eq('id', receipt.trip_id)
        .single()

      const baseCurrency = tripData?.currency || 'KRW'

      if (result.currency !== baseCurrency) {
        const { data: rateData } = await supabase
          .from('exchange_rates')
          .select('rate')
          .eq('trip_id', receipt.trip_id)
          .eq('from_currency', result.currency)
          .single()

        if (rateData) {
          exchangeRate = rateData.rate
          convertedCost = result.total * rateData.rate
        }
      } else {
        convertedCost = result.total
      }
    }

    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        location: result.establishment,
        date: result.date,
        time: result.time,
        cost: result.total,
        original_currency: result.currency,
        converted_cost: convertedCost,
        exchange_rate: exchangeRate,
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
