'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/AuthContext';

type OrderStatus =
  | 'pendiente' | 'pagado' | 'en_preparacion'
  | 'listo_para_entrega' | 'enviado' | 'entregado' | 'cancelado';

interface OrderItem {
  id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: string;
  total: number;
  created_at: string;
  customer_name?: string;
  items?: OrderItem[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente:           '⏳ Pendiente',
  pagado:              '✅ Pagado',
  en_preparacion:      '🔧 En preparación',
  listo_para_entrega:  '📦 Listo para entrega',
  enviado:             '🚚 Enviado',
  entregado:           '🎉 Entregado',
  cancelado:           '❌ Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente:           'bg-yellow-100 text-yellow-700',
  pagado:              'bg-green-100 text-green-700',
  en_preparacion:      'bg-blue-100 text-blue-700',
  listo_para_entrega:  'bg-indigo-100 text-indigo-700',
  enviado:             'bg-purple-100 text-purple-700',
  entregado:           'bg-emerald-100 text-emerald-700',
  cancelado:           'bg-red-100 text-red-600',
};

export default function MisPedidosPage() {
  const { user } = useAuth();
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabaseBrowser
      .from('orders')
      .select('*, items:order_items(id,product_name,product_image,quantity,unit_price,total_price)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="text-center py-20 text-brand-pink font-black text-xl animate-pulse">
        Cargando pedidos...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-pacifico text-3xl text-brand-pink mb-2">Mis pedidos 📦</h1>
      <p className="text-brand-text/60 font-bold mb-6 text-sm">
        {orders.length} pedido{orders.length !== 1 ? 's' : ''} en tu historial
      </p>

      {orders.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center shadow-card">
          <span className="text-5xl block mb-4">🛒</span>
          <p className="font-black text-brand-text mb-2">Aún no tienes pedidos</p>
          <p className="text-brand-text/60 text-sm mb-6">¡Explora nuestros productos y realiza tu primera compra!</p>
          <Link href="/productos" className="bg-brand-pink text-white font-black px-6 py-3 rounded-2xl hover:bg-brand-hot transition-colors">
            Ver productos
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="glass rounded-3xl shadow-card overflow-hidden">
              {/* Cabecera del pedido */}
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-brand-pink2/20 transition-colors text-left"
              >
                <div>
                  <p className="font-black text-brand-text">{order.order_number}</p>
                  <p className="text-brand-text/50 text-xs mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('es-CL', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                  <span className="font-black text-brand-pink">
                    ${order.total.toLocaleString('es-CL')}
                  </span>
                  <span className="text-brand-text/30 text-sm">{expanded === order.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Detalle del pedido */}
              {expanded === order.id && (
                <div className="border-t border-brand-pink2 p-5 space-y-3">
                  {(order.items ?? []).map(item => (
                    <div key={item.id} className="flex items-center gap-4">
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-14 h-14 rounded-xl object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-brand-text truncate">{item.product_name}</p>
                        <p className="text-brand-text/50 text-xs">x{item.quantity} — ${item.unit_price.toLocaleString('es-CL')} c/u</p>
                      </div>
                      <p className="font-black text-brand-text shrink-0">
                        ${item.total_price.toLocaleString('es-CL')}
                      </p>
                    </div>
                  ))}
                  <div className="border-t border-brand-pink2 pt-3 flex justify-between font-black">
                    <span>Total</span>
                    <span className="text-brand-pink">${order.total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
