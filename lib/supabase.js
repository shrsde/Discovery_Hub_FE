import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uggwmfzydqvnnenlyjdz.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnZ3dtZnp5ZHF2bm5lbmx5amR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NTcwMjMsImV4cCI6MjA4OTAzMzAyM30.TOBnBRizUvGYR7cYozX76Ctt0FA1iJEJVYb5czu5F4I'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
