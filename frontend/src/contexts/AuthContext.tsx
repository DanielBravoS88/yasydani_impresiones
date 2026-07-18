'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';

export interface Profile {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  region?: string;
  role: 'cliente' | 'administrador';
  created_at: string;
  updated_at: string;
}

interface SignUpData {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
}

interface AuthContextType {
  user:           User | null;
  profile:        Profile | null;
  session:        Session | null;
  loading:        boolean;
  isAdmin:        boolean;
  signIn:         (email: string, password: string) => Promise<{ error: string | null }>;
  signUp:         (data: SignUpData) => Promise<{ error: string | null }>;
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile:  (data: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabaseBrowser
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async ({ email, password, nombre, apellido, telefono }: SignUpData) => {
    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, apellido, telefono: telefono ?? '' },
      },
    });

    if (error) return { error: error.message };

    // Si Supabase no requiere confirmación de email, actualizar perfil inmediatamente
    if (data.user) {
      await supabaseBrowser
        .from('profiles')
        .update({ apellido, telefono: telefono ?? '' })
        .eq('id', data.user.id);
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: 'No autenticado' };
    // Nunca permitir cambiar el rol desde el cliente
    const { role: _role, id: _id, ...safeData } = data as any;
    const { error } = await supabaseBrowser
      .from('profiles')
      .update(safeData)
      .eq('id', user.id);
    if (!error) await fetchProfile(user.id);
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      isAdmin: profile?.role === 'administrador',
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
