export default function ContactoPage() {
  const contactData = [
    {
      emoji: '💬',
      title: 'WhatsApp',
      desc: 'La forma más rápida de cotizar',
      action: {
        label: 'Escribir por WhatsApp',
        href: 'https://wa.me/56983220168?text=Hola%20Yas%26Dani%20Impresiones%2C%20tengo%20una%20consulta',
      },
    },
    {
      emoji: '📸',
      title: 'Instagram',
      desc: '@yasydaniimpresiones',
      action: {
        label: 'Ver en Instagram',
        href: 'https://www.instagram.com/yasydaniimpresiones',
      },
    },
    {
      emoji: '📍',
      title: 'Ubicación',
      desc: 'Huechuraba, Región Metropolitana, Chile',
      action: null,
    },
    {
      emoji: '🚀',
      title: 'Envíos',
      desc: 'A todo Chile vía Starken o Chilexpress',
      action: null,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center">
        <h1 className="font-pacifico text-4xl text-brand-pink mb-2">Contáctanos</h1>
        <p className="text-brand-text/70 font-bold">
          Estamos aquí para crear algo especial para ti 💖
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {contactData.map(({ emoji, title, desc, action }) => (
          <div
            key={title}
            className="bg-white rounded-[24px] shadow-brand p-6 text-center space-y-3 hover:-translate-y-1 transition-transform"
          >
            <div className="text-5xl">{emoji}</div>
            <h2 className="font-black text-brand-text text-xl">{title}</h2>
            <p className="text-brand-text/70 text-sm font-bold">{desc}</p>
            {action && (
              <a
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 bg-brand-pink text-white rounded-full px-5 py-2 text-sm font-black hover:bg-brand-hot transition-colors"
              >
                {action.label}
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Mensaje directo */}
      <div
        className="rounded-[28px] p-8 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #ff77c8, #58ded8)' }}
      >
        <h2 className="font-pacifico text-3xl mb-3" style={{ textShadow: '2px 2px 0 rgba(0,0,0,.15)' }}>
          ¿Lista para crear algo especial?
        </h2>
        <p className="font-bold mb-6 opacity-90">
          Cuéntanos tu idea y la hacemos realidad. Cotización sin compromiso.
        </p>
        <a
          href="https://wa.me/56983220168?text=Hola%20Yas%26Dani%20Impresiones%2C%20quiero%20cotizar%20un%20producto%20personalizado"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-brand-hot rounded-full px-8 py-3 font-black text-lg hover:shadow-lg transition-shadow"
        >
          💬 Cotizar ahora
        </a>
      </div>
    </div>
  );
}
