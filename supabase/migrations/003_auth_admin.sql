-- =============================================
-- YAS&DANI IMPRESIONES — Migración 003
-- Auth, Perfiles, Pedidos, Stock, Auditoría
-- Ejecutar DESPUÉS de 001 y 002
-- =============================================

-- =============================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PERFILES DE USUARIO (vinculados a auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     TEXT        NOT NULL DEFAULT '',
  apellido   TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  telefono   TEXT,
  direccion  TEXT,
  comuna     TEXT,
  ciudad     TEXT,
  region     TEXT,
  role       TEXT        NOT NULL DEFAULT 'cliente'
             CONSTRAINT profiles_role_check CHECK (role IN ('cliente','administrador')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Trigger: crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, apellido, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.email, ''),
    'cliente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- EXTENDER TABLA PRODUCTOS (nuevas columnas)
-- =============================================
ALTER TABLE productos ADD COLUMN IF NOT EXISTS sku                       TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_oferta             NUMERIC(10,2);
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo              INT DEFAULT 5;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tiempo_preparacion        TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS etiquetas                 TEXT[];
ALTER TABLE productos ADD COLUMN IF NOT EXISTS opciones_personalizacion  TEXT;

-- Trigger updated_at para productos (si no existe)
DROP TRIGGER IF EXISTS set_productos_updated_at ON productos;
CREATE TRIGGER set_productos_updated_at
BEFORE UPDATE ON productos
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================
-- ÓRDENES
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT        UNIQUE NOT NULL DEFAULT (
    'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::TEXT, 1, 6))
  ),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'pendiente'
                   CONSTRAINT orders_status_check
                   CHECK (status IN ('pendiente','pagado','en_preparacion','listo_para_entrega','enviado','entregado','cancelado')),
  payment_status   TEXT        NOT NULL DEFAULT 'pendiente'
                   CONSTRAINT orders_payment_check
                   CHECK (payment_status IN ('pendiente','aprobado','rechazado','reembolsado')),
  payment_method   TEXT,
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_total   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  customer_name    TEXT,
  customer_email   TEXT,
  customer_phone   TEXT,
  shipping_address TEXT,
  shipping_comuna  TEXT,
  shipping_city    TEXT,
  shipping_region  TEXT,
  notes            TEXT,
  mp_payment_id    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================
-- ITEMS DE ÓRDENES
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id              UUID        REFERENCES productos(id) ON DELETE SET NULL,
  product_name            TEXT        NOT NULL,
  product_image           TEXT,
  quantity                INT         NOT NULL DEFAULT 1,
  unit_price              NUMERIC(10,2) NOT NULL,
  total_price             NUMERIC(10,2) NOT NULL,
  personalization_details TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- MOVIMIENTOS DE STOCK
-- =============================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL
                 CONSTRAINT stock_type_check
                 CHECK (type IN ('entrada','salida','ajuste','venta','cancelacion')),
  quantity       INT         NOT NULL,
  previous_stock INT         NOT NULL,
  new_stock      INT         NOT NULL,
  reason         TEXT,
  order_id       UUID        REFERENCES orders(id) ON DELETE SET NULL,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- AUDITORÍA DE ADMINISTRADOR
-- =============================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  entity_type   TEXT        NOT NULL,
  entity_id     TEXT,
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TRIGGER: descontar/restaurar stock al cambiar estado de pago
-- =============================================
CREATE OR REPLACE FUNCTION handle_order_payment()
RETURNS TRIGGER AS $$
DECLARE
  item        RECORD;
  curr_stock  INT;
BEGIN
  -- Descontar stock cuando el pago se aprueba
  IF NEW.payment_status = 'aprobado' AND OLD.payment_status <> 'aprobado' THEN
    FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
      IF item.product_id IS NOT NULL THEN
        SELECT stock, stock_ilimitado INTO curr_stock FROM productos WHERE id = item.product_id;
        IF NOT (SELECT stock_ilimitado FROM productos WHERE id = item.product_id) THEN
          IF curr_stock - item.quantity < 0 THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto %', item.product_name;
          END IF;
          UPDATE productos SET stock = stock - item.quantity WHERE id = item.product_id;
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, order_id)
          VALUES (item.product_id, 'venta', item.quantity, curr_stock, curr_stock - item.quantity,
                  'Venta confirmada — orden ' || NEW.order_number, NEW.id);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Restaurar stock cuando se cancela una orden ya pagada
  IF NEW.status = 'cancelado' AND OLD.status <> 'cancelado' AND OLD.payment_status = 'aprobado' THEN
    FOR item IN SELECT * FROM order_items WHERE order_id = NEW.id LOOP
      IF item.product_id IS NOT NULL THEN
        SELECT stock INTO curr_stock FROM productos WHERE id = item.product_id;
        IF NOT (SELECT stock_ilimitado FROM productos WHERE id = item.product_id) THEN
          UPDATE productos SET stock = stock + item.quantity WHERE id = item.product_id;
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, order_id)
          VALUES (item.product_id, 'cancelacion', item.quantity, curr_stock, curr_stock + item.quantity,
                  'Cancelación — orden ' || NEW.order_number, NEW.id);
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_payment_change ON orders;
CREATE TRIGGER on_order_payment_change
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION handle_order_payment();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes_productos ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar rol admin (evitar subconsultas lentas)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'administrador'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: cliente solo ve/edita su propio perfil; admin todo
DROP POLICY IF EXISTS "profiles_own_read"   ON profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"  ON profiles;
CREATE POLICY "profiles_own_read"   ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all"  ON profiles FOR ALL USING (is_admin());

