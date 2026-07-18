-- Permite administrar roles desde SQL Editor (postgres/supabase_admin),
-- manteniendo bloqueados los cambios solicitados por clientes autenticados.

CREATE OR REPLACE FUNCTION prevent_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND session_user NOT IN ('postgres', 'supabase_admin')
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'No está permitido modificar el rol';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
