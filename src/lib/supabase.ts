import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Trip {
  id: string
  name: string
  created_at: string
  budget: number
  currency: string
}

export interface Receipt {
  id: string
  trip_id: string
  image_url: string
  date: string | null
  time: string | null
  location: string | null
  cost: number | null
  original_currency: string | null
  ocr_confidence: number | null
  created_at: string
}
