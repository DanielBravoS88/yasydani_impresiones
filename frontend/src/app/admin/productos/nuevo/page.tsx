'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm, { type ProductFormData } from '@/components/admin/ProductForm';
import { adminAPI } from '@/lib/adminApi';

export default function NuevoProductoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  const handleSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    setError('');

    const res = await adminAPI.createProduct(data);
    if (!res.success) {
      setError(typeof res.error === 'string' ? res.error : 'Error al crear el producto');
      setIsSubmitting(false);
      return;
    }

    const productId = (res.data as any)?.id;

    // Si hay imagen pendiente, subirla ahora
    const pendingImg = (window as any).__pendingProductImage as File | undefined;
    if (productId && pendingImg) {
      const imgRes = await adminAPI.uploadImage(productId, pendingImg);
      if (imgRes.success && imgRes.data?.url) {
        await adminAPI.updateProduct(productId, { imagen_principal_url: imgRes.data.url });
      }
      delete (window as any).__pendingProductImage;
    }

    setSuccess('¡Producto creado exitosamente! 🎉');
    setTimeout(() => router.push('/admin/productos'), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/productos" className="text-brand-text/50 hover:text-brand-pink font-bold text-sm">
          ← Volver
        </Link>
        <h1 className="font-pacifico text-3xl text-brand-pink">Nuevo producto</h1>
      </div>

      <ProductForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Crear producto 🎉"
        error={error}
        success={success}
      />
    </div>
  );
}
