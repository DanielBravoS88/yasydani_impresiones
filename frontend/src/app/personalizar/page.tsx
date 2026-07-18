'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function PersonalizarPage() {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    categoria: '',
    descripcion: '',
    mensaje: '',
  });
  const [files, setFiles]   = useState<File[]>([]);
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Construye mensaje de WhatsApp con los datos del formulario
    const msg = encodeURIComponent(
      `Hola Yas&Dani Impresiones! Quiero personalizar un producto:\n\n` +
      `Nombre: ${form.nombre}\n` +
      `Categoría: ${form.categoria}\n` +
      `Descripción: ${form.descripcion}\n` +
      `Mensaje/detalle: ${form.mensaje}\n` +
      `Teléfono: ${form.telefono}\n` +
      `Email: ${form.email}`
    );
    window.open(`https://wa.me/56983220168?text=${msg}`, '_blank');
    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="text-7xl">🎉</div>
        <h1 className="font-pacifico text-3xl text-brand-pink">¡Mensaje enviado!</h1>
        <p className="text-brand-text/70 font-bold">
          Te redirigimos a WhatsApp. Nos pondremos en contacto contigo a la brevedad 💖
        </p>
        <Button variant="primary" onClick={() => setSent(false)}>
          Hacer otra consulta
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="font-pacifico text-4xl text-brand-pink mb-2">Personaliza tu pedido</h1>
        <p className="text-brand-text/70 font-bold">
          Cuéntanos qué quieres y creamos algo único para ti ✨
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-[28px] shadow-brand p-8 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-black text-sm text-brand-text mb-1">Nombre *</label>
            <input
              required
              type="text"
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              placeholder="Tu nombre"
              className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
            />
          </div>
          <div>
            <label className="block font-black text-sm text-brand-text mb-1">Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => update('telefono', e.target.value)}
              placeholder="+56 9 0000 0000"
              className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
            />
          </div>
        </div>

        <div>
          <label className="block font-black text-sm text-brand-text mb-1">Correo electrónico</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="tu@correo.cl"
            className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink"
          />
        </div>

        <div>
          <label className="block font-black text-sm text-brand-text mb-1">Categoría / Tipo de producto *</label>
          <select
            required
            value={form.categoria}
            onChange={(e) => update('categoria', e.target.value)}
            className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink bg-white"
          >
            <option value="">Selecciona una categoría</option>
            <option>Agendas</option>
            <option>Cuadros personalizados</option>
            <option>Álbumes</option>
            <option>Tazones</option>
            <option>Copas</option>
            <option>Fotos instantáneas</option>
            <option>Regalos personalizados</option>
          </select>
        </div>

        <div>
          <label className="block font-black text-sm text-brand-text mb-1">Descripción del producto *</label>
          <textarea
            required
            rows={3}
            value={form.descripcion}
            onChange={(e) => update('descripcion', e.target.value)}
            placeholder="¿Qué producto quieres? Describe tamaño, colores, cantidad, etc."
            className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink resize-none"
          />
        </div>

        <div>
          <label className="block font-black text-sm text-brand-text mb-1">Mensaje o detalle especial</label>
          <textarea
            rows={3}
            value={form.mensaje}
            onChange={(e) => update('mensaje', e.target.value)}
            placeholder="Nombre, fecha, frase, dedicatoria, colores favoritos..."
            className="w-full border-2 border-brand-pink2 rounded-[14px] px-4 py-2.5 text-sm outline-none focus:border-brand-pink resize-none"
          />
        </div>

        {/* Subir fotos de referencia */}
        <div className="border-2 border-dashed border-brand-aqua bg-[#effffc] rounded-[18px] p-4">
          <p className="font-black text-sm text-brand-text mb-2">📎 Fotos de referencia (opcional)</p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="text-xs w-full"
          />
          {files.length > 0 && (
            <p className="text-xs text-[#009e96] font-black mt-1">
              ✓ {files.length} foto(s) seleccionada(s) — las enviaremos por WhatsApp
            </p>
          )}
        </div>

        <Button variant="primary" fullWidth size="lg" type="submit" disabled={loading}>
          {loading ? 'Enviando...' : '💬 Enviar consulta por WhatsApp'}
        </Button>

        <p className="text-xs text-center text-brand-text/50">
          Al enviar, se abrirá WhatsApp con tu consulta. Te responderemos a la brevedad 💖
        </p>
      </form>
    </div>
  );
}
