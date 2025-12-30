import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = Bun.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = Bun.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const dbClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})