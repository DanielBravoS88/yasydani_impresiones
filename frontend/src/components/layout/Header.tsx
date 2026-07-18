'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useAuth } from '@/contexts/AuthContext';
import CategoryNav from './CategoryNav';

export default function Header() {
  const [search,      setSearch]      = useState('');
  const [menuOpen,    setMenuOpen]    = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { count, toggleCart } = useCartStore();
  const { user, profile, isAdmin, signOut, loading } = useAuth();

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/productos?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.push('/');
  };

  const displayName = profile?.nombre
    ? profile.nombre
    : user?.email?.split('@')[0] ?? 'Mi cuenta';

  return (
    <header className="glass sticky top-0 z-50 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      <div className="max-w-6xl mx-auto flex items-center gap-4 justify-between px-4 py-3 flex-wrap">

        {/* ---- Marca ---- */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/logo.png"
            alt="Logo Yas&Dani Impresiones"
            width={72}
            height={72}
            className="rounded-full drop-shadow-[0_7px_12px_rgba(255,82,190,0.25)] object-contain"
            priority
          />
          <div>
            <h1
              className="font-pacifico text-2xl lg:text-3xl text-brand-pink leading-tight text-shadow-brand"
            >
              Yas&amp;Dani
            </h1>
            <span className="text-xs font-black text-[#00aaa7] block">
              Personalizados con amor
            </span>
          </div>
        </Link>

        {/* ---- Buscador ---- */}
        <form
          onSubmit={handleSearch}
          className="flex gap-2 flex-1 min-w-[200px] max-w-md order-3 lg:order-2 w-full lg:w-auto"
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full border-2 border-brand-pink2 rounded-[18px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink transition-colors"
            aria-label="Buscar productos"
          />
          <button
            type="submit"
            className="bg-brand-pink hover:bg-brand-hot text-white rounded-[18px] px-4 py-2.5 font-bold transition-colors shrink-0"
            aria-label="Buscar"
          >
            🔍
          </button>
        </form>

        {/* ---- Acciones ---- */}
        <div className="flex gap-2 order-2 lg:order-3 shrink-0 items-center">
          <a
            href="https://www.instagram.com/yasydaniimpresiones"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[18px] px-3 py-2.5 font-black text-white text-sm whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#ff4fd8,#ff9bd7)' }}
          >
            📸 Instagram
          </a>

          {/* Menú usuario */}
          {!loading && (
            user ? (
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className="rounded-[18px] px-3 py-2.5 font-black text-white text-sm whitespace-nowrap transition-opacity hover:opacity-90 flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg,#d8c7ff,#ff77c8)' }}
                >
                  👤 {displayName}
                  {isAdmin && <span className="text-xs bg-white/30 px-1.5 py-0.5 rounded-full">Admin</span>}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border-2 border-brand-pink2 z-50 overflow-hidden">
                    <Link href="/mi-cuenta" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-brand-text hover:bg-brand-pink2/30 transition-colors">
                      👤 Mi cuenta
                    </Link>
                    <Link href="/mis-pedidos" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-brand-text hover:bg-brand-pink2/30 transition-colors">
                      📦 Mis pedidos
                    </Link>
                    {isAdmin && (
                      <>
                        <div className="border-t border-brand-pink2/30" />
                        <Link href="/admin" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-brand-pink hover:bg-brand-pink2/30 transition-colors">
                          ⚙️ Panel Admin
                        </Link>
                      </>
                    )}
                    <div className="border-t border-brand-pink2/30" />
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left flex items-center gap-2 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      🚪 Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-[18px] px-3 py-2.5 font-black text-white text-sm whitespace-nowrap transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#d8c7ff,#ff77c8)' }}
              >
                👤 Entrar
              </Link>
            )
          )}

          <button
            onClick={() => toggleCart(true)}
            className="rounded-[18px] px-3 py-2.5 font-black text-white text-sm whitespace-nowrap transition-opacity hover:opacity-90 flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg,#ff77c8,#58ded8)' }}
          >
            🛒 Carrito
            {count() > 0 && (
              <span className="inline-flex items-center justify-center bg-white text-brand-hot rounded-full w-5 h-5 text-xs font-black ml-1">
                {count()}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ---- Navegación de categorías ---- */}
      <Suspense fallback={<div className="h-12" />}>
        <CategoryNav />
      </Suspense>
    </header>
  );
}
