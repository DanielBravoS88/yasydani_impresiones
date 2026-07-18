'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminAPI } from '@/lib/adminApi';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
  items?: { product_name: string; quantity: number; unit_price: number }[];
}

const STATUSES = ['todos','pendiente','pagado','en_preparacion','listo_para_entrega','enviado','entregado','cancelado'];
const NEXT: Record<string, string[]> = {
  pendiente: ['pagado','cancelado'], pagado: ['en_preparacion','cancelado'],
  en_preparacion: ['listo_para_entrega','cancelado'], listo_para_entrega: ['enviado','entregado','cancelado'],
  enviado: ['entregado','cancelado'], entregado: [], cancelado: [],
};

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminAPI.getOrders(status === 'todos' ? '' : `status=${status}`);
    if (res.success) setOrders((res.data as Order[]) ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (id: string, nextStatus: string) => {
    await adminAPI.updateStatus(id, nextStatus);
    await load();
  };

  return <div className="space-y-6">
    <div><h1 className="font-pacifico text-3xl text-brand-pink">Pedidos</h1>
      <p className="text-brand-text/60 font-bold text-sm">{orders.length} pedidos</p></div>
    <div className="flex flex-wrap gap-2">{STATUSES.map(value =>
      <button key={value} onClick={() => setStatus(value)} className={`px-4 py-2 rounded-2xl text-xs font-black ${status === value ? 'bg-brand-pink text-white' : 'bg-white text-brand-text/60 shadow-card'}`}>
        {value.replaceAll('_', ' ')}
      </button>)}</div>
    {loading ? <p className="text-center py-12 text-brand-pink font-black">Cargando...</p> :
      <div className="space-y-3">{orders.map(order => <div key={order.id} className="bg-white rounded-3xl shadow-card overflow-hidden">
        <button className="w-full flex items-center justify-between p-5 text-left" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
          <span><strong className="block text-brand-text">{order.order_number}</strong>
            <small>{new Date(order.created_at).toLocaleDateString('es-CL')} · {order.customer_name ?? order.customer_email ?? 'Cliente'}</small></span>
          <span className="flex gap-4 items-center"><span className="capitalize font-bold">{order.status.replaceAll('_', ' ')}</span>
            <strong>${Number(order.total).toLocaleString('es-CL')}</strong></span>
        </button>
        {expanded === order.id && <div className="border-t p-5 space-y-3">
          {order.items?.map((item, index) => <div key={index} className="flex justify-between bg-brand-pink2/20 rounded-2xl px-4 py-2">
            <span>{item.product_name}</span><span>{item.quantity} × ${Number(item.unit_price).toLocaleString('es-CL')}</span>
          </div>)}
          <div className="flex gap-2 flex-wrap">{(NEXT[order.status] ?? []).map(next =>
            <button key={next} onClick={() => void updateStatus(order.id, next)} className="bg-brand-pink text-white px-4 py-2 rounded-2xl text-xs font-black">
              {next.replaceAll('_', ' ')}
            </button>)}</div>
        </div>}
      </div>)}</div>}
  </div>;
}
