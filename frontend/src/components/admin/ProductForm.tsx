'use client';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { adminAPI } from '@/lib/adminApi';

const schema = z.object({
  nombre:                   z.string().min(1, 'El nombre es requerido'),
  slug:                     z.string().min(1, 'El slug es requerido').regex(/^[a-z0-9-]+$/, 'Solo letras, números y guiones'),
  descripcion:              z.string().optional(),
  precio:                   z.number().int('El precio debe expresarse en pesos enteros').min(1, 'El precio debe ser mayor a $0').optional().or(z.nan().transform(() => undefined)),
  precio_oferta:            z.number().int('El precio debe expresarse en pesos enteros').min(1, 'El precio debe ser mayor a $0').optional().or(z.nan().transform(() => undefined)),
  precio_desde:             z.boolean(),
  categoria_id:             z.string().uuid().optional().or(z.literal('')),
  stock:                    z.number().int().min(0),
  stock_minimo:             z.number().int().min(0),
  stock_ilimitado:          z.boolean(),
  sku:                      z.string().optional(),
  activo:                   z.boolean(),
  destaca:                  z.boolean(),
  requiere_personalizacion: z.boolean(),
  tiempo_preparacion:       z.string().optional(),
  opciones_personalizacion: z.string().optional(),
});

export type ProductFormData = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<ProductFormData>;
  productId?:     string;
  currentImage?:  string;
  onSubmit:       (data: ProductFormData, imageUrl?: string) => Promise<void>;
  isSubmitting:   boolean;
  submitLabel:    string;
  error?:         string;
  success?:       string;
  onImageUploaded?: () => void | Promise<void>;
}

interface Categoria { id: string; nombre: string; }

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

