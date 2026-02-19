import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const tripId = formData.get('tripId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!tripId) {
      return NextResponse.json({ error: 'No tripId provided' }, { status: 400 })
    }

    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `${tripId}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipt-images')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const imageUrl = filePath

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        trip_id: tripId,
        image_url: imageUrl,
        date: null,
        time: null,
        location: null,
        cost: null,
        original_currency: null,
        ocr_confidence: null
      })
      .select()
      .single()

    if (receiptError) {
      console.error('Receipt insert error:', receiptError)
      return NextResponse.json({ error: receiptError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      receipt,
      imageUrl,
      filePath
    })

  } catch (error) {
    console.error('Upload handler error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}
