import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import productsRoutes from './routes/products';
import ordersRoutes from './routes/orders';
import paymentsRoutes from './routes/payments';
import adminRoutes from './routes/admin';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

async function buildApp() {
  const app = Fastify({
    trustProxy: process.env.TRUST_PROXY === 'true',
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  });

  // --- Seguridad ---
  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // --- Upload de archivos ---
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } });

  // Limita abuso automatizado de rutas públicas y administrativas.
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: 'Demasiadas solicitudes. Intenta nuevamente en un momento.',
    }),
  });

  await app.register(cors, {
    origin: [FRONTEND_URL],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // --- Health check ---
  app.get('/health', async () => ({
    status: 'ok',
    service: 'yasydani-api',
    timestamp: new Date().toISOString(),
  }));

  // --- Rutas de la API ---
  await app.register(productsRoutes, { prefix: '/api' });
  await app.register(ordersRoutes,   { prefix: '/api' });
  await app.register(paymentsRoutes, { prefix: '/api' });
  await app.register(adminRoutes,    { prefix: '/api' });

  // --- Handler de errores globales ---
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const normalized = error instanceof Error ? error : new Error('Error desconocido');
    const statusCode = 'statusCode' in normalized && typeof normalized.statusCode === 'number'
      ? normalized.statusCode : 500;
    reply.status(statusCode).send({
      success: false,
      error: statusCode === 500 ? 'Error interno del servidor' : normalized.message,
    });
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🚀 Yas&Dani API corriendo en http://localhost:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
