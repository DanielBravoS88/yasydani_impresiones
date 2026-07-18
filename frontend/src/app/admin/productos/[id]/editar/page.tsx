'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ProductForm, { type ProductFormData } from '@/components/admin/ProductForm';
import { adminAPI } from '@/lib/adminApi';

interface ProductImage { id: string; url: string; alt?: string; }
interface Product extends Partial<ProductFormData> {
  id: string;
  nombre: string;
  imagen_principal_url?: string;
  imagenes?: ProductImage[];
}

export default function EditarProductoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingImage, setManagingImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    const response = await adminAPI.getProduct(id);
    if (response.success) setProduct(response.data as Product);
    else setError(typeof response.error === 'string' ? response.error : 'No se pudo cargar el producto');
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const setMain = async (imageId: string) => {
    setManagingImage(imageId); setError('');
    const response = await adminAPI.setMainImage(id, imageId);
    if (!response.success) setError(typeof response.error === 'string' ? response.error : 'No se pudo cambiar la imagen');
    await load(); setManagingImage(null);
  };

  const removeImage = async (image: ProductImage) => {
    if (!confirm('¿Eliminar esta imagen del producto? Esta acción también la quitará de Storage.')) return;
    setManagingImage(image.id); setError('');
    const response = await adminAPI.deleteImage(id, image.id);
    if (!response.success) setError(typeof response.error === 'string' ? response.error : 'No se pudo eliminar la imagen');
    await load(); setManagingImage(null);
  };

  const handleSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true); setError('');
    const response = await adminAPI.updateProduct(id, data);
    if (!response.success) {
      setError(typeof response.error === 'string' ? response.error : 'Error al actualizar');
      setIsSubmitting(false); return;
    }
    setSuccess('¡Producto actualizado! ✅');
    setTimeout(() => router.push('/admin/productos'), 1200);
  };

  if (loading) return <div className="text-center py-20 text-brand-pink font-black animate-pulse">Cargando...</div>;
  if (!product) return <div className="text-center py-20"><p>Producto no encontrado</p><Link href="/admin/productos">Volver</Link></div>;

  return <div className="space-y-6">
    <div className="flex items-center gap-4"><Link href="/admin/productos" className="font-bold">← Volver</Link>
      <h1 className="font-pacifico text-3xl text-brand-pink">Editar producto</h1></div>

    {(product.imagenes?.length ?? 0) > 0 && <section className="bg-white rounded-3xl p-6 shadow-card">
      <h2 className="font-black text-brand-text">Galería del producto</h2>
      <p className="text-sm text-brand-text/60 mt-1 mb-4">Selecciona la imagen principal o elimina imágenes duplicadas.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">{product.imagenes!.map(image => {
        const isMain = product.imagen_principal_url === image.url;
        return <div key={image.id} className={`rounded-2xl border-2 p-2 ${isMain ? 'border-brand-hot' : 'border-brand-pink2'}`}>
          <div className="relative aspect-square bg-white rounded-xl overflow-hidden"><Image src={image.url} alt={image.alt ?? product.nombre} fill className="object-contain" /></div>
          {isMain && <p className="text-center text-xs font-black text-brand-hot mt-2">Principal</p>}
          <div className="grid gap-1 mt-2">
            {!isMain && <button type="button" disabled={managingImage === image.id} onClick={() => void setMain(image.id)}
              className="text-xs font-black rounded-xl py-2 bg-brand-aqua2 text-brand-text disabled:opacity-50">Usar como principal</button>}
            <button type="button" disabled={managingImage === image.id} onClick={() => void removeImage(image)}
              className="text-xs font-black rounded-xl py-2 bg-red-100 text-red-600 disabled:opacity-50">Eliminar</button>
          </div>
        </div>;
      })}</div>
    </section>}

    <ProductForm productId={id} defaultValues={product} currentImage={product.imagen_principal_url}
      onImageUploaded={load} onSubmit={handleSubmit} isSubmitting={isSubmitting} submitLabel="Guardar cambios ✅"
      error={error} success={success} />
  </div>;
}
