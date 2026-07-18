import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function PagoErrorPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="text-8xl">😕</div>
      <h1 className="font-pacifico text-4xl text-brand-pink">Pago no completado</h1>
      <p className="text-brand-text font-bold">
        Hubo un problema con tu pago. Puedes intentarlo nuevamente o contactarnos por WhatsApp.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link href="/carrito">
          <Button variant="primary">Reintentar pago</Button>
        </Link>
        <a href="https://wa.me/56983220168" target="_blank" rel="noopener noreferrer">
          <Button variant="aqua">💬 Ayuda por WhatsApp</Button>
        </a>
      </div>
    </div>
  );
}
