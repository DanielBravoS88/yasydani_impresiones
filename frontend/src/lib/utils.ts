/**
 * Formatea un precio en pesos chilenos.
 * Si el valor es null/undefined, devuelve "Cotizar".
 */
export function formatPrice(price?: number | null, desde = false): string {
  if (price == null) return 'Cotizar';
  const formatted = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price);
  return desde ? `Desde ${formatted}` : formatted;
}

/**
 * Trunca un texto a n caracteres y agrega "...".
 */
export function truncate(text: string, n: number): string {
  return text.length > n ? `${text.slice(0, n)}…` : text;
}

/**
 * Genera la URL de WhatsApp para cotizar un producto.
 */
export function buildWhatsAppUrl(productName: string): string {
  const phone = '56983220168';
  const msg = encodeURIComponent(
    `Hola Yas&Dani Impresiones, quiero cotizar: ${productName}`
  );
  return `https://wa.me/${phone}?text=${msg}`;
}

/**
 * Construye la URL completa de imagen en Supabase Storage.
 */
export function getSupabaseImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return `${base}/storage/v1/object/public/product-images/${path}`;
}

/**
 * Genera un slug seguro a partir de un texto.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
