'use client';
import Link from 'next/link';
import CartItem from '@/components/cart/CartItem';
import Button from '@/components/ui/Button';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

export default function CarritoPage() {
  const { items, total, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="text-7xl">🛒</div>
        <h1 className="font-pacifico text-3xl text-brand-pink">Tu carrito está vacío</h1>
        <p className="text-brand-text/70 font-bold">
          Explora nuestros productos y encuentra el regalo perfecto 💖
        </p>
        <Link href="/productos">
          <Button variant="primary" size="lg">Ver productos</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-pacifico text-3xl text-brand-pink">Tu carrito</h1>
        <button
          onClick={clearCart}
          className="text-xs font-black text-brand-text/50 hover:text-brand-hot transition-colors border border-brand-pink2 rounded-full px-3 py-1"
        >
          Vaciar carrito
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => (
          <CartItem key={item.producto.id} item={item} index={i} />
        ))}
      </div>

      {/* Resumen */}
      <div className="bg-white rounded-[24px] shadow-brand p-6 space-y-4">
        <div className="flex justify-between items-center text-xl font-black text-brand-text border-b-2 border-brand-pink2 pb-4">
          <span>Total</span>
          <span className="text-brand-hot text-2xl">{formatPrice(total())}</span>
        </div>
        <p className="text-xs text-brand-text/50 text-center">
          🔒 Pago 100% seguro · Las fotos se envían tras validar el pago
        </p>
        <Link href="/">
          <Button variant="primary" fullWidth size="lg">
            💳 Proceder al pago
          </Button>
        </Link>
        <Link href="/productos" className="block text-center text-sm font-bold text-brand-hot hover:underline">
          ← Seguir comprando
        </Link>
      </div>
    </div>
  );
}
