'use client';
import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/adminApi';

interface StockItem {
  id:             string;
  nombre:         string;
  sku?:           string;
  stock:          number;
  stock_minimo:   number;
  stock_ilimitado:boolean;
}

interface Movement {
  id:         string;
  created_at: string;
  tipo:       string;
  cantidad:   number;
  motivo?:    string;
  productos?: { nombre: string };
}

export default function AdminStockPage() {
  const [items,     setItems]     = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [qty,       setQty]       = useState<Record<string, string>>({});
  const [motivo,    setMotivo]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await adminAPI.getStock();
    if (res.success) {
      const d = res.data as { products: StockItem[]; movements: Movement[] };
      setItems(d.products ?? []);
      setMovements(d.movements ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdjust = async (id: string) => {
    const q = parseInt(qty[id] ?? '0');
    if (!q) return;
    setSaving(true);
    await adminAPI.adjustStock({
      producto_id: id,
      cantidad:    q,
      motivo:      motivo[id] || (q > 0 ? 'Ajuste de entrada' : 'Ajuste de salida'),
    });
    setAdjusting(null);
    setQty(p => ({ ...p, [id]: '' }));
    setMotivo(p => ({ ...p, [id]: '' }));
    await load();
    setSaving(false);
  };

  const TIPO_BADGE: Record<string, string> = {
    entrada:   'bg-green-100 text-green-700',
    salida:    'bg-red-100 text-red-600',
    ajuste:    'bg-yellow-100 text-yellow-700',
    venta:     'bg-blue-100 text-blue-700',
    devolucion:'bg-purple-100 text-purple-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-pacifico text-3xl text-brand-pink">Stock</h1>
        <p className="text-brand-text/60 font-bold text-sm">Gestión de inventario</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-brand-pink font-black animate-pulse">Cargando...</div>
      ) : (
        <>
          {/* Tabla de productos */}
          <div className="bg-white rounded-3xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-brand-pink2/30 bg-brand-pink2/20">
              <h2 className="font-black text-brand-text">Inventario de productos</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brand-pink2/30">
                    <th className="text-left px-5 py-3 text-xs font-black text-brand-text/50 uppercase">Producto</th>
                    <th className="text-center px-4 py-3 text-xs font-black text-brand-text/50 uppercase">Stock</th>
                    <th className="text-center px-4 py-3 text-xs font-black text-brand-text/50 uppercase">Mínimo</th>
                    <th className="text-center px-5 py-3 text-xs font-black text-brand-text/50 uppercase">Ajustar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const isLow = !item.stock_ilimitado && item.stock <= item.stock_minimo;
                    const isAdj = adjusting === item.id;
                    return (
                      <tr key={item.id} className={`border-b border-brand-pink2/20 hover:bg-brand-pink2/10 ${isLow ? 'bg-orange-50' : ''}`}>
                        <td className="px-5 py-4">
                          <p className="font-black text-sm text-brand-text">{item.nombre}</p>
                          {item.sku && <p className="text-xs text-brand-text/30">SKU: {item.sku}</p>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {item.stock_ilimitado ? (
                            <span className="text-brand-aqua font-black text-sm">∞</span>
                          ) : (
                            <span className={`text-sm font-black ${isLow ? 'text-orange-600' : 'text-green-600'}`}>
                              {isLow ? '⚠️ ' : ''}{item.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-bold text-brand-text/50">{item.stock_minimo}</span>
                        </td>
                        <td className="px-5 py-4">
                          {!item.stock_ilimitado && (
                            <div className="flex items-center justify-center gap-2">
                              {isAdj ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    value={qty[item.id] ?? ''}
                                    onChange={e => setQty(p => ({ ...p, [item.id]: e.target.value }))}
                                    placeholder="±cantidad"
                                    className="w-24 border-2 border-brand-pink2 rounded-xl px-2 py-1.5 text-xs text-center outline-none focus:border-brand-pink"
                                  />
                                  <input
                                    type="text"
                                    value={motivo[item.id] ?? ''}
                                    onChange={e => setMotivo(p => ({ ...p, [item.id]: e.target.value }))}
                                    placeholder="Motivo (opcional)"
                                    className="w-32 border-2 border-brand-pink2 rounded-xl px-2 py-1.5 text-xs outline-none focus:border-brand-pink"
                                  />
                                  <button
                                    onClick={() => handleAdjust(item.id)}
                                    disabled={saving}
                                    className="bg-brand-pink text-white font-black text-xs px-3 py-1.5 rounded-xl hover:bg-brand-hot disabled:opacity-50"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setAdjusting(null)}
                                    className="text-brand-text/40 font-black text-xs px-2 py-1.5 rounded-xl hover:text-brand-text"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAdjusting(item.id)}
                                  className="bg-brand-lav text-white font-black text-xs px-3 py-2 rounded-xl hover:opacity-80"
                                >
                                  ± Ajustar
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movimientos recientes */}
          {movements.length > 0 && (
            <div className="bg-white rounded-3xl shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-pink2/30 bg-brand-pink2/20">
                <h2 className="font-black text-brand-text">Movimientos recientes</h2>
              </div>
              <div className="divide-y divide-brand-pink2/20">
                {movements.slice(0, 30).map(m => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-bold text-sm text-brand-text">{m.productos?.nombre ?? 'Producto'}</p>
                      <p className="text-xs text-brand-text/40">
                        {new Date(m.created_at).toLocaleDateString('es-CL')}
                        {m.motivo ? ` — ${m.motivo}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black px-3 py-1 rounded-full capitalize ${TIPO_BADGE[m.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.tipo}
                      </span>
                      <span className={`font-black text-sm ${m.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
