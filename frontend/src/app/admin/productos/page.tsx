'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { adminAPI } from '@/lib/adminApi';

interface Producto {
  id: string;
  nombre: string;
  sku?: string;
  precio?: number;
  precio_oferta?: number;
  stock: number;
  stock_minimo: number;
  stock_ilimitado: boolean;
  activo: boolean;
  destaca: boolean;
  imagen_principal_url?: string;
  categoria?: { nombre: string };
}

interface Categoria { id: string; nombre: string; }

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
];

export default function AdminProductosPage() {
  const [products, setProducts] = useState<Producto[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [q,        setQ]        = useState('');
  const [activo,   setActivo]   = useState('');
  const [categoria, setCategoria] = useState('');
  const [destacado, setDestacado] = useState(false);
  const [bajStock, setBajStock] = useState(false);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (q)          params.set('q', q);
    if (activo)     params.set('activo', activo);
    if (categoria)  params.set('categoria', categoria);
    if (destacado)  params.set('destacado', 'true');
    if (bajStock)   params.set('bajo_stock', 'true');
    const res = await adminAPI.getProducts(params.toString());
    if (res.success) {
      setProducts((res.data as Producto[]) ?? []);
    } else {
      setProducts([]);
      setError(typeof res.error === 'string' ? res.error : 'No se pudieron cargar los productos');
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [activo, categoria, destacado, bajStock]);
  useEffect(() => {
    adminAPI.getCategories().then(res => {
      if (res.success) setCategories((res.data as Categoria[]) ?? []);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(); };

  const handleDeactivate = async (id: string, nombre: string) => {
    if (!confirm(`¿Desactivar el producto "${nombre}"?`)) return;
    setDeleting(id);
    await adminAPI.deleteProduct(id);
    await load();
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-pacifico text-3xl text-brand-pink">Productos</h1>
          <p className="text-brand-text/60 font-bold text-sm">{products.length} productos</p>
        </div>
        <Link href="/admin/productos/nuevo"
          className="bg-brand-pink hover:bg-brand-hot text-white font-black px-5 py-3 rounded-2xl transition-colors">
          ➕ Nuevo producto
        </Link>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-3xl p-5 shadow-card">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            className="flex-1 min-w-[200px] border-2 border-brand-pink2 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
          />
          <select
            value={activo}
            onChange={e => setActivo(e.target.value)}
            aria-label="Filtrar por estado"
            className="border-2 border-brand-pink2 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} aria-label="Filtrar por categoría"
            className="border-2 border-brand-pink2 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-brand-pink">
            <option value="">Todas las categorías</option>
            {categories.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          <label className="flex items-center gap-2 font-bold text-sm text-brand-text cursor-pointer">
            <input type="checkbox" checked={destacado} onChange={e => setDestacado(e.target.checked)}
              className="accent-brand-pink w-4 h-4" />
            Destacados
          </label>
          <label className="flex items-center gap-2 font-bold text-sm text-brand-text cursor-pointer">
            <input type="checkbox" checked={bajStock} onChange={e => setBajStock(e.target.checked)}
              className="accent-brand-pink w-4 h-4" />
            Stock bajo
          </label>
          <button type="submit"
            className="bg-brand-pink text-white font-black px-5 py-2.5 rounded-2xl hover:bg-brand-hot transition-colors">
            Buscar
          </button>
          <button type="button" onClick={() => { setQ(''); setActivo(''); setCategoria(''); setDestacado(false); setBajStock(false); }}
            className="bg-brand-pink2 text-brand-text font-black px-5 py-2.5 rounded-2xl hover:bg-brand-lav transition-colors">
            Limpiar
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 font-bold text-sm">
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-card overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-brand-pink font-black animate-pulse">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-brand-text/50 font-bold">No se encontraron productos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-pink2 bg-brand-pink2/30">
                  <th className="text-left px-5 py-4 text-xs font-black text-brand-text/60 uppercase tracking-wide">Producto</th>
                  <th className="text-left px-4 py-4 text-xs font-black text-brand-text/60 uppercase tracking-wide">Categoría</th>
                  <th className="text-right px-4 py-4 text-xs font-black text-brand-text/60 uppercase tracking-wide">Precio</th>
                  <th className="text-center px-4 py-4 text-xs font-black text-brand-text/60 uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-4 text-xs font-black text-brand-text/60 uppercase tracking-wide">Estado</th>
                  <th className="text-center px-5 py-4 text-xs font-black text-brand-text/60 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-brand-pink2/30 hover:bg-brand-pink2/10 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {p.imagen_principal_url ? (
                          <Image src={p.imagen_principal_url} alt={p.nombre} width={44} height={44}
                            className="rounded-xl object-cover w-11 h-11" unoptimized />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-brand-pink2 flex items-center justify-center text-brand-pink text-lg">🖼️</div>
                        )}
                        <div>
                          <p className="font-black text-sm text-brand-text">{p.nombre}</p>
                          {p.sku && <p className="text-xs text-brand-text/40">SKU: {p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-brand-text/70 font-bold">
                      {p.categoria?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-black text-brand-text text-sm">
                        {p.precio ? `$${p.precio.toLocaleString('es-CL')}` : 'Desde consulta'}
                      </p>
                      {p.precio_oferta && (
                        <p className="text-xs text-green-600 font-bold">
                          Oferta: ${p.precio_oferta.toLocaleString('es-CL')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {p.stock_ilimitado ? (
                        <span className="text-xs font-black text-brand-aqua bg-brand-aqua2 px-3 py-1 rounded-full">∞</span>
                      ) : (
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                          p.stock <= p.stock_minimo
                            ? 'text-red-600 bg-red-100'
                            : 'text-green-700 bg-green-100'
                        }`}>
                          {p.stock}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`text-xs font-black px-3 py-1 rounded-full ${
                        p.activo ? 'text-green-700 bg-green-100' : 'text-red-600 bg-red-100'
                      }`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      {p.destaca && (
                        <span className="ml-1 text-xs font-black text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">⭐</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/admin/productos/${p.id}/editar`}
                          className="bg-brand-lav text-white font-black text-xs px-3 py-2 rounded-xl hover:opacity-80 transition-opacity">
                          ✏️ Editar
                        </Link>
                        {p.activo && (
                          <button
                            onClick={() => handleDeactivate(p.id, p.nombre)}
                            disabled={deleting === p.id}
                            className="bg-red-100 text-red-600 font-black text-xs px-3 py-2 rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            {deleting === p.id ? '...' : '🗑️'}
                          </button>
                        )}
                      </div>
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
