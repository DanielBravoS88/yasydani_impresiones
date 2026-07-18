-- =============================================
-- YAS&DANI IMPRESIONES — Migración 002
-- Row Level Security (RLS) — Políticas de seguridad
-- Ejecutar DESPUÉS de 001_create_tables.sql
-- =============================================

-- =============================================
-- Habilitar RLS en todas las tablas
-- =============================================
ALTER TABLE categorias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos_cliente  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos             ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CATEGORÍAS
-- Lectura pública de las activas; escritura solo service_role (backend)
-- =============================================
CREATE POLICY "categorias_public_read"
  ON categorias FOR SELECT
  USING (activo = true);

CREATE POLICY "categorias_service_all"
  ON categorias FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- PRODUCTOS
-- Lectura pública de los activos; escritura solo service_role
-- =============================================
CREATE POLICY "productos_public_read"
  ON productos FOR SELECT
  USING (activo = true);

CREATE POLICY "productos_service_all"
  ON productos FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- IMÁGENES DE PRODUCTOS
-- Lectura pública; escritura solo service_role
-- =============================================
CREATE POLICY "imagenes_public_read"
  ON imagenes_productos FOR SELECT
  USING (true);

CREATE POLICY "imagenes_service_all"
  ON imagenes_productos FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- CLIENTES
-- Cada usuario solo ve y modifica su propio perfil
-- =============================================
CREATE POLICY "clientes_own_select"
  ON clientes FOR SELECT
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "clientes_own_insert"
  ON clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "clientes_own_update"
  ON clientes FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "clientes_service_delete"
  ON clientes FOR DELETE
  USING (auth.role() = 'service_role');

-- =============================================
-- PEDIDOS
-- Cliente ve sus propios pedidos; backend gestiona todos
-- =============================================
CREATE POLICY "pedidos_own_select"
  ON pedidos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clientes
      WHERE clientes.id = pedidos.cliente_id
        AND clientes.user_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "pedidos_service_all"
  ON pedidos FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- ITEMS DE PEDIDO
-- Cliente ve los items de sus propios pedidos
-- =============================================
CREATE POLICY "pedido_items_own_select"
  ON pedido_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pedidos
      JOIN clientes ON clientes.id = pedidos.cliente_id
      WHERE pedidos.id = pedido_items.pedido_id
        AND clientes.user_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "pedido_items_service_all"
  ON pedido_items FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- ARCHIVOS DE CLIENTES
-- Solo el dueño del archivo puede leerlo; subida y gestión por service_role
-- =============================================
CREATE POLICY "archivos_own_select"
  ON archivos_cliente FOR SELECT
  USING (
    auth.uid() = (
      SELECT user_id FROM clientes WHERE id = archivos_cliente.cliente_id
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "archivos_service_all"
  ON archivos_cliente FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- PAGOS
-- Cliente ve los pagos de sus propios pedidos
-- =============================================
CREATE POLICY "pagos_own_select"
  ON pagos FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM pedidos
      JOIN clientes ON clientes.id = pedidos.cliente_id
      WHERE pedidos.id = pagos.pedido_id
        AND clientes.user_id = auth.uid()
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "pagos_service_all"
  ON pagos FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================
-- STORAGE — Buckets (ejecutar en el SQL Editor de Supabase)
-- =============================================

-- Bucket público para imágenes de productos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Bucket privado para archivos subidos por clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-uploads',
  'client-uploads',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Política Storage: lectura pública de imágenes de productos
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Política Storage: solo service_role sube imágenes de productos
CREATE POLICY "product_images_service_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'service_role');

-- Política Storage: service_role actualiza/elimina imágenes de productos
CREATE POLICY "product_images_service_manage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-images' AND auth.role() = 'service_role');

-- Política Storage: cliente autenticado o service_role puede subir archivos
CREATE POLICY "client_uploads_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-uploads'
    AND (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

-- Política Storage: cliente solo ve su propia carpeta (carpeta = su user_id)
CREATE POLICY "client_uploads_own_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-uploads'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR auth.role() = 'service_role'
    )
  );

-- Política Storage: service_role gestiona todos los archivos de clientes
CREATE POLICY "client_uploads_service_all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'client-uploads' AND auth.role() = 'service_role');
