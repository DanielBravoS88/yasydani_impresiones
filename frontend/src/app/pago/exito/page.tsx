import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function PagoExitoPage({
  searchParams,
}: {
  searchParams: { pedido?: string };
}) {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="text-8xl animate-bounce">🎉</div>
      <h1 className="font-pacifico text-4xl text-brand-pink">¡Pago exitoso!</h1>
      <p className="text-brand-text font-bold text-lg">
        Tu pedido fue confirmado. Te contactaremos pronto para coordinar los detalles de tu diseño 💖
      </p>
      {searchParams.pedido && (
        <p className="text-sm text-brand-text/50 font-bold">
          N° de pedido: <span className="font-black text-brand-text">{searchParams.pedido}</span>
        </p>
      )}
      <p className="text-sm text-brand-text/60">
        Revisa tu correo o escríbenos por WhatsApp si tienes dudas.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <a
          href="https://wa.me/56983220168"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="aqua">💬 Contactar por WhatsApp</Button>
        </a>
        <Link href="/productos">
          <Button variant="outline">Ver más productos</Button>
        </Link>
      </div>
    </div>
  );
}
