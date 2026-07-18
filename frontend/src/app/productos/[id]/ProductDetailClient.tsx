'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useCartStore } from '@/store/cartStore';
import type { Producto } from '@yasydani/shared';

export default function ProductDetailClient({ product }: { product: Producto }) {
  const [note, setNote]      = useState('');
  const [files, setFiles]    = useState<File[]>([]);
  const [added, setAdded]    = useState(false);
  const { addItem, toggleCart } = useCartStore();

  const handleAdd = () => {
    addItem({
      producto: product,
      cantidad: 1,
      notas_personalizacion: note.trim() || undefined,
      archivos_nombres: files.map((f) => f.name),
    });
    setAdded(true);
    setTimeout(() => toggleCart(true), 600);
  };

  return (
    <div className="space-y-4">
      {/* Fotos */}
      <div className="border-2 border-dashed border-brand-aqua bg-[#effffc] rounded-[18px] p-4">
        <p className="font-black text-sm text-brand-text mb-2">📎 Adjuntar fotos para personalizar</p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="text-xs w-full"
        />
        {files.length > 0 && (
          <p className="text-xs text-[#009e96] font-black mt-1">✓ {files.length} foto(s) seleccionada(s)</p>
        )}
      </div>

      {/* Nota */}
      <div>
        <label className="block font-black text-sm text-brand-text mb-1">
          Detalles del diseño
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej: nombre, frase, colores, fecha especial..."
          className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink resize-none"
        />
      </div>

      <Button variant="primary" fullWidth onClick={handleAdd} disabled={added}>
        {added ? '✓ Agregado al carrito' : '🛒 Agregar al carrito'}
      </Button>
    </div>
  );
}
