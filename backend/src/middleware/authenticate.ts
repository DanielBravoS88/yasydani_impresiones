import { createClient } from '@supabase/supabase-js';
import type { FastifyRequest, FastifyReply } from 'fastify';

const SUPABASE_URL      = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Verifica que el header Authorization contenga un JWT válido de Supabase.
 * Adjunta el user a request.authUser.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: 'No autorizado' });
  }

  const token  = authHeader.slice(7);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);

  if (error || !user) {
    return reply.status(401).send({ success: false, error: 'Token inválido o expirado' });
  }
  (request as any).authUser = user;
}

/**
 * Verifica que el usuario autenticado tenga rol 'administrador'.
 * Usa service_role para leer la tabla profiles sin restricciones de RLS.
 */
export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;

  const user        = (request as any).authUser;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    request.log.error({ code: profileError.code, message: profileError.message }, 'No se pudo consultar el rol administrativo');
    return reply.status(500).send({
      success: false,
      error: profileError.message.includes('permission denied')
        ? 'El backend no tiene permisos para consultar perfiles. Ejecuta la migración 005.'
        : 'No se pudo verificar el rol administrativo',
    });
  }

  if (!profile || profile.role !== 'administrador') {
    return reply.status(403).send({ success: false, error: 'Acceso denegado: se requiere rol administrador' });
  }

  (request as any).adminUser = user;
}
