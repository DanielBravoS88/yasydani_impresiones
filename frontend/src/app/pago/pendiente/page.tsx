import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function PagoPendientePage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="text-8xl">⏳</div>
      <h1 className="font-pacifico text-4xl text-brand-pink">Pago en revisión</h1>
      <p className="text-brand-text font-bold">
        Tu pago está siendo procesado. Te avisaremos cuando se confirme 💖
      </p>
      <p className="text-sm text-brand-text/60">
        Si tienes dudas, escríbenos por WhatsApp con tu número de pedido.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <a href="https://wa.me/56983220168" target="_blank" rel="noopener noreferrer">
          <Button variant="aqua">💬 Consultar estado</Button>
        </a>
        <Link href="/">
          <Button variant="outline">Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
