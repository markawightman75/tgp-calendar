import { createClient } from '@supabase/supabase-js'

// Use environment variables for Supabase URL and key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file or GitHub secrets.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);