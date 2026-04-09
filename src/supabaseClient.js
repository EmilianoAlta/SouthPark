// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

//Definicion de las llaves e info
const supabaseURL = import.meta.env.VITE_SUPABASE_URL || 'https://aybhurdvejocwfoyjkjm.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5Ymh1cmR2ZWpvY3dmb3lqa2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzA5NDAsImV4cCI6MjA5MTM0Njk0MH0.aFBGWx-Co1A_Q2vKssRWVrEuvFm79ldoEvoUzgYNeyU'

export const supabase = createClient(supabaseURL,supabaseKey)