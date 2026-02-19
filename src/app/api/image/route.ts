import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path')

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase.storage
      .from('receipt-images')
      .download(path)

    if (error || !data) {
      console.error('Image download failed:', error)
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const arrayBuffer = await data.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': data.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    console.error('Image proxy error:', err)
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 })
  }
}
