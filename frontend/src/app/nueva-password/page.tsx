'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import PasswordInput from '@/components/ui/PasswordInput';

function NuevaPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Validando enlace...');

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
        setMessage('');
      } else {
        setMessage('El enlace es inválido o expiró. Solicita uno nuevo.');
      }
    });

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
        setMessage('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setMessage('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirmation) return setMessage('Las contraseñas no coinciden.');
    setLoading(true);
    const { error } = await supabaseBrowser.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage(error.message);
    setMessage('Contraseña actualizada. Ya puedes iniciar sesión.');
    await supabaseBrowser.auth.signOut();
    setTimeout(() => router.push('/login'), 1500);
  };

  return <div className="min-h-[80vh] flex items-center justify-center px-4">
    <div className="w-full max-w-md glass rounded-3xl shadow-brand p-8">
      <h1 className="font-pacifico text-3xl text-brand-pink text-center mb-2">Nueva contraseña</h1>
      <p className="text-brand-text/60 text-sm text-center mb-6">Crea una contraseña nueva para tu cuenta.</p>
      {ready && <form onSubmit={submit} className="space-y-4">
        <PasswordInput value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Nueva contraseña" autoComplete="new-password" required minLength={8}
          className="w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 outline-none focus:border-brand-pink" />
        <PasswordInput value={confirmation} onChange={e => setConfirmation(e.target.value)}
          placeholder="Repite la contraseña" autoComplete="new-password" required minLength={8}
          className="w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 outline-none focus:border-brand-pink" />
        <button disabled={loading} className="w-full bg-brand-pink text-white font-black py-3 rounded-2xl disabled:opacity-50">
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>}
      {message && <p className="mt-4 text-center text-sm font-bold text-brand-text/70">{message}</p>}
    </div>
  </div>;
}

export default function NuevaPasswordPage() {
  return <Suspense fallback={<p className="text-center py-20">Validando enlace...</p>}><NuevaPasswordForm /></Suspense>;
}
