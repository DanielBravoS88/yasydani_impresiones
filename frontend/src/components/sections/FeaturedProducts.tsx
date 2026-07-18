'use client';
import { useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import ProductModal from '@/components/modals/ProductModal';
import type { Producto } from '@yasydani/shared';

interface FeaturedProductsProps {
  products: Producto[];
}

export default function FeaturedProducts({ products }: FeaturedProductsProps) {
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);

  if (!products.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 my-12">
      <h2
        className="font-pacifico text-4xl text-center text-brand-pink mb-2"
        style={{ textShadow: '2px 2px 0 rgba(255,119,200,.2)' }}
      >
        Nuestros productos
      </h2>
      <p className="text-center text-brand-text/70 font-bold mb-8">
        Diseños únicos hechos con amor 💖
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onCustomize={setSelectedProduct}
          />
        ))}
      </div>

      <div className="text-center mt-10">
        <Link
          href="/productos"
          className="inline-block font-black text-brand-hot border-2 border-brand-pink rounded-full px-8 py-3 hover:bg-brand-pink2 transition-colors"
        >
          Ver todos los productos →
        </Link>
      </div>

      {/* Modal de personalización */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}
