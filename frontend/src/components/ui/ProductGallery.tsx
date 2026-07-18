'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ProductGallery({ images, productName }: { images: string[]; productName: string }) {
  const [selected, setSelected] = useState(0);
  const activeImage = images[selected] ?? images[0] ?? '/placeholder-product.svg';

  return <div className="space-y-4">
    <div className="relative w-full aspect-square max-h-[600px] rounded-[22px] overflow-hidden bg-white border-2 border-brand-pink2">
      <Image src={activeImage} alt={productName} fill className="object-contain p-2" priority />
    </div>
    {images.length > 1 && <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Galería de imágenes">
      {images.map((src, index) => <button type="button" key={`${src}-${index}`}
        onClick={() => setSelected(index)} aria-label={`Ver imagen ${index + 1}`}
        aria-pressed={selected === index}
        className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 bg-white transition-colors ${selected === index ? 'border-brand-hot ring-2 ring-brand-pink2' : 'border-brand-pink2 hover:border-brand-pink'}`}>
        <Image src={src} alt={`${productName} ${index + 1}`} fill className="object-contain p-1" />
      </button>)}
    </div>}
  </div>;
}
