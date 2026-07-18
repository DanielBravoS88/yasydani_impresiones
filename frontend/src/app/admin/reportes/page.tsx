'use client';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { adminAPI } from '@/lib/adminApi';

const PERIODS = [
  { value: '7d',  label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
];

const PIE_COLORS = ['#58ded8','#ff77c8','#ffd700','#d8c7ff','#ff4fd8','#a78bfa'];

function CardMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-card text-center">
      <p className="text-3xl font-black text-brand-pink">{value}</p>
      <p className="text-xs font-bold text-brand-text/50 mt-1">{label}</p>
    </div>
  );
}

export default function AdminReportesPage() {
  const [period,  setPeriod]  = useState('30d');
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminAPI.getReports(period).then(res => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-pacifico text-3xl text-brand-pink">Reportes</h1>
          <p className="text-brand-text/60 font-bold text-sm">Estadísticas de ventas</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                period === p.value ? 'bg-brand-pink text-white' : 'bg-white text-brand-text/60 hover:text-brand-pink shadow-card'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-brand-pink font-black animate-pulse">Cargando reportes...</div>
      ) : !data ? (
        <div className="text-center py-20 text-brand-text/40 font-bold">No hay datos disponibles aún</div>
      ) : (
        <>
          {/* Métricas de resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardMetric label="Ingresos período" value={`$${(data.total_revenue ?? 0).toLocaleString('es-CL')}`} />
            <CardMetric label="Pedidos pagados"  value={data.total_orders ?? 0} />
            <CardMetric label="Ticket promedio"  value={`$${(data.avg_ticket ?? 0).toLocaleString('es-CL')}`} />
            <CardMetric label="Unidades vendidas" value={data.total_items ?? 0} />
          </div>

          {/* Ventas por día */}
          {(data.sales_by_day?.length ?? 0) > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-card">
              <h2 className="font-black text-brand-text mb-4">Ventas por día</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.sales_by_day} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0d8f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#51344d99' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#51344d99' }} />
                  <Tooltip
                    formatter={(v) => [`$${Number(v ?? 0).toLocaleString('es-CL')}`, 'Ventas']}
                    contentStyle={{ borderRadius: 16, border: '2px solid #ff77c8', fontWeight: 700 }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#ff77c8" strokeWidth={3}
                    dot={{ fill: '#ff77c8', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top productos */}
            {(data.top_products?.length ?? 0) > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-card">
                <h2 className="font-black text-brand-text mb-4">Top productos</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.top_products} layout="vertical" margin={{ left: 20, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0d8f5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#51344d99' }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: '#51344d99' }} />
                    <Tooltip
                      formatter={(v) => [Number(v ?? 0), 'Unidades']}
                      contentStyle={{ borderRadius: 16, border: '2px solid #58ded8', fontWeight: 700 }}
                    />
                    <Bar dataKey="qty" fill="#58ded8" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pedidos por estado */}
            {(data.orders_by_status?.length ?? 0) > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-card">
                <h2 className="font-black text-brand-text mb-4">Pedidos por estado</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.orders_by_status}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.orders_by_status.map((_: unknown, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [Number(v ?? 0), 'Pedidos']}
                      contentStyle={{ borderRadius: 16, border: '2px solid #d8c7ff', fontWeight: 700 }}
                    />
                    <Legend formatter={v => <span style={{ fontWeight: 700, fontSize: 12 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
