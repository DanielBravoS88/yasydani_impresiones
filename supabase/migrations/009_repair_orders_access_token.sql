-- Repara instalaciones donde 004 no agregó el token privado de acceso al pedido.
-- Es idempotente: puede ejecutarse aunque la columna o los índices ya existan.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS access_token UUID;

UPDATE public.orders
SET access_token = gen_random_uuid()
WHERE access_token IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN access_token SET DEFAULT gen_random_uuid(),
  ALTER COLUMN access_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_access_token
  ON public.orders(access_token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_mp_payment_id
  ON public.orders(mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;
