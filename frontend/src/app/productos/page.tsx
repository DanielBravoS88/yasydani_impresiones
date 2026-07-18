'use client';
import { useState, Suspense, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ui/ProductCard';
import ProductModal from '@/components/modals/ProductModal';
import { getProducts } from '@/lib/api';
import type { Producto } from '@yasydani/shared';

const CATEGORY_CHIPS = [
  { label: 'Todos',                 slug: '',         bg: '#ffe4f2' },
  { label: 'Agendas',               slug: 'agendas',  bg: '#ffc8e9' },
  { label: 'Cuadros',               slug: 'cuadros',  bg: '#aef2eb' },
  { label: 'Regalos',               slug: 'regalos',  bg: '#fff69e' },
  { label: 'Álbumes',               slug: 'albumes',  bg: '#ff75e6' },
  { label: 'Tazones',               slug: 'tazones',  bg: '#efb4d2' },
  { label: 'Fotos instantáneas',    slug: 'fotos',    bg: '#aeeeff' },
  { label: 'Copas',                 slug: 'copas',    bg: '#dac8ff' },
];

function ProductosContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Fuente de verdad = URL (permite back/forward del navegador)
  const activeSlug = searchParams.get('categoria') ?? '';
  const urlQ       = searchParams.get('q') ?? '';

  const [search,      setSearch]      = useState(urlQ);
  const [apiProducts, setApiProducts] = useState<Producto[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [selectedProd, setSelectedProd] = useState<Producto | null>(null);

  // Sincronizar el buscador con la URL
  useEffect(() => { setSearch(urlQ); }, [urlQ]);

  // Llamar a la API cada vez que cambien los filtros de la URL
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProducts({ categoria: activeSlug || undefined, q: urlQ || undefined })
      .then((data) => { if (!cancelled) setApiProducts(data); })
      .catch(() => { if (!cancelled) setApiProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeSlug, urlQ]);

  // Si la API no tiene datos, mostrar estáticos filtrados en el cliente
  const products = useMemo(() => {
    return apiProducts.filter((p) => {
      const matchCat = !activeSlug || p.categoria?.slug === activeSlug;
      const matchQ   = !urlQ || `${p.nombre} ${p.descripcion} ${p.categoria?.nombre}`
        .toLowerCase().includes(urlQ.toLowerCase());
      return matchCat && matchQ;
    });
  }, [apiProducts, activeSlug, urlQ]);

  // Cambiar categoría → push a la URL (crea entrada en el historial para poder volver)
  const handleCategory = (slug: string) => {
    const params = new URLSearchParams();
    if (slug)   params.set('categoria', slug);
    if (urlQ)   params.set('q', urlQ);
    const qs = params.toString();
    router.push(qs ? `/productos?${qs}` : '/productos');
  };

  // Búsqueda → push a la URL
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeSlug)     params.set('categoria', activeSlug);
    if (search.trim())  params.set('q', search.trim());
    const qs = params.toString();
    router.push(qs ? `/productos?${qs}` : '/productos');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="font-pacifico text-4xl text-brand-pink mb-2">Nuestros productos</h1>
        <p className="text-brand-text/70 font-bold">Diseños únicos, hechos con amor para ti 💖</p>
      </div>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-3 max-w-lg mx-auto">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 border-2 border-brand-pink2 rounded-full px-5 py-3 text-sm outline-none focus:border-brand-pink"
        />
        <button
          type="submit"
          className="bg-brand-pink text-white rounded-full px-5 py-3 font-bold hover:bg-brand-hot transition-colors"
        >
          🔍
        </button>
      </form>

      {/* Chips de categoría */}
      <div className="flex flex-wrap gap-3 justify-center">
        {CATEGORY_CHIPS.map(({ label, slug, bg }) => (
          <button
            key={slug}
            onClick={() => handleCategory(slug)}
            className={`
              chip-shape px-5 py-2 font-bold text-sm border-0 cursor-pointer
              transition-all hover:-translate-y-0.5 shadow-[0_4px_0_rgba(0,0,0,.05)]
              text-brand-text
              ${activeSlug === slug ? 'ring-2 ring-brand-hot ring-offset-1 scale-105' : ''}
            `}
            style={{ background: bg }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-brand-pink font-black text-lg animate-pulse">
          Cargando productos...
        </div>
      )}

      {!loading && (
        <>
          {products.length === 0 ? (
            <div className="text-center py-12 text-brand-text/60 font-bold">
              No se encontraron productos con esos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} onCustomize={setSelectedProd} />
              ))}
            </div>
          )}
          <p className="text-center text-xs text-brand-text/40 font-bold mt-4">
            {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {selectedProd && (
        <ProductModal product={selectedProd} onClose={() => setSelectedProd(null)} />
      )}
    </div>
  );
}

export default function ProductosPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20 text-brand-pink font-black text-xl animate-pulse">
        Cargando...
      </div>
    }>
      <ProductosContent />
    </Suspense>
  );
}
