import Link from 'next/link';
import Image from 'next/image';
import Button from '@/components/ui/Button';

export default function HeroSection() {
  return (
    <section
      className="max-w-6xl mx-auto my-8 mx-4 lg:mx-auto rounded-[34px] relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #80f1df, #ffcae8 60%, #fff7ad)',
        boxShadow: '0 18px 40px rgba(255,79,170,.18)',
        padding: '42px 24px',
      }}
    >
      {/* Emojis decorativos */}
      <span
        className="absolute text-7xl opacity-20 right-8 top-6 select-none pointer-events-none hidden lg:block"
        aria-hidden="true"
      >
        ✨ 📸 💖
      </span>

      <div className="grid lg:grid-cols-2 gap-8 items-center">

        {/* Texto */}
        <div>
          <h2
            className="font-pacifico text-4xl lg:text-5xl text-white leading-tight mb-4"
            style={{ textShadow: '4px 5px 0 #ff77c8, 8px 9px 0 rgba(0,0,0,.12)' }}
          >
            La magia de personalizar recuerdos
          </h2>
          <p className="text-lg font-bold text-brand-text max-w-lg mb-6 leading-relaxed">
            Agendas, cuadros, álbumes y regalos únicos para guardar historias, fotos y momentos que se quedan para siempre.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link href="/productos">
              <Button variant="primary" size="md">
                Ver productos
              </Button>
            </Link>
            <a
              href="https://wa.me/56983220168?text=Hola%20Yas%26Dani%20Impresiones%2C%20quiero%20cotizar%20un%20producto%20personalizado"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="aqua" size="md">
                💬 Cotizar por WhatsApp
              </Button>
            </a>
          </div>
        </div>

        {/* Imagen destacada */}
        <div className="bg-white/60 rounded-[30px] p-4 text-center backdrop-blur-sm">
          <div className="relative w-full h-64 lg:h-80 rounded-[22px] overflow-hidden shadow-[0_12px_25px_rgba(0,0,0,.14)]">
            <Image
              src="/product8.jpeg"
              alt="Producto destacado - regalo personalizado"
              fill
              className="object-cover"
              priority
            />
          </div>
          <p className="font-black text-brand-text mt-3 text-sm">
            Diseños románticos, tiernos y llenos de color ✨
          </p>
        </div>
      </div>
    </section>
  );
}
