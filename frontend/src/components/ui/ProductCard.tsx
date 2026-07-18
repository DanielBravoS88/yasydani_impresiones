'use client';
import Image from 'next/image';
import Link from 'next/link';
import Button from './Button';
import { formatPrice, buildWhatsAppUrl, truncate } from '@/lib/utils';
import type { Producto } from '@yasydani/shared';

interface ProductCardProps {
  product: Producto;
  onCustomize?: (product: Producto) => void;
}

export default function ProductCard({ product, onCustomize }: ProductCardProps) {
  const imgSrc =
    product.imagen_principal_url ??
    product.imagenes?.[0]?.url ??
    '/placeholder-product.svg';

  return (
    <article className="bg-white rounded-[28px] overflow-hidden shadow-brand border-4 border-white/70 transition-all duration-200 hover:-translate-y-2 hover:rotate-[-0.4deg] hover:shadow-[0_24px_48px_rgba(255,79,170,.22)] group">

      {/* Imagen */}
      <Link href={`/productos/${product.slug}`} className="block overflow-hidden">
        <div className="relative w-full h-64 bg-white">
          <Image
            src={imgSrc}
            alt={product.nombre}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain p-2 group-hover:scale-[1.02] transition-transform duration-300"
          />
          {product.destaca && (
            <span className="absolute top-3 left-3 bg-brand-hot text-white text-xs font-black px-2 py-1 rounded-full">
              ⭐ Destacado
            </span>
          )}
        </div>
      </Link>

      {/* Contenido */}
      <div className="p-5">
        <span className="inline-block bg-brand-aqua2 rounded-full px-3 py-1 text-xs font-black text-[#008e8b] mb-2">
          {product.categoria?.nombre ?? 'Producto'}
        </span>

        <Link href={`/productos/${product.slug}`}>
          <h3 className="font-black text-brand-text text-base leading-tight hover:text-brand-hot transition-colors mb-1">
            {product.nombre}
          </h3>
        </Link>

        {product.descripcion && (
          <p className="text-sm text-brand-text/70 mb-3 leading-snug">
            {truncate(product.descripcion, 80)}
          </p>
        )}

        <p className="text-xl font-black text-brand-hot mb-4">
          {formatPrice(product.precio, product.precio_desde)}
        </p>

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onClick={() => onCustomize?.(product)}
          >
            ✨ Personalizar
          </Button>
          <a
            href={buildWhatsAppUrl(product.nombre)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center border-2 border-brand-aqua text-[#008e8b] rounded-full py-2 px-4 text-sm font-black hover:bg-brand-aqua2 transition-colors"
          >
            💬 Cotizar por WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
