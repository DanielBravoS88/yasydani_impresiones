import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para el navegador (componentes 'use client').
 * Maneja la sesión del usuario y respeta las políticas RLS.
 */
export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
