import { randomUUID } from 'crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { supabase } from '../plugins/supabase';

const createOrderSchema = z.object({
  cliente: z.object({
    nombre: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254).optional(),
    telefono: z.string().trim().max(30).optional(),
  }),
  items: z.array(z.object({
    producto_id: z.string().uuid(),
    cantidad: z.number().int().min(1).max(50),
    notas_personalizacion: z.string().trim().max(2000).optional(),
  })).min(1).max(30),
  notas: z.string().trim().max(2000).optional(),
});

async function optionalUser(request: FastifyRequest) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orders', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Datos del pedido inválidos' });

    const user = await optionalUser(request);
    const uniqueIds = [...new Set(parsed.data.items.map(item => item.producto_id))];
    const { data: products, error: productError } = await supabase
      .from('productos')
      .select('id,nombre,precio,precio_oferta,imagen_principal_url,stock,stock_ilimitado,activo')
      .in('id', uniqueIds)
      .eq('activo', true);

    if (productError || !products || products.length !== uniqueIds.length) {
      return reply.status(400).send({ success: false, error: 'Uno o más productos no están disponibles' });
    }

    const byId = new Map(products.map(product => [product.id, product]));
    const items = parsed.data.items.map(item => {
      const product = byId.get(item.producto_id)!;
      const unitPrice = Number(product.precio_oferta ?? product.precio);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error('Producto sin precio válido');
      if (!product.stock_ilimitado && product.stock < item.cantidad) throw new Error(`Stock insuficiente para ${product.nombre}`);
      return {
        product_id: product.id,
        product_name: product.nombre,
        product_image: product.imagen_principal_url,
        quantity: item.cantidad,
        unit_price: unitPrice,
        total_price: unitPrice * item.cantidad,
        personalization_details: item.notas_personalizacion ?? null,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const accessToken = randomUUID();
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id: user?.id ?? null,
      customer_name: parsed.data.cliente.nombre,
      customer_email: parsed.data.cliente.email ?? user?.email ?? null,
      customer_phone: parsed.data.cliente.telefono ?? null,
      notes: parsed.data.notas ?? null,
      subtotal,
      total: subtotal,
      access_token: accessToken,
    }).select('id,order_number,status,payment_status,total,created_at').single();

    if (orderError || !order) {
      fastify.log.error(orderError, 'No se pudo crear el pedido');
      return reply.status(500).send({ success: false, error: 'No se pudo crear el pedido' });
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map(item => ({ ...item, order_id: order.id })),
    );
    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      fastify.log.error(itemsError, 'No se pudieron crear los items');
      return reply.status(500).send({ success: false, error: 'No se pudo completar el pedido' });
    }

    return reply.status(201).send({ success: true, data: { ...order, access_token: accessToken } });
  });

  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { token } = request.query as { token?: string };
    const user = await optionalUser(request);
    const { data: order } = await supabase
      .from('orders')
      .select('*,items:order_items(*)')
      .eq('id', id)
      .single();
    if (!order || (order.user_id !== user?.id && order.access_token !== token)) {
      return reply.status(404).send({ success: false, error: 'Pedido no encontrado' });
    }
    const safeOrder = { ...order };
    delete safeOrder.access_token;
    return reply.send({ success: true, data: safeOrder });
  });
};

export default ordersRoutes;
