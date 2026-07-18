'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabaseBrowser } from '@/lib/supabase-browser';

const schema = z.object({
  email: z.string().email('Ingresa un email válido'),
});
type FormData = z.infer<typeof schema>;

export default function RecuperarPasswordPage() {
  const [sent,  setSent]  = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/nueva-password`,
    });
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="glass rounded-3xl p-10 text-center max-w-md shadow-brand">
          <span className="text-6xl block mb-4">📩</span>
          <h2 className="font-pacifico text-2xl text-brand-pink mb-2">Email enviado</h2>
          <p className="text-brand-text/70 font-bold mb-6 text-sm">
            Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link href="/login" className="text-brand-pink font-black hover:underline text-sm">
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md glass rounded-3xl shadow-brand p-8">
        <div className="text-center mb-6">
          <h1 className="font-pacifico text-3xl text-brand-pink mb-1">Recuperar contraseña</h1>
          <p className="text-brand-text/60 font-bold text-sm">Te enviamos un enlace a tu email</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-brand-text mb-1">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="tu@email.com"
              className="w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-pink transition-colors"
            />
            {errors.email && <p className="text-brand-hot text-xs mt-1 font-bold">{errors.email.message}</p>}
          </div>

          {error && (
            <p className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold text-center py-2 px-4 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-pink hover:bg-brand-hot text-white font-black py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar enlace 📩'}
          </button>
        </form>

        <p className="text-center mt-4 text-brand-text/60 text-sm">
          <Link href="/login" className="text-brand-pink font-black hover:underline">
            ← Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
