import Link from 'next/link';

const LINKS = [
  { href: '/productos',   label: 'Productos' },
  { href: '/categorias',  label: 'Categorías' },
  { href: '/personalizar',label: 'Personalizar' },
  { href: '/contacto',    label: 'Contacto' },
];

export default function Footer() {
  return (
    <footer
      className="mt-20 py-10 px-4 text-center text-white"
      style={{ background: 'linear-gradient(135deg, #ff77c8, #58ded8 50%, #d8c7ff)' }}
    >
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="font-pacifico text-2xl" style={{ textShadow: '2px 2px 0 rgba(0,0,0,.15)' }}>
          Yas&amp;Dani Impresiones
        </h2>
        <p className="font-bold text-sm opacity-90">
          Personalizados con amor 💖 · yasydaniimpresiones.cl
        </p>

        <nav className="flex flex-wrap justify-center gap-4 text-sm font-black">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:underline opacity-90 hover:opacity-100 transition-opacity"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex justify-center gap-4 text-2xl">
          <a
            href="https://www.instagram.com/yasydaniimpresiones"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram Yas&Dani Impresiones"
          >
            📸
          </a>
          <a
            href="https://wa.me/56983220168?text=Hola%20Yas%26Dani%20Impresiones"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp Yas&Dani Impresiones"
          >
            💬
          </a>
        </div>

        <p className="text-xs opacity-75">
          © {new Date().getFullYear()} Yas&amp;Dani Impresiones · Hecho con amor en Chile 🇨🇱
        </p>
      </div>
    </footer>
  );
}
