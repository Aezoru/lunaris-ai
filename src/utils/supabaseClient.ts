import { createClient } from '@supabase/supabase-js';

// Configuration for Supabase Project: pesflyjwtcewilkxsfna
const SUPABASE_URL = 'https://pesflyjwtcewilkxsfna.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlc2ZseWp3dGNld2lsa3hzZm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMwOTcsImV4cCI6MjA3OTg1OTA5N30.PaNUlAwm1IsP44wS3MzaBsT6ttB5EmesT8c4UQHkdMk';

const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase URL or Key is missing. Cloud features will not work.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});
