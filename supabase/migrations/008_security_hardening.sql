-- Endurecimiento adicional de permisos y funciones sensibles.
-- Ejecutar después de 007_normalize_application_permissions.sql.

-- Los pedidos se crean exclusivamente a través del backend, que recalcula
-- precios y valida disponibilidad usando service_role.
REVOKE INSERT ON TABLE public.orders FROM authenticated;
DROP POLICY IF EXISTS "orders_own_insert" ON public.orders;

-- Un usuario autenticado solo puede subir archivos dentro de su propia carpeta.
DROP POLICY IF EXISTS "client_uploads_insert" ON storage.objects;
CREATE POLICY "client_uploads_own_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Evita resolución de objetos mediante esquemas manipulables en funciones que
-- se ejecutan con privilegios del propietario.
ALTER FUNCTION public.handle_new_user()
  SET search_path = public, auth;
ALTER FUNCTION public.handle_order_payment()
  SET search_path = public, auth;
ALTER FUNCTION public.is_admin()
  SET search_path = public, auth;
ALTER FUNCTION public.prevent_profile_role_change()
  SET search_path = public, auth;

-- Las funciones de trigger no deben poder invocarse como RPC públicas.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, service_role;
GRANT EXECUTE ON FUNCTION public.handle_order_payment() TO service_role;

-- is_admin() participa en políticas RLS y debe seguir disponible para los roles
-- que consultan datos protegidos, pero no para PUBLIC de forma implícita.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prevent_profile_role_change() TO authenticated, service_role;
