'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { label: 'Dashboard',       href: '/admin',                  icon: '📊' },
  { label: 'Productos',       href: '/admin/productos',         icon: '🛍️' },
  { label: 'Nuevo producto',  href: '/admin/productos/nuevo',   icon: '➕' },
  { label: 'Pedidos',         href: '/admin/pedidos',           icon: '📦' },
  { label: 'Clientes',        href: '/admin/clientes',          icon: '👥' },
  { label: 'Stock',           href: '/admin/stock',             icon: '📉' },
  { label: 'Reportes',        href: '/admin/reportes',          icon: '📈' },
];

interface Props {
  adminName?: string;
}

export default function AdminSidebar({ adminName }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const { signOut } = useAuth();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-brand-pink2 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-brand-pink2">
        <Link href="/" className="font-pacifico text-xl text-brand-pink block">
          Yas&amp;Dani
        </Link>
        <p className="text-xs text-brand-text/40 font-bold mt-0.5">Panel administrador</p>
        {adminName && (
          <p className="text-xs text-brand-text/70 font-black mt-2 truncate">👤 {adminName}</p>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all
              ${isActive(item.href)
                ? 'bg-brand-pink text-white shadow-float'
                : 'text-brand-text hover:bg-brand-pink2/60'
              }
            `}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer: ir a tienda + cerrar sesión */}
      <div className="p-3 border-t border-brand-pink2 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl font-bold text-sm text-brand-text hover:bg-brand-aqua2 transition-colors"
        >
          🏪 Ver tienda
        </Link>
        <button
          onClick={async () => { await signOut(); router.push('/'); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl font-bold text-sm text-brand-text hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
