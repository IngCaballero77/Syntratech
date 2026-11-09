import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const IS_CONNECTED =
  !!supabaseUrl &&
  !!supabaseKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseKey.includes('placeholder');

export const supabase = IS_CONNECTED
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://mock-supabase.syntratech.local', 'mock-public-key', {
      auth: { persistSession: false },
    });

