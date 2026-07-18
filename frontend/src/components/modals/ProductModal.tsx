'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import { formatPrice, buildWhatsAppUrl } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import type { Producto } from '@yasydani/shared';

interface ProductModalProps {
  product: Producto;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [note, setNote]             = useState('');
  const [files, setFiles]           = useState<File[]>([]);
  const [added, setAdded]           = useState(false);
  const { addItem, toggleCart }     = useCartStore();
  const overlayRef                  = useRef<HTMLDivElement>(null);

  const imgSrc =
    product.imagen_principal_url ??
    product.imagenes?.[0]?.url ??
    '/placeholder-product.svg';

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleAddToCart = () => {
    addItem({
      producto: product,
      cantidad: 1,
      notas_personalizacion: note.trim() || undefined,
      archivos_nombres: files.map((f) => f.name),
    });
    setAdded(true);
    setTimeout(() => {
      onClose();
      toggleCart(true);
    }, 800);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-[rgba(28,18,28,0.58)] flex items-center justify-center z-[100] px-4 py-6"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-[30px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-pacifico text-2xl text-brand-pink leading-tight">
              {product.nombre}
            </h2>
            <button
              onClick={onClose}
              className="shrink-0 w-11 h-11 rounded-full bg-[#ffe1f2] hover:bg-brand-hot hover:text-white transition-colors font-black text-xl"
              aria-label="Cerrar modal"
            >
              ×
            </button>
          </div>

          {/* Contenido */}
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Imagen */}
            <div className="relative w-full h-60 sm:h-72 rounded-[22px] overflow-hidden bg-brand-pink2">
              <Image src={imgSrc} alt={product.nombre} fill className="object-contain p-2" />
            </div>

            {/* Info + Formulario */}
            <div className="space-y-4">
              <span className="inline-block bg-brand-aqua2 rounded-full px-3 py-1 text-xs font-black text-[#008e8b]">
                {product.categoria?.nombre ?? 'Producto'}
              </span>

              {product.descripcion && (
                <p className="text-sm text-brand-text/80 leading-relaxed">
                  {product.descripcion}
                </p>
              )}

              <p className="text-2xl font-black text-brand-hot">
                {formatPrice(product.precio, product.precio_desde)}
              </p>

              {/* Subir fotos */}
              <div className="border-3 border-dashed border-brand-aqua bg-[#effffc] rounded-[18px] p-4 text-center">
                <p className="font-black text-sm text-brand-text mb-2">
                  📎 Adjuntar fotos para personalizar
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="text-xs w-full"
                />
                {files.length > 0 && (
                  <p className="text-xs text-[#009e96] font-black mt-1">
                    ✓ {files.length} foto(s) seleccionada(s)
                  </p>
                )}
                <small className="text-xs text-brand-text/50 block mt-1">
                  Las fotos se envían tras validar el pago
                </small>
              </div>

              {/* Nota */}
              <div>
                <label className="block font-black text-sm text-brand-text mb-1">
                  Mensaje o detalle para el diseño
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: nombre, frase, colores, fecha especial..."
                  className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink resize-none"
                />
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="primary"
              onClick={handleAddToCart}
              disabled={added}
              className="flex-1"
            >
              {added ? '✓ Agregado al carrito' : '🛒 Agregar al carrito'}
            </Button>
            <a
              href={buildWhatsAppUrl(product.nombre)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="aqua">💬 WhatsApp</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
