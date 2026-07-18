'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/adminApi';

interface DashboardData {
  total_orders:     number;
  pending_orders:   number;
  paid_orders:      number;
  delivered_orders: number;
  cancelled_orders: number;
  total_clients:    number;
  month_revenue:    number;
  low_stock_count:  number;
  low_stock_items:  { id: string; nombre: string; stock: number; stock_minimo: number }[];
}

function StatCard({ label, value, icon, color, href }: {
  label: string; value: string | number; icon: string; color: string; href?: string;
}) {
  const inner = (
    <div className={`rounded-2xl p-5 text-white ${color} hover:opacity-90 transition-opacity`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-sm font-bold opacity-80 mt-1">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

export default function AdminDashboard() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminAPI.getDashboard()
      .then(response => {
        if (response.success && response.data) {
          setData(response.data as DashboardData);
        } else {
          setError(typeof response.error === 'string' ? response.error : 'No se pudo cargar el dashboard');
        }
      })
      .catch(() => setError('No se pudo conectar con el backend'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-brand-pink font-black animate-pulse text-lg">Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-3xl p-6">
        <h1 className="font-black text-lg">No se pudo cargar el panel</h1>
        <p className="mt-2 text-sm font-bold">{error}</p>
        <p className="mt-2 text-sm">Comprueba que el backend esté ejecutándose en el puerto 3001 y vuelve a cargar la página.</p>
      </div>
    );
  }

  const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-pacifico text-3xl text-brand-pink">Dashboard</h1>
        <p className="text-brand-text/60 font-bold text-sm mt-1">Resumen general de tu tienda</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ventas del mes"  value={fmt(data?.month_revenue ?? 0)} icon="💰" color="bg-gradient-to-br from-brand-pink to-brand-hot" />
        <StatCard label="Total pedidos"   value={data?.total_orders ?? 0}       icon="📦" color="bg-gradient-to-br from-brand-aqua to-[#00aaa7]"    href="/admin/pedidos" />
        <StatCard label="Pedidos pagados" value={data?.paid_orders ?? 0}        icon="✅" color="bg-gradient-to-br from-emerald-400 to-emerald-600"  href="/admin/pedidos" />
        <StatCard label="Clientes"        value={data?.total_clients ?? 0}      icon="👥" color="bg-gradient-to-br from-brand-lav to-[#9b7fde]"      href="/admin/clientes" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pendientes"    value={data?.pending_orders ?? 0}   icon="⏳" color="bg-gradient-to-br from-yellow-400 to-orange-400" href="/admin/pedidos" />
        <StatCard label="Entregados"    value={data?.delivered_orders ?? 0} icon="🎉" color="bg-gradient-to-br from-green-400 to-green-600" />
        <StatCard label="Cancelados"    value={data?.cancelled_orders ?? 0} icon="❌" color="bg-gradient-to-br from-red-400 to-red-600" />
        <StatCard label="Stock bajo"    value={data?.low_stock_count ?? 0}  icon="⚠️" color="bg-gradient-to-br from-orange-400 to-red-500" href="/admin/stock" />
      </div>

      {(data?.low_stock_items?.length ?? 0) > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <h2 className="font-black text-brand-text mb-4">⚠️ Productos con stock bajo</h2>
          <div className="space-y-3">
            {data!.low_stock_items.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-orange-50 rounded-2xl p-4">
                <span className="font-bold text-sm text-brand-text">{p.nombre}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-orange-600 font-black bg-orange-100 px-3 py-1 rounded-full">
                    Stock: {p.stock} / mín {p.stock_minimo}
                  </span>
                  <Link href="/admin/stock" className="text-xs text-brand-pink font-bold hover:underline">Ajustar</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Nuevo producto',  href: '/admin/productos/nuevo', icon: '➕', bg: 'bg-brand-pink2'  },
          { label: 'Ver pedidos',     href: '/admin/pedidos',          icon: '📦', bg: 'bg-brand-aqua2' },
          { label: 'Ver reportes',    href: '/admin/reportes',         icon: '📈', bg: 'bg-brand-cream'  },
          { label: 'Gestionar stock', href: '/admin/stock',            icon: '📉', bg: 'bg-brand-lav'    },
          { label: 'Ver clientes',    href: '/admin/clientes',         icon: '👥', bg: 'bg-brand-pink2'  },
          { label: 'Ver tienda',      href: '/',                       icon: '🏪', bg: 'bg-brand-aqua2'  },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`${item.bg} rounded-2xl p-5 flex items-center gap-3 hover:shadow-card transition-shadow font-bold text-brand-text`}>
            <span className="text-2xl">{item.icon}</span>{item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
