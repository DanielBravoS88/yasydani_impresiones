'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import PasswordInput from '@/components/ui/PasswordInput';

const passwordRules = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
  .regex(/[a-z]/, 'Debe tener al menos una minúscula')
  .regex(/[0-9]/, 'Debe tener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe tener al menos un carácter especial (!@#$%...)');

const schema = z.object({
  nombre:   z.string().min(2, 'Ingresa tu nombre (mín. 2 caracteres)'),
  apellido: z.string().min(2, 'Ingresa tu apellido (mín. 2 caracteres)'),
  email:    z.string().email('Ingresa un email válido'),
  telefono: z.string().optional(),
  password: passwordRules,
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Las contraseñas no coinciden',
  path:    ['confirm'],
});
type FormData = z.infer<typeof schema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-brand-text mb-1">{label}</label>
      {children}
      {error && <p className="text-brand-hot text-xs mt-1 font-bold">{error}</p>}
    </div>
  );
}

export default function RegistroPage() {
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState('');
  const [success,     setSuccess]     = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError('');
    const { error } = await signUp({
      email:    data.email,
      password: data.password,
      nombre:   data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
    });
    if (error) { setServerError(error); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="glass rounded-3xl p-10 text-center max-w-md shadow-brand">
          <span className="text-6xl block mb-4">✅</span>
          <h2 className="font-pacifico text-2xl text-brand-pink mb-2">¡Cuenta creada!</h2>
          <p className="text-brand-text/70 font-bold mb-6 text-sm">
            Revisa tu email para confirmar tu cuenta antes de iniciar sesión.
          </p>
          <Link
            href="/login"
            className="bg-brand-pink text-white font-black px-8 py-3 rounded-2xl inline-block hover:bg-brand-hot transition-colors"
          >
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  const inputClass = "w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-pink transition-colors";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg glass rounded-3xl shadow-brand p-8">
        <div className="text-center mb-6">
          <h1 className="font-pacifico text-3xl text-brand-pink mb-1">Crear cuenta 💫</h1>
          <p className="text-brand-text/60 font-bold text-sm">¡Únete a nuestra comunidad!</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" error={errors.nombre?.message}>
              <input {...register('nombre')} placeholder="María" className={inputClass} />
            </Field>
            <Field label="Apellido" error={errors.apellido?.message}>
              <input {...register('apellido')} placeholder="González" className={inputClass} />
            </Field>
          </div>

          <Field label="Email" error={errors.email?.message}>
            <input {...register('email')} type="email" placeholder="tu@email.com" autoComplete="email" className={inputClass} />
          </Field>

          <Field label="Teléfono (opcional)">
            <input {...register('telefono')} placeholder="+56 9 XXXX XXXX" className={inputClass} />
          </Field>

          <Field label="Contraseña" error={errors.password?.message}>
            <PasswordInput {...register('password')} placeholder="••••••••" autoComplete="new-password" className={inputClass} />
            <p className="text-brand-text/40 text-xs mt-1">Mín. 8 caracteres, mayúscula, número y símbolo</p>
          </Field>

          <Field label="Confirmar contraseña" error={errors.confirm?.message}>
            <PasswordInput {...register('confirm')} placeholder="••••••••" autoComplete="new-password" className={inputClass} />
          </Field>

          {serverError && (
            <p className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold text-center py-2 px-4 rounded-xl">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-pink hover:bg-brand-hot text-white font-black py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta 🎉'}
          </button>
        </form>

        <p className="text-center mt-4 text-brand-text/60 text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-brand-pink font-black hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
