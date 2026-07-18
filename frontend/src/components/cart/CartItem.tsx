'use client';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import type { CartItemData } from '@yasydani/shared';

interface CartItemProps {
  item: CartItemData;
  index: number;
}

export default function CartItem({ item, index }: CartItemProps) {
  const { removeItem, updateQuantity } = useCartStore();
  const imgSrc =
    item.producto.imagenes?.[0]?.url ??
    item.producto.imagen_principal_url ??
    '/placeholder-product.svg';

  return (
    <div className="bg-[#fff2fa] border-2 border-brand-pink2 rounded-[20px] p-4 flex gap-3">
      {/* Miniatura */}
      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
        <Image src={imgSrc} alt={item.producto.nombre} fill className="object-cover" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-brand-text leading-tight truncate">
          {index + 1}. {item.producto.nombre}
        </p>
        <p className="text-brand-hot font-black text-sm mt-0.5">
          {formatPrice(item.producto.precio)}
        </p>

        {item.notas_personalizacion && (
          <p className="text-xs text-brand-text/60 mt-1 leading-tight truncate">
            📝 {item.notas_personalizacion}
          </p>
        )}

        {item.archivos_nombres?.length ? (
          <p className="text-xs text-brand-text/60 mt-0.5">
            📎 {item.archivos_nombres.length} foto(s) adjunta(s)
          </p>
        ) : null}

        {/* Cantidad */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() =>
              item.cantidad > 1
                ? updateQuantity(item.producto.id, item.cantidad - 1)
                : removeItem(item.producto.id)
            }
            className="w-7 h-7 rounded-full bg-brand-pink2 text-brand-text font-black text-sm hover:bg-brand-pink hover:text-white transition-colors"
            aria-label="Reducir cantidad"
          >
            −
          </button>
          <span className="font-black text-sm w-4 text-center">{item.cantidad}</span>
          <button
            onClick={() => updateQuantity(item.producto.id, item.cantidad + 1)}
            className="w-7 h-7 rounded-full bg-brand-aqua2 text-brand-text font-black text-sm hover:bg-brand-aqua hover:text-white transition-colors"
            aria-label="Aumentar cantidad"
          >
            +
          </button>
        </div>
      </div>

      {/* Eliminar */}
      <button
        onClick={() => removeItem(item.producto.id)}
        className="shrink-0 w-8 h-8 rounded-full bg-[#ffe1f2] text-brand-text hover:bg-brand-hot hover:text-white transition-colors font-black text-sm self-start"
        aria-label="Eliminar del carrito"
      >
        ×
      </button>
    </div>
  );
}
