import type { FastifyPluginAsync } from 'fastify';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { z } from 'zod';
import { supabase } from '../plugins/supabase';

const preferenceSchema = z.object({
  pedido_id: z.string().uuid(),
  access_token: z.string().uuid(),
});

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) fastify.log.warn('Mercado Pago no está configurado');
  const client = new MercadoPagoConfig({ accessToken: accessToken ?? 'NOT_CONFIGURED' });

  fastify.post('/payments/mercadopago/create-preference', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    if (!accessToken) return reply.status(503).send({ success: false, error: 'Pagos no configurados' });
    const parsed = preferenceSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Solicitud inválida' });

    const { data: order } = await supabase
      .from('orders')
      .select('id,order_number,status,payment_status,total,customer_name,customer_email,access_token,items:order_items(*)')
      .eq('id', parsed.data.pedido_id)
      .eq('access_token', parsed.data.access_token)
      .single();
    if (!order) return reply.status(404).send({ success: false, error: 'Pedido no encontrado' });
    if (order.status === 'cancelado' || order.payment_status === 'aprobado') {
      return reply.status(409).send({ success: false, error: 'El pedido no admite un nuevo pago' });
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
    try {
      const response = await new Preference(client).create({ body: {
        items: order.items.map((item: { id: string; product_name: string; quantity: number; unit_price: number }) => ({
          id: item.id,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          currency_id: 'CLP',
        })),
        payer: order.customer_email ? { email: order.customer_email, name: order.customer_name } : undefined,
        back_urls: {
          success: `${frontendUrl}/pago/exito?pedido=${order.id}`,
          failure: `${frontendUrl}/pago/error?pedido=${order.id}`,
          pending: `${frontendUrl}/pago/pendiente?pedido=${order.id}`,
        },
        auto_return: 'approved',
        notification_url: `${backendUrl}/api/payments/mercadopago/webhook`,
        external_reference: order.id,
        metadata: { order_number: order.order_number },
      }});
      await supabase.from('orders').update({ payment_method: 'mercadopago' }).eq('id', order.id);
      return reply.send({ success: true, data: { preference_id: response.id, init_point: response.init_point } });
    } catch (error) {
      fastify.log.error(error, 'No se pudo crear la preferencia');
      return reply.status(502).send({ success: false, error: 'No se pudo iniciar el pago' });
    }
  });

  fastify.post('/payments/mercadopago/webhook', {
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const body = request.body as { type?: string; data?: { id?: string } } | undefined;
    if (body?.type !== 'payment' || !body.data?.id || !accessToken) return reply.send({ received: true });
    try {
      const payment = await new Payment(client).get({ id: body.data.id });
      const orderId = payment.external_reference;
      if (!orderId) return reply.send({ received: true });
      const { data: order } = await supabase.from('orders').select('id,total,payment_status').eq('id', orderId).single();
      if (!order || Number(payment.transaction_amount) !== Number(order.total) || payment.currency_id !== 'CLP') {
        fastify.log.warn({ orderId, paymentId: payment.id }, 'Pago rechazado por inconsistencia');
        return reply.send({ received: true });
      }
      const paymentStatus = payment.status === 'approved' ? 'aprobado'
        : payment.status === 'rejected' ? 'rechazado' : 'pendiente';
      if (order.payment_status !== paymentStatus) {
        await supabase.from('orders').update({
          payment_status: paymentStatus,
          status: paymentStatus === 'aprobado' ? 'pagado' : undefined,
          mp_payment_id: String(payment.id),
        }).eq('id', orderId);
      }
      return reply.send({ received: true });
    } catch (error) {
      fastify.log.error(error, 'Error procesando webhook');
      return reply.status(500).send({ received: false });
    }
  });
};

export default paymentsRoutes;
