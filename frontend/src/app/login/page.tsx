'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import PasswordInput from '@/components/ui/PasswordInput';

const schema = z.object({
  email:    z.string().email('Ingresa un email válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { signIn } = useAuth();
  const router     = useRouter();
  const params     = useSearchParams();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    const { error: signInError } = await signIn(data.email, data.password);
    if (signInError) { setError('Email o contraseña incorrectos'); return; }
    router.push(params.get('redirect') ?? '/mi-cuenta');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-brand-text mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          placeholder="tu@email.com"
          autoComplete="email"
          className="w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-pink transition-colors"
        />
        {errors.email && <p className="text-brand-hot text-xs mt-1 font-bold">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-brand-text mb-1">Contraseña</label>
        <PasswordInput
          {...register('password')}
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-pink transition-colors"
        />
        {errors.password && <p className="text-brand-hot text-xs mt-1 font-bold">{errors.password.message}</p>}
      </div>

      {error && (
        <p className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold text-center py-2 px-4 rounded-xl">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-pink hover:bg-brand-hot text-white font-black py-3 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Ingresando...' : 'Ingresar 💖'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass rounded-3xl shadow-brand p-8">
        <div className="text-center mb-6">
          <h1 className="font-pacifico text-3xl text-brand-pink mb-1">Bienvenida 💖</h1>
          <p className="text-brand-text/60 font-bold text-sm">Inicia sesión en tu cuenta</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <div className="text-center mt-6 space-y-3">
          <Link href="/recuperar-password" className="text-brand-pink text-sm font-bold hover:underline block">
            ¿Olvidaste tu contraseña?
          </Link>
          <p className="text-brand-text/60 text-sm">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-brand-pink font-black hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