export default function ProductForm({
  defaultValues, productId, currentImage, onSubmit,
  isSubmitting, submitLabel, error, success, onImageUploaded,
}: Props) {
  const [cats,      setCats]      = useState<Categoria[]>([]);
  const [imgPreview,setImgPreview]= useState(currentImage ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: { stock: 0, stock_minimo: 5, activo: true, precio_desde: false,
      stock_ilimitado: false, destaca: false, requiere_personalizacion: false, ...defaultValues },
  });

  const nombre = watch('nombre');

  useEffect(() => {
    supabaseBrowser.from('categorias').select('id,nombre').eq('activo', true).then(({ data }) => {
      setCats(data ?? []);
    });
  }, []);

  useEffect(() => {
    setImgPreview(currentImage ?? '');
  }, [currentImage]);

  // Auto-slug si es nuevo producto
  useEffect(() => {
    if (!productId && nombre) {
      setValue('slug', slugify(nombre));
    }
  }, [nombre, productId, setValue]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (!allowed.includes(file.type)) { setUploadErr('Formato no válido. Usa JPG, PNG o WEBP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadErr('El archivo es muy grande. Máx 5MB.'); return; }

    setUploadErr('');
    setImgPreview(URL.createObjectURL(file));

    if (productId) {
      setUploading(true);
      const res = await adminAPI.uploadImage(productId, file);
      setUploading(false);
      if (res.success && res.data?.url) {
        setValue('imagen_principal_url' as any, res.data.url);
        setImgPreview(res.data.url);
        await onImageUploaded?.();
      } else {
        setUploadErr(res.error ?? 'Error al subir imagen');
      }
    } else {
      // Guardar el file para subirlo después de crear el producto
      (window as any).__pendingProductImage = file;
    }
  };

  const inputClass = "w-full border-2 border-brand-pink2 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-pink transition-colors";

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ─── Columna principal ─── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Información básica */}
          <div className="bg-white rounded-3xl p-6 shadow-card space-y-4">
            <h2 className="font-black text-brand-text">Información básica</h2>

            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Nombre *</label>
              <input {...register('nombre')} placeholder="Ej: Cuadro personalizado" className={inputClass} />
              {errors.nombre && <p className="text-brand-hot text-xs mt-1">{errors.nombre.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Slug (URL) *</label>
              <input {...register('slug')} placeholder="cuadro-personalizado" className={inputClass} />
              {errors.slug && <p className="text-brand-hot text-xs mt-1">{errors.slug.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Descripción</label>
              <textarea {...register('descripcion')} rows={4} placeholder="Describe el producto..."
                className={inputClass + ' resize-none'} />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Categoría</label>
              <select {...register('categoria_id')} className={inputClass}>
                <option value="">Sin categoría</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">SKU / Código interno</label>
              <input {...register('sku')} placeholder="Ej: AG-001" className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Tiempo de preparación</label>
              <input {...register('tiempo_preparacion')} placeholder="Ej: 3-5 días hábiles" className={inputClass} />
            </div>
          </div>

          {/* Personalización */}
          <div className="bg-white rounded-3xl p-6 shadow-card space-y-4">
            <h2 className="font-black text-brand-text">Personalización</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register('requiere_personalizacion')}
                className="accent-brand-pink w-5 h-5" />
              <span className="font-bold text-sm text-brand-text">Este producto requiere personalización</span>
            </label>
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Opciones de personalización</label>
              <textarea {...register('opciones_personalizacion')} rows={3}
                placeholder="Ej: Nombre del destinatario, fecha, foto..."
                className={inputClass + ' resize-none'} />
            </div>
          </div>
        </div>

        {/* ─── Columna derecha ─── */}
        <div className="space-y-4">

          {/* Imagen principal */}
          <div className="bg-white rounded-3xl p-6 shadow-card space-y-3">
            <h2 className="font-black text-brand-text">Imagen principal</h2>
            <div
              className="border-2 border-dashed border-brand-pink2 rounded-2xl p-4 text-center cursor-pointer hover:border-brand-pink transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {imgPreview ? (
                <Image src={imgPreview} alt="Preview" width={200} height={200}
                  className="mx-auto rounded-xl object-contain w-full max-h-48" unoptimized />
              ) : (
                <div className="py-8">
                  <p className="text-4xl mb-2">🖼️</p>
                  <p className="text-brand-text/50 font-bold text-sm">Click para subir imagen</p>
                  <p className="text-brand-text/30 text-xs">JPG, PNG, WEBP — máx 5MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              aria-label="Subir imagen del producto"
              className="hidden" onChange={handleImageChange} />
            {uploading && <p className="text-brand-pink text-xs font-bold animate-pulse text-center">Subiendo imagen...</p>}
            {uploadErr && <p className="text-brand-hot text-xs font-bold text-center">{uploadErr}</p>}
          </div>

          {/* Precio */}
          <div className="bg-white rounded-3xl p-6 shadow-card space-y-3">
            <h2 className="font-black text-brand-text">Precio</h2>
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Precio (CLP)</label>
              <input {...register('precio', { valueAsNumber: true })} type="number" min={1} step={1} inputMode="numeric"
                placeholder="18990" className={inputClass} />
              {errors.precio && <p className="text-brand-hot text-xs mt-1">{errors.precio.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-text mb-1">Precio oferta (CLP)</label>
              <input {...register('precio_oferta', { valueAsNumber: true })} type="number" min={1} step={1} inputMode="numeric"
                placeholder="15990" className={inputClass} />
              {errors.precio_oferta && <p className="text-brand-hot text-xs mt-1">{errors.precio_oferta.message}</p>}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('precio_desde')} className="accent-brand-pink w-4 h-4" />
              <span className="text-xs font-bold text-brand-text">Mostrar &quot;Desde $...&quot;</span>
            </label>
          </div>

          {/* Stock */}
          <div className="bg-white rounded-3xl p-6 shadow-card space-y-3">
            <h2 className="font-black text-brand-text">Stock</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('stock_ilimitado')} className="accent-brand-pink w-4 h-4" />
              <span className="text-xs font-bold text-brand-text">Stock ilimitado</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Stock actual</label>
                <input {...register('stock', { valueAsNumber: true })} type="number" min={0} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Stock mínimo</label>
                <input {...register('stock_minimo', { valueAsNumber: true })} type="number" min={0} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Opciones */}
          <div className="bg-white rounded-3xl p-6 shadow-card space-y-3">
            <h2 className="font-black text-brand-text">Opciones</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('activo')} className="accent-brand-pink w-4 h-4" />
              <span className="text-xs font-bold text-brand-text">Producto activo (visible en tienda)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('destaca')} className="accent-brand-pink w-4 h-4" />
              <span className="text-xs font-bold text-brand-text">⭐ Destacar en inicio</span>
            </label>
          </div>
        </div>
      </div>

      {error   && <p className="bg-red-50 border border-red-200 text-red-600 text-sm font-bold text-center py-3 rounded-2xl">{error}</p>}
      {success && <p className="bg-green-50 border border-green-200 text-green-700 text-sm font-bold text-center py-3 rounded-2xl">{success}</p>}

      <button
        type="submit"
        disabled={isSubmitting || uploading}
        className="w-full bg-brand-pink hover:bg-brand-hot text-white font-black py-4 rounded-2xl text-lg transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Guardando...' : submitLabel}
      </button>
    </form>
  );
}
