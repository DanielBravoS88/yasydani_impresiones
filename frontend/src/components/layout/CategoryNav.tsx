'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const CATEGORIES = [
  { label: 'Todos',                 slug: '' },
  { label: 'Agendas',               slug: 'agendas',   bg: '#ffc8e9' },
  { label: 'Cuadros',               slug: 'cuadros',   bg: '#aef2eb' },
  { label: 'Regalos personalizados',slug: 'regalos',   bg: '#fff69e' },
  { label: 'Álbumes',               slug: 'albumes',   bg: '#ff75e6' },
  { label: 'Tazones',               slug: 'tazones',   bg: '#efb4d2' },
  { label: 'Fotos instantáneas',    slug: 'fotos',     bg: '#aeeeff' },
  { label: 'Copas',                 slug: 'copas',     bg: '#dac8ff' },
];

export default function CategoryNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get('categoria') ?? '';

  const handleClick = (slug: string) => {
    const qs = slug ? `?categoria=${slug}` : '';
    router.push(`/productos${qs}`);
  };

  return (
    <nav
      className="flex gap-3 overflow-x-auto pb-3 pt-1 px-4 max-w-6xl mx-auto scrollbar-hide"
      aria-label="Categorías de productos"
    >
      {CATEGORIES.map(({ label, slug, bg }) => (
        <button
          key={slug}
          onClick={() => handleClick(slug)}
          className={`
            chip-shape whitespace-nowrap border-0 px-5 py-2.5 font-bold text-sm
            cursor-pointer text-brand-text transition-all hover:-translate-y-0.5
            shadow-[0_6px_0_rgba(0,0,0,0.05)]
            ${activeSlug === slug ? 'ring-2 ring-brand-hot ring-offset-1' : ''}
          `}
          style={{ background: bg ?? '#ffe4f2' }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
