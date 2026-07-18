-- Unifica el flujo activo en orders/order_items y corrige privilegios críticos.
-- Revisar y ejecutar manualmente después de 003_auth_admin.sql.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_token UUID;
UPDATE orders SET access_token = gen_random_uuid() WHERE access_token IS NULL;
ALTER TABLE orders ALTER COLUMN access_token SET DEFAULT gen_random_uuid();
ALTER TABLE orders ALTER COLUMN access_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_access_token ON orders(access_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_mp_payment_id
  ON orders(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- Un cliente jamás puede promoverse modificando su perfil directamente.
CREATE OR REPLACE FUNCTION prevent_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'No está permitido modificar el rol';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_profile_role ON profiles;
CREATE TRIGGER protect_profile_role
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_change();

DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'cliente');

-- Las tablas antiguas quedan sin uso por la aplicación. No se eliminan aquí para
-- evitar pérdida accidental de datos locales; migrar/verificar y retirarlas en
-- una migración posterior explícita: clientes, pedidos, pedido_items, pagos y archivos_cliente.
