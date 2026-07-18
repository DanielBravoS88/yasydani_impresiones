import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan variables: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas.'
  );
}

/**
 * Cliente Supabase con anon key.
 * Seguro para usar en el navegador — respeta las políticas RLS.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Cliente Supabase para uso en Server Components de Next.js.
 * Devuelve una instancia nueva sin sesión persistida.
 */
export function createServerSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
