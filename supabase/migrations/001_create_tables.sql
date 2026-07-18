-- =============================================
-- YAS&DANI IMPRESIONES — Migración 001
-- Creación de tablas principales
-- Ejecutar en: Supabase → SQL Editor
-- =============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CATEGORÍAS
-- =============================================
CREATE TABLE IF NOT EXISTS categorias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  descripcion TEXT,
  imagen_url  TEXT,
  orden       INT         NOT NULL DEFAULT 0,
  activo      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PRODUCTOS
-- =============================================
CREATE TABLE IF NOT EXISTS productos (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                   TEXT        NOT NULL,
  slug                     TEXT        UNIQUE NOT NULL,
  descripcion              TEXT,
  precio                   NUMERIC(10,2),
  precio_desde             BOOLEAN     NOT NULL DEFAULT false,
  stock                    INT         NOT NULL DEFAULT 0,
  stock_ilimitado          BOOLEAN     NOT NULL DEFAULT true,
  categoria_id             UUID        REFERENCES categorias(id) ON DELETE SET NULL,
  imagen_principal_url     TEXT,
  activo                   BOOLEAN     NOT NULL DEFAULT true,
  destaca                  BOOLEAN     NOT NULL DEFAULT false,
  requiere_personalizacion BOOLEAN     NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- IMÁGENES DE PRODUCTOS
-- =============================================
CREATE TABLE IF NOT EXISTS imagenes_productos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID        NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  url         TEXT        NOT NULL,
  alt         TEXT,
  orden       INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- CLIENTES
-- =============================================
CREATE TABLE IF NOT EXISTS clientes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT        NOT NULL,
  email      TEXT        UNIQUE,
  telefono   TEXT,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PEDIDOS
-- =============================================
CREATE TABLE IF NOT EXISTS pedidos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID        REFERENCES clientes(id) ON DELETE SET NULL,
  estado     TEXT        NOT NULL DEFAULT 'pendiente'
             CONSTRAINT pedidos_estado_check
             CHECK (estado IN ('pendiente','confirmado','en_proceso','enviado','entregado','cancelado')),
  total      NUMERIC(10,2) NOT NULL,
  notas      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ITEMS DE PEDIDO
-- =============================================
CREATE TABLE IF NOT EXISTS pedido_items (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id             UUID          NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id           UUID          REFERENCES productos(id) ON DELETE SET NULL,
  nombre_producto       TEXT          NOT NULL,
  precio_unitario       NUMERIC(10,2) NOT NULL,
  cantidad              INT           NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  notas_personalizacion TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================
-- ARCHIVOS SUBIDOS POR CLIENTES
-- =============================================
CREATE TABLE IF NOT EXISTS archivos_cliente (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id UUID        REFERENCES pedido_items(id) ON DELETE CASCADE,
  cliente_id     UUID        REFERENCES clientes(id) ON DELETE SET NULL,
  nombre_archivo TEXT        NOT NULL,
  url            TEXT        NOT NULL,
  tipo           TEXT,
  tamano_bytes   BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PAGOS
-- =============================================
CREATE TABLE IF NOT EXISTS pagos (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   UUID          NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  proveedor   TEXT          NOT NULL DEFAULT 'mercadopago',
  monto       NUMERIC(10,2) NOT NULL,
  moneda      TEXT          NOT NULL DEFAULT 'CLP',
  estado      TEXT          NOT NULL DEFAULT 'pendiente'
              CONSTRAINT pagos_estado_check
              CHECK (estado IN ('pendiente','aprobado','rechazado','reembolsado')),
  external_id TEXT,
  datos_pago  JSONB,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================
-- ÍNDICES DE RENDIMIENTO
-- =============================================
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_activo    ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_slug      ON productos(slug);
CREATE INDEX IF NOT EXISTS idx_productos_destaca   ON productos(destaca) WHERE destaca = true;
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente     ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado      ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_archivos_item       ON archivos_cliente(pedido_item_id);
CREATE INDEX IF NOT EXISTS idx_archivos_cliente    ON archivos_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido        ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_external      ON pagos(external_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email      ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_user       ON clientes(user_id);

-- =============================================
-- TRIGGER: Actualiza updated_at automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pagos_updated_at
  BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
