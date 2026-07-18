import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase';
import { formatPrice, buildWhatsAppUrl } from '@/lib/utils';
import type { Producto } from '@yasydani/shared';
import ProductDetailClient from './ProductDetailClient';
import ProductGallery from '@/components/ui/ProductGallery';

interface Props {
  params: Promise<{ id: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getProduct(identifier: string): Promise<Producto | null> {
  try {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('productos')
      .select(`*, categoria:categorias(id,nombre,slug), imagenes:imagenes_productos(id,url,alt,orden)`)
      .eq('activo', true);
    query = UUID_PATTERN.test(identifier) ? query.eq('id', identifier) : query.eq('slug', identifier);
    const { data, error } = await query.single();
    if (error) return null;
    return data as Producto;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Producto no encontrado' };
  return {
    title: product.nombre,
    description: product.descripcion ?? `${product.nombre} — Yas&Dani Impresiones`,
  };
}

export default async function ProductoDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const galleryImages = product.imagenes?.slice().sort((a, b) => a.orden - b.orden).map(image => image.url) ?? [];
  const images = Array.from(new Set([
    ...(product.imagen_principal_url ? [product.imagen_principal_url] : []),
    ...galleryImages,
  ]));
  if (images.length === 0) images.push('/placeholder-product.svg');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-10 bg-white rounded-[32px] shadow-brand p-8">

        {/* Galería de imágenes */}
        <ProductGallery images={images} productName={product.nombre} />

        {/* Detalle */}
        <div className="space-y-5">
          <div>
            <span className="inline-block bg-brand-aqua2 rounded-full px-3 py-1 text-xs font-black text-[#008e8b] mb-2">
              {product.categoria?.nombre ?? 'Producto'}
            </span>
            <h1 className="font-pacifico text-3xl text-brand-pink leading-tight">{product.nombre}</h1>
          </div>

          {product.descripcion && (
            <p className="text-brand-text/80 leading-relaxed">{product.descripcion}</p>
          )}

          <p className="text-3xl font-black text-brand-hot">
            {formatPrice(product.precio, product.precio_desde)}
          </p>

          {/* Botones — lógica del cliente */}
          <ProductDetailClient product={product} />

          <a
            href={buildWhatsAppUrl(product.nombre)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center border-2 border-[#25d366] text-[#128c7e] rounded-full py-3 px-6 font-black hover:bg-[#d9fde3] transition-colors"
          >
            💬 Consultar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
