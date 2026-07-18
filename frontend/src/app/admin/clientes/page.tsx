'use client';
import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/adminApi';

interface Cliente {
  id:         string;
  nombre?:    string;
  apellido?:  string;
  email?:     string;
  telefono?:  string;
  ciudad?:    string;
  created_at: string;
  order_count?: number;
  total_spent?: number;
}

export default function AdminClientesPage() {
  const [clients, setClients] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q,       setQ]       = useState('');

  const load = async (search?: string) => {
    setLoading(true);
    const res = await adminAPI.getClients(search);
    if (res.success) setClients((res.data as Cliente[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(q);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-pacifico text-3xl text-brand-pink">Clientes</h1>
        <p className="text-brand-text/60 font-bold text-sm">{clients.length} clientes registrados</p>
      </div>

      {/* Búsqueda */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="flex-1 border-2 border-brand-pink2 rounded-2xl px-4 py-3 text-sm outline-none focus:border-brand-pink"
        />
        <button type="submit"
          className="bg-brand-pink text-white font-black px-5 py-3 rounded-2xl hover:bg-brand-hot transition-colors">
          Buscar
        </button>
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-card overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-brand-pink font-black animate-pulse">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 text-brand-text/40 font-bold">No se encontraron clientes</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-pink2/30 bg-brand-pink2/20">
                  <th className="text-left px-5 py-4 text-xs font-black text-brand-text/50 uppercase">Cliente</th>
                  <th className="text-left px-4 py-4 text-xs font-black text-brand-text/50 uppercase">Email</th>
                  <th className="text-left px-4 py-4 text-xs font-black text-brand-text/50 uppercase">Ciudad</th>
                  <th className="text-center px-4 py-4 text-xs font-black text-brand-text/50 uppercase">Pedidos</th>
                  <th className="text-right px-5 py-4 text-xs font-black text-brand-text/50 uppercase">Total gastado</th>
                  <th className="text-center px-4 py-4 text-xs font-black text-brand-text/50 uppercase">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="border-b border-brand-pink2/20 hover:bg-brand-pink2/10 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-pink2 flex items-center justify-center text-brand-pink font-black text-sm">
                          {(c.nombre?.[0] ?? c.email?.[0] ?? '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-sm text-brand-text">
                            {c.nombre ? `${c.nombre} ${c.apellido ?? ''}` : '(sin nombre)'}
                          </p>
                          {c.telefono && <p className="text-xs text-brand-text/40">{c.telefono}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-brand-text/70">{c.email ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-brand-text/60 font-bold">{c.ciudad ?? '—'}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm font-black text-brand-text/80">{c.order_count ?? 0}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-black text-brand-text">
                        {c.total_spent ? `$${c.total_spent.toLocaleString('es-CL')}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xs text-brand-text/40 font-bold">
                        {new Date(c.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
