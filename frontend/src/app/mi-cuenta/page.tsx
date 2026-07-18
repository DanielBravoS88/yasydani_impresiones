'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/contexts/AuthContext';

const schema = z.object({
  nombre:   z.string().min(2, 'Mínimo 2 caracteres'),
  apellido: z.string().min(2, 'Mínimo 2 caracteres'),
  telefono: z.string().optional(),
  direccion:z.string().optional(),
  comuna:   z.string().optional(),
  ciudad:   z.string().optional(),
  region:   z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const REGIONES_CHILE = [
  'Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo',
  'Valparaíso','Metropolitana de Santiago','O\'Higgins','Maule','Ñuble',
  'Biobío','La Araucanía','Los Ríos','Los Lagos','Aysén','Magallanes',
];

export default function MiCuentaPage() {
  const { profile, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const [editing,  setEditing]  = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:   profile?.nombre   ?? '',
      apellido: profile?.apellido ?? '',
      telefono: profile?.telefono ?? '',
      direccion:profile?.direccion ?? '',
      comuna:   profile?.comuna   ?? '',
      ciudad:   profile?.ciudad   ?? '',
      region:   profile?.region   ?? '',
    },
  });

  const handleEdit = () => {
    reset({
      nombre:   profile?.nombre   ?? '',
      apellido: profile?.apellido ?? '',
      telefono: profile?.telefono ?? '',
      direccion:profile?.direccion ?? '',
      comuna:   profile?.comuna   ?? '',
      ciudad:   profile?.ciudad   ?? '',
      region:   profile?.region   ?? '',
    });
    setEditing(true);
  };

  const onSubmit = async (data: FormData) => {
    setError('');
    setSuccess('');
    const { error: err } = await updateProfile(data as Partial<Profile>);
    if (err) { setError(err); return; }
    setSuccess('¡Datos actualizados correctamente!');
    setEditing(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const inputClass = "w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-pink transition-colors disabled:bg-gray-50 disabled:text-brand-text/50";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="glass rounded-3xl shadow-brand p-8 space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-pacifico text-3xl text-brand-pink">Mi cuenta 💖</h1>
            <p className="text-brand-text/60 font-bold text-sm mt-1">{profile?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-bold text-brand-text/50 hover:text-red-500 transition-colors"
          >
            Cerrar sesión →
          </button>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/mis-pedidos" className="flex items-center gap-3 bg-brand-cream rounded-2xl p-4 hover:shadow-card transition-shadow">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-black text-brand-text text-sm">Mis pedidos</p>
              <p className="text-brand-text/50 text-xs">Ver historial</p>
            </div>
          </a>
          <div className="flex items-center gap-3 bg-brand-aqua2 rounded-2xl p-4">
            <span className="text-2xl">💖</span>
            <div>
              <p className="font-black text-brand-text text-sm">
                {profile?.role === 'administrador' ? 'Administrador' : 'Cliente'}
              </p>
              <p className="text-brand-text/50 text-xs">Tu rol</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-black text-brand-text">Datos personales</h2>
            {!editing && (
              <button type="button" onClick={handleEdit}
                className="text-brand-pink font-bold text-sm hover:underline">
                Editar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Nombre</label>
              <input {...register('nombre')} disabled={!editing} className={inputClass} />
              {errors.nombre && <p className="text-brand-hot text-xs mt-1">{errors.nombre.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Apellido</label>
              <input {...register('apellido')} disabled={!editing} className={inputClass} />
              {errors.apellido && <p className="text-brand-hot text-xs mt-1">{errors.apellido.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-text mb-1">Teléfono</label>
            <input {...register('telefono')} disabled={!editing} placeholder="+56 9 XXXX XXXX" className={inputClass} />
          </div>

          <h3 className="font-black text-brand-text pt-2">Dirección de despacho</h3>

          <div>
            <label className="block text-xs font-bold text-brand-text mb-1">Calle y número</label>
            <input {...register('direccion')} disabled={!editing} placeholder="Av. Ejemplo 123" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Ciudad</label>
              <input {...register('ciudad')} disabled={!editing} placeholder="Santiago" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Comuna</label>
              <input {...register('comuna')} disabled={!editing} placeholder="Las Condes" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-brand-text mb-1">Región</label>
            <select {...register('region')} disabled={!editing}
              className={inputClass + ' cursor-pointer'}>
              <option value="">Selecciona tu región</option>
              {REGIONES_CHILE.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {success && (
            <p className="bg-green-50 border border-green-200 text-green-700 text-sm font-bold text-center py-2 px-4 rounded-xl">
              {success}
            </p>
          )}
          {error && (
            <p className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold text-center py-2 px-4 rounded-xl">
              {error}
            </p>
          )}

          {editing && (
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting}
                className="flex-1 bg-brand-pink hover:bg-brand-hot text-white font-black py-3 rounded-2xl transition-colors disabled:opacity-50">
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="px-6 py-3 rounded-2xl font-bold text-brand-text/60 hover:bg-brand-pink2 transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
