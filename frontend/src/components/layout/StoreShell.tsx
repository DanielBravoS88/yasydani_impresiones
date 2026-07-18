'use client';
import { usePathname } from 'next/navigation';
import TopBar from './TopBar';
import Header from './Header';
import Footer from './Footer';
import CartPanel from '../cart/CartPanel';

/**
 * Envuelve el contenido de la tienda con TopBar, Header, CartPanel y Footer.
 * Las rutas /admin usan su propio layout sin estos elementos.
 */
export default function StoreShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin  = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <TopBar />
      <Header />
      <main>{children}</main>

      {/* WhatsApp flotante */}
      <a
        href="https://wa.me/56983220168?text=Hola%20Yas%26Dani%20Impresiones"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="fixed right-5 bottom-5 w-16 h-16 rounded-full flex items-center justify-center text-3xl text-white z-[80]"
        style={{ background: '#25d366', boxShadow: '0 10px 25px rgba(37,211,102,.35)' }}
      >
        ☎
      </a>
      {/* Instagram flotante */}
      <a
        href="https://www.instagram.com/yasydaniimpresiones"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="fixed right-5 bottom-24 w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white z-[80]"
        style={{
          background:  'linear-gradient(135deg,#ff4fd8,#ffc8e9,#58ded8)',
          boxShadow:   '0 10px 25px rgba(255,79,216,.28)',
        }}
      >
        📸
      </a>

      <CartPanel />
      <Footer />
    </>
  );
}
