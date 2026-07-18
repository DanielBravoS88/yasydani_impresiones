-- =============================================
-- YAS&DANI IMPRESIONES — Datos Semilla (seed.sql)
-- Ejecutar DESPUÉS de las migraciones 001 y 002
-- =============================================

-- =============================================
-- CATEGORÍAS INICIALES
-- =============================================
INSERT INTO categorias (nombre, slug, descripcion, orden, activo) VALUES
  ('Agendas',                'agendas',   'Agendas personalizadas para guardar citas, recuerdos y momentos especiales',      1, true),
  ('Cuadros personalizados', 'cuadros',   'Cuadros con fotos, frases y diseños únicos a pedido para regalar o decorar',      2, true),
  ('Álbumes',                'albumes',   'Álbumes para guardar tus fotos y recuerdos más preciados',                        3, true),
  ('Tazones',                'tazones',   'Tazones personalizados con fotos, frases o diseños especiales',                   4, true),
  ('Copas',                  'copas',     'Copas grabadas para momentos y celebraciones especiales',                         5, true),
  ('Fotos instantáneas',     'fotos',     'Impresiones instantáneas de alta calidad para cualquier ocasión',                 6, true),
  ('Regalos personalizados', 'regalos',   'Regalos únicos diseñados especialmente con tus fotos y colores favoritos',        7, true)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- PRODUCTOS INICIALES
-- =============================================
INSERT INTO productos (
  nombre, slug, descripcion, precio, precio_desde,
  categoria_id, activo, destaca, requiere_personalizacion
)
SELECT
  p.nombre, p.slug, p.descripcion, p.precio, p.precio_desde,
  (SELECT id FROM categorias WHERE slug = p.cat_slug),
  true, p.destaca, p.req_person
FROM (VALUES
  (
    '100 Citas con mi hija',
    '100-citas-con-mi-hija',
    'Agenda personalizada para guardar citas, fotos y recuerdos entre papá/mamá e hija. Un regalo lleno de amor que se atesora para siempre.',
    18990.00, false, 'agendas', true, false
  ),
  (
    'Papá, cuéntame tu historia',
    'papa-cuentame-tu-historia',
    'Libro especial para conservar recuerdos, preguntas, historias y el legado familiar de papá. Ideal para el Día del Padre.',
    12990.00, false, 'agendas', true, false
  ),
  (
    '100 Aventuras con mi hijo',
    '100-aventuras-con-mi-hijo',
    'Un regalo lleno de aventuras, frases y espacios para fotos inolvidables junto a tu hijo.',
    12990.00, false, 'agendas', false, false
  ),
  (
    'Mamá, cuéntame tu historia',
    'mama-cuentame-tu-historia',
    'Diseño tierno y romántico para que mamá guarde su vida, recuerdos y todo el amor que entrega. Perfecto para el Día de la Madre.',
    12990.00, false, 'agendas', true, false
  ),
  (
    '100 Citas juntos',
    '100-citas-juntos',
    'Libro para parejas con momentos especiales, citas, fotos y recuerdos que los unen para siempre.',
    12990.00, false, 'agendas', false, false
  ),
  (
    '100 Citas en familia',
    '100-citas-en-familia',
    'Álbum familiar para vivir experiencias increíbles y guardar memorias con todo el amor del mundo.',
    12990.00, false, 'agendas', false, false
  ),
  (
    '100 Momentos antes de tu llegada',
    '100-momentos-antes-de-tu-llegada',
    'Libro para embarazo: recuerdos, emociones y la espera más hermosa documentada con amor y detalles únicos.',
    18990.00, false, 'agendas', true, false
  ),
  (
    'Cuadro personalizado',
    'cuadro-personalizado',
    'Cuadros con tus fotos, frases y diseños a pedido. Perfectos para regalar o decorar tu espacio con un toque único.',
    7000.00, true, 'cuadros', true, true
  ),
  (
    'Regalo personalizado especial',
    'regalo-personalizado-especial',
    'Creamos diseños únicos con tus fotos, nombres, colores y estilo favorito. Cotiza por WhatsApp y te hacemos una propuesta.',
    NULL, true, 'regalos', true, true
  )
) AS p(nombre, slug, descripcion, precio, precio_desde, cat_slug, destaca, req_person)
ON CONFLICT (slug) DO NOTHING;