-- PRODUCTOS: lectura pública para activos; escritura solo admin
DROP POLICY IF EXISTS "productos_public_read" ON productos;
DROP POLICY IF EXISTS "productos_admin_all"   ON productos;
CREATE POLICY "productos_public_read" ON productos FOR SELECT USING (activo = true OR is_admin());
CREATE POLICY "productos_admin_all"   ON productos FOR ALL USING (is_admin());

-- CATEGORÍAS: lectura pública; escritura solo admin
DROP POLICY IF EXISTS "categorias_public_read" ON categorias;
DROP POLICY IF EXISTS "categorias_admin_all"   ON categorias;
CREATE POLICY "categorias_public_read" ON categorias FOR SELECT USING (activo = true OR is_admin());
CREATE POLICY "categorias_admin_all"   ON categorias FOR ALL USING (is_admin());

-- IMAGENES_PRODUCTOS: lectura pública; escritura solo admin
DROP POLICY IF EXISTS "imagenes_public_read" ON imagenes_productos;
DROP POLICY IF EXISTS "imagenes_admin_all"   ON imagenes_productos;
CREATE POLICY "imagenes_public_read" ON imagenes_productos FOR SELECT USING (true);
CREATE POLICY "imagenes_admin_all"   ON imagenes_productos FOR ALL USING (is_admin());

-- ORDERS: cliente solo ve los suyos; admin todo
DROP POLICY IF EXISTS "orders_own_read"   ON orders;
DROP POLICY IF EXISTS "orders_own_insert" ON orders;
DROP POLICY IF EXISTS "orders_admin_all"  ON orders;
CREATE POLICY "orders_own_read"   ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "orders_own_insert" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders_admin_all"  ON orders FOR ALL USING (is_admin());

-- ORDER_ITEMS: cliente ve los de sus órdenes; admin todo
DROP POLICY IF EXISTS "order_items_own_read" ON order_items;
DROP POLICY IF EXISTS "order_items_admin_all" ON order_items;
CREATE POLICY "order_items_own_read" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "order_items_admin_all" ON order_items FOR ALL USING (is_admin());

-- STOCK y AUDIT: solo admin
DROP POLICY IF EXISTS "stock_admin_all" ON stock_movements;
DROP POLICY IF EXISTS "audit_admin_all" ON admin_audit_logs;
CREATE POLICY "stock_admin_all" ON stock_movements FOR ALL USING (is_admin());
CREATE POLICY "audit_admin_all" ON admin_audit_logs FOR ALL USING (is_admin());

-- =============================================
-- STORAGE: bucket product-images
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "product_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_upload" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;

CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "product_images_admin_upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "product_images_admin_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "product_images_admin_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND is_admin());
