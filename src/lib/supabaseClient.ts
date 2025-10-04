// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// Ensure your environment variables are named correctly in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and/or Anon Key are missing from .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
