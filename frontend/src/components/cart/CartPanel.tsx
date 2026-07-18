'use client';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import CartItem from './CartItem';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import { createOrder, createMercadoPagoPreference } from '@/lib/api';

export default function CartPanel() {
  const { items, isOpen, toggleCart, total, clearCart } = useCartStore();
  const [clientName, setClientName]   = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState('');

  const handlePay = async () => {
    if (!items.length) {
      setMsg('Agrega un producto antes de pagar.');
      return;
    }
    if (!clientName.trim()) {
      setMsg('Por favor ingresa tu nombre.');
      return;
    }

    setLoading(true);
    setMsg('');

    try {
      const orderRes = await createOrder({
        cliente: {
          nombre: clientName.trim(),
          email:  clientEmail.trim() || undefined,
          telefono: clientPhone.trim() || undefined,
        },
        items: items.map((i) => ({
          producto_id:           i.producto.id,
          cantidad:              i.cantidad,
          notas_personalizacion: i.notas_personalizacion,
        })),
      });

      if (!orderRes.success || !orderRes.data) {
        setMsg(orderRes.error ?? 'Error al crear el pedido');
        return;
      }

      const order = orderRes.data as { id: string; access_token: string };
      const prefRes = await createMercadoPagoPreference(order.id, order.access_token);

      if (!prefRes.success || !prefRes.data?.init_point) {
        setMsg(prefRes.error ?? 'Error al iniciar el pago');
        return;
      }

      clearCart();
      window.location.href = prefRes.data.init_point;
    } catch {
      setMsg('Ocurrió un error. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[110]"
          onClick={() => toggleCart(false)}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-[390px] max-w-[94vw] bg-white z-[120]
          shadow-[-12px_0_35px_rgba(0,0,0,0.15)] transition-transform duration-300 overflow-y-auto
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        aria-label="Carrito de compras"
      >
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-pacifico text-2xl text-brand-pink">Tu carrito</h2>
            <button
              onClick={() => toggleCart(false)}
              className="w-10 h-10 rounded-full bg-[#ffe1f2] text-brand-text hover:bg-brand-hot hover:text-white transition-colors font-black text-lg"
              aria-label="Cerrar carrito"
            >
              ×
            </button>
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <p className="text-center text-brand-text/60 font-bold py-8">
              Tu carrito está vacío 🛒
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item, i) => (
                <CartItem key={item.producto.id} item={item} index={i} />
              ))}
            </div>
          )}

          {/* Total */}
          {items.length > 0 && (
            <div className="border-t-2 border-brand-pink2 pt-3">
              <div className="flex justify-between items-center font-black text-lg">
                <span className="text-brand-text">Total</span>
                <span className="text-brand-hot text-xl">{formatPrice(total())}</span>
              </div>
            </div>
          )}

          {/* Formulario del cliente */}
          {items.length > 0 && (
            <div className="space-y-3 bg-brand-pink2/30 rounded-2xl p-4">
              <p className="font-black text-sm text-brand-text">Tus datos de contacto</p>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nombre *"
                className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
                required
              />
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Correo electrónico (opcional)"
                className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
              />
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Teléfono (opcional)"
                className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
              />
            </div>
          )}

          {/* Botón pagar */}
          {items.length > 0 && (
            <Button
              variant="primary"
              fullWidth
              onClick={handlePay}
              disabled={loading}
              className="text-base py-4"
              style={{ background: '#009ee3' }}
            >
              {loading ? 'Procesando...' : '💳 Pagar con Mercado Pago'}
            </Button>
          )}

          {msg && (
            <p className="text-center text-sm font-bold text-brand-hot">{msg}</p>
          )}

          {/* Nota */}
          {items.length > 0 && (
            <p className="text-xs text-center text-brand-text/50 leading-relaxed">
              🔒 Pago 100% seguro vía Mercado Pago · Las fotos quedan registradas tras validar el pago
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
