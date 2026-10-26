import type { FastifyPluginAsync } from 'fastify';
import { InvalidWebhookSignatureError, MercadoPagoConfig, Payment, Preference, WebhookSignatureValidator } from 'mercadopago';
import { z } from 'zod';
import { supabase } from '../plugins/supabase';

const preferenceSchema = z.object({
  pedido_id: z.string().uuid(),
  access_token: z.string().uuid(),
});

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
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
    const hasPublicFrontend = isPublicHttpsUrl(frontendUrl);
    const hasPublicBackend = isPublicHttpsUrl(backendUrl);
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
        ...(hasPublicFrontend ? {
          back_urls: {
            success: `${frontendUrl}/pago/exito?pedido=${order.id}`,
            failure: `${frontendUrl}/pago/error?pedido=${order.id}`,
            pending: `${frontendUrl}/pago/pendiente?pedido=${order.id}`,
          },
          auto_return: 'approved' as const,
        } : {}),
        ...(hasPublicBackend ? {
          notification_url: `${backendUrl}/api/payments/mercadopago/webhook`,
        } : {}),
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
    if (!webhookSecret?.trim() || !accessToken) {
      return reply.status(503).send({ received: false });
    }
    const xSignature = request.headers['x-signature'];
    const xRequestId = request.headers['x-request-id'];
    const dataId = (request.query as Record<string, unknown>)['data.id'];
    // Exige valores inequívocos: el SDK acepta el primer elemento de un array
    // y omite identificadores ausentes del manifiesto firmado.
    if (typeof xSignature !== 'string'
      || !/^(?:ts=\d+,\s*v1=[a-f0-9]{64}|v1=[a-f0-9]{64},\s*ts=\d+)$/.test(xSignature)
      || typeof xRequestId !== 'string' || !/^[A-Za-z0-9._-]+$/.test(xRequestId)
      || typeof dataId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(dataId)) {
      return reply.status(401).send({ received: false });
    }
    try {
      WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId, secret: webhookSecret });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        return reply.status(401).send({ received: false });
      }
      fastify.log.error('No se pudo verificar la firma del webhook');
      return reply.status(500).send({ received: false });
    }
    const body = request.body as { type?: string; data?: { id?: string | number } } | undefined;
    if (body?.type !== 'payment') return reply.send({ received: true });
    const bodyId = body.data?.id;
    if ((typeof bodyId !== 'string' && !(typeof bodyId === 'number' && Number.isSafeInteger(bodyId)))
      || String(bodyId).toLowerCase() !== dataId.toLowerCase()) {
      return reply.status(401).send({ received: false });
    }
    try {
      const payment = await new Payment(client).get({ id: dataId.toLowerCase() });
      const orderId = payment.external_reference;
      if (!orderId) return reply.send({ received: true });
      const { data: order, error: orderError } = await supabase.from('orders').select('id,total,payment_status').eq('id', orderId).single();
      if (orderError && orderError.code !== 'PGRST116') throw orderError;
      if (!order || Number(payment.transaction_amount) !== Number(order.total) || payment.currency_id !== 'CLP') {
        fastify.log.warn({ orderId, paymentId: payment.id }, 'Pago rechazado por inconsistencia');
        return reply.send({ received: true });
      }
      const paymentStatus = payment.status === 'approved' ? 'aprobado'
        : payment.status === 'rejected' ? 'rechazado' : 'pendiente';
      if (order.payment_status !== paymentStatus) {
        const { data: updatedOrder, error: updateError } = await supabase.from('orders').update({
          payment_status: paymentStatus,
          status: paymentStatus === 'aprobado' ? 'pagado' : undefined,
          mp_payment_id: String(payment.id),
        }).eq('id', orderId).select('id').single();
        if (updateError) throw updateError;
        if (!updatedOrder) throw new Error('No se pudo confirmar la actualización del pedido');
      }
      return reply.send({ received: true });
    } catch (error) {
      fastify.log.error(error, 'Error procesando webhook');
      return reply.status(500).send({ received: false });
    }
  });
};

export default paymentsRoutes;
