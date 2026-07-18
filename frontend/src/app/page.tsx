import { createServerSupabaseClient } from '@/lib/supabase';
import HeroSection from '@/components/sections/HeroSection';
import FeaturedProducts from '@/components/sections/FeaturedProducts';
import type { Producto } from '@yasydani/shared';

async function getFeaturedProducts(): Promise<Producto[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('productos')
      .select(`*, categoria:categorias(id,nombre,slug), imagenes:imagenes_productos(id,url,alt,orden)`)
      .eq('activo', true).eq('destaca', true)
      .order('created_at', { ascending: false }).limit(6);
    if (error || !data) return [];
    return data as Producto[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <>
      <HeroSection />
      <FeaturedProducts products={featuredProducts} />

      {/* Sección de valor de marca */}
      <section className="max-w-4xl mx-auto px-4 my-16 text-center">
        <h2 className="font-pacifico text-3xl text-brand-pink mb-6">
          ¿Por qué elegirnos? 💖
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { emoji: '✨', title: 'Diseños únicos', desc: 'Cada producto es creado especialmente para ti, con tus fotos, nombres y colores favoritos.' },
            { emoji: '💌', title: 'Hecho con amor', desc: 'Somos un emprendimiento familiar que pone el corazón en cada impresión y cada regalo.' },
            { emoji: '🚀', title: 'Envíos a todo Chile', desc: 'Despachamos desde Huechuraba a todo el país. Consulta tiempos de envío por WhatsApp.' },
          ].map(({ emoji, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-[24px] p-6 shadow-brand hover:-translate-y-1 transition-transform"
            >
              <div className="text-5xl mb-3">{emoji}</div>
              <h3 className="font-black text-brand-text text-lg mb-2">{title}</h3>
              <p className="text-sm text-brand-text/70 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
