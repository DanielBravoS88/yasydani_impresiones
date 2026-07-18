import type { FastifyPluginAsync } from 'fastify';
import { supabase } from '../plugins/supabase';

function normalizeSearch(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const productsRoutes: FastifyPluginAsync = async (fastify) => {

  /**
   * GET /api/products
   * Devuelve todos los productos activos.
   * Query params: categoria (slug), destacado (true/false), q (búsqueda)
   */
  fastify.get('/products', async (request, reply) => {
    const { categoria, destacado, q } = request.query as {
      categoria?: string;
      destacado?: string;
      q?: string;
    };

    let query = supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(id, nombre, slug),
        imagenes:imagenes_productos(id, url, alt, orden)
      `)
      .eq('activo', true)
      .order('destaca', { ascending: false })
      .order('created_at', { ascending: false });

    if (categoria) {
      // Filtra por slug de categoría
      query = query.eq('categorias.slug', categoria);
    }

    if (destacado === 'true') {
      query = query.eq('destaca', true);
    }

    const { data, error } = await query;

    if (error) {
      fastify.log.error(error, 'Error al obtener productos');
      return reply.status(500).send({ success: false, error: 'Error al obtener productos' });
    }

    let products = data ?? [];
    if (q?.trim()) {
      const terms = normalizeSearch(q).split(/\s+/).filter(Boolean);
      products = products.filter((product: any) => {
        const searchable = normalizeSearch([
          product.nombre, product.descripcion, product.slug, product.sku, product.categoria?.nombre,
        ].join(' '));
        return terms.every(term => searchable.includes(term));
      });
    }

    return reply.send({ success: true, data: products });
  });

  /**
   * GET /api/products/:id
   * Devuelve un producto por id (UUID) o slug.
   */
  fastify.get<{ Params: { id: string } }>('/products/:id', async (request, reply) => {
    const { id } = request.params;

    if (!id?.trim()) {
      return reply.status(400).send({ success: false, error: 'ID o slug requerido' });
    }

    let query = supabase
      .from('productos')
      .select(`
        *,
        categoria:categorias(id, nombre, slug),
        imagenes:imagenes_productos(id, url, alt, orden)
      `)
      .eq('activo', true);

    query = UUID_PATTERN.test(id) ? query.eq('id', id) : query.eq('slug', id);
    const { data, error } = await query.single();

    if (error || !data) {
      return reply.status(404).send({ success: false, error: 'Producto no encontrado' });
    }

    return reply.send({ success: true, data });
  });

  /**
   * GET /api/categories
   * Devuelve todas las categorías activas.
   */
  fastify.get('/categories', async (_request, reply) => {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      fastify.log.error(error, 'Error al obtener categorías');
      return reply.status(500).send({ success: false, error: 'Error al obtener categorías' });
    }

    return reply.send({ success: true, data: data ?? [] });
  });
};

export default productsRoutes;
