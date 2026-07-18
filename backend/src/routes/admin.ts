import type { FastifyPluginAsync } from 'fastify';
import { supabase } from '../plugins/supabase';
import { authenticateAdmin } from '../middleware/authenticate';
import { z } from 'zod';

function normalizeSearch(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function detectImageType(buffer: Buffer): { mime: string; extension: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  nombre:                   z.string().min(1, 'El nombre es requerido'),
  slug:                     z.string().min(1, 'El slug es requerido'),
  descripcion:              z.string().optional(),
  precio:                   z.number().int().min(1).optional(),
  precio_oferta:            z.number().int().min(1).optional(),
  precio_desde:             z.boolean().default(false),
  categoria_id:             z.string().uuid().optional(),
  imagen_principal_url:     z.string().url().optional().or(z.literal('')),
  stock:                    z.number().int().min(0).default(0),
  stock_minimo:             z.number().int().min(0).default(5),
  stock_ilimitado:          z.boolean().default(false),
  sku:                      z.string().optional(),
  activo:                   z.boolean().default(true),
  destaca:                  z.boolean().default(false),
  requiere_personalizacion: z.boolean().default(false),
  tiempo_preparacion:       z.string().optional(),
  etiquetas:                z.array(z.string()).optional(),
  opciones_personalizacion: z.string().optional(),
});

const orderStatusSchema = z.object({
  status: z.enum(['pendiente','pagado','en_preparacion','listo_para_entrega','enviado','entregado','cancelado']),
});

const stockAdjustSchema = z.object({
  product_id: z.string().uuid(),
  quantity:   z.number().int(),
  reason:     z.string().min(1, 'El motivo es requerido'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logAudit(
  adminId: string, action: string, entityType: string, entityId?: string, details?: object
) {
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
}

// ─── Rutas ────────────────────────────────────────────────────────────────────

const adminRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/admin/categories', { preHandler: authenticateAdmin }, async (_req, reply) => {
    const { data, error } = await supabase
      .from('categorias')
      .select('id,nombre,slug,activo')
      .order('orden', { ascending: true });
    if (error) return reply.status(500).send({ success: false, error: 'No se pudieron cargar las categorías' });
    return reply.send({ success: true, data: data ?? [] });
  });

  // ═══════════════════════════════════════════════════════════
  // PRODUCTOS
  // ═══════════════════════════════════════════════════════════

  /** GET /api/admin/products — listar todos (con filtros) */
  fastify.get('/admin/products', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { q, categoria, activo, destacado, bajo_stock } = req.query as Record<string, string>;

    let query = supabase
      .from('productos')
      .select('*, categoria:categorias(id,nombre,slug), imagenes:imagenes_productos(id,url,alt,orden)')
      .order('created_at', { ascending: false });

    if (categoria) query = query.eq('categoria_id', categoria);
    if (activo !== undefined) query = query.eq('activo', activo === 'true');
    if (destacado === 'true') query = query.eq('destaca', true);

    const { data, error } = await query;
    if (error) return reply.status(500).send({ success: false, error: error.message });

    let result = data ?? [];
    if (q?.trim()) {
      const terms = normalizeSearch(q).split(/\s+/).filter(Boolean);
      result = result.filter((product: any) => {
        const searchable = normalizeSearch([
          product.nombre, product.descripcion, product.slug, product.sku, product.categoria?.nombre,
        ].join(' '));
        return terms.every(term => searchable.includes(term));
      });
    }
    if (bajo_stock === 'true') {
      result = result.filter((p: any) => !p.stock_ilimitado && p.stock <= (p.stock_minimo ?? 5));
    }

    return reply.send({ success: true, data: result, total: result.length });
  });

  /** POST /api/admin/products — crear producto */
  fastify.get('/admin/products/:id', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { data, error } = await supabase
      .from('productos')
      .select('*, categoria:categorias(id,nombre,slug), imagenes:imagenes_productos(id,url,alt,orden,created_at)')
      .eq('id', id)
      .single();
    if (error || !data) return reply.status(404).send({ success: false, error: 'Producto no encontrado' });
    return reply.send({ success: true, data });
  });

  fastify.post('/admin/products', { preHandler: authenticateAdmin }, async (req, reply) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.flatten().fieldErrors });
    }

    const { data, error } = await supabase
      .from('productos')
      .insert(parsed.data)
      .select('*, categoria:categorias(id,nombre,slug)')
      .single();

    if (error) return reply.status(500).send({ success: false, error: error.message });

    await logAudit((req as any).adminUser.id, 'create_product', 'productos', data.id, { nombre: data.nombre });
    return reply.status(201).send({ success: true, data });
  });

  /** PUT /api/admin/products/:id — actualizar producto */
  fastify.put('/admin/products/:id', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.flatten().fieldErrors });
    }

    const { data, error } = await supabase
      .from('productos')
      .update(parsed.data)
      .eq('id', id)
      .select('*, categoria:categorias(id,nombre,slug)')
      .single();

    if (error) return reply.status(500).send({ success: false, error: error.message });

    await logAudit((req as any).adminUser.id, 'update_product', 'productos', id, parsed.data);
    return reply.send({ success: true, data });
  });

  /** DELETE /api/admin/products/:id — desactivar producto (soft delete) */
  fastify.delete('/admin/products/:id', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id);

    if (error) return reply.status(500).send({ success: false, error: error.message });

    await logAudit((req as any).adminUser.id, 'deactivate_product', 'productos', id);
    return reply.send({ success: true, message: 'Producto desactivado' });
  });

  // ═══════════════════════════════════════════════════════════
  // IMÁGENES DE PRODUCTOS
  // ═══════════════════════════════════════════════════════════

  /** POST /api/admin/products/:id/images — subir imagen a Supabase Storage */
  fastify.post('/admin/products/:id/images', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { data: product, error: productError } = await supabase
      .from('productos')
      .select('id,imagen_principal_url')
      .eq('id', id)
      .single();
    if (productError || !product) {
      return reply.status(404).send({ success: false, error: 'Producto no encontrado' });
    }

    const data   = await req.file();
    if (!data) return reply.status(400).send({ success: false, error: 'No se recibió archivo' });

    const declaredMime = data.mimetype === 'image/jpg' ? 'image/jpeg' : data.mimetype;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(declaredMime)) {
      return reply.status(400).send({ success: false, error: 'Tipo de archivo no permitido. Solo JPG, PNG, WEBP.' });
    }

    const buffer = await data.toBuffer();
    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ success: false, error: 'Archivo muy grande. Máximo 5MB.' });
    }

    const detectedType = detectImageType(buffer);
    if (!detectedType || detectedType.mime !== declaredMime) {
      return reply.status(400).send({ success: false, error: 'El contenido del archivo no corresponde a una imagen válida.' });
    }

    const filename = `products/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${detectedType.extension}`;
    const originalName = data.filename.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200)
      || `imagen.${detectedType.extension}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filename, buffer, { contentType: detectedType.mime, upsert: false });

    if (uploadError) return reply.status(500).send({ success: false, error: uploadError.message });

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filename);

    // Registrar en tabla imagenes_productos
    const { data: imgRecord, error: dbError } = await supabase
      .from('imagenes_productos')
      .insert({ producto_id: id, url: urlData.publicUrl, alt: originalName, orden: 0 })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from('product-images').remove([filename]);
      return reply.status(500).send({ success: false, error: 'No se pudo registrar la imagen' });
    }

    if (!product.imagen_principal_url) {
      const { error: mainImageError } = await supabase
        .from('productos')
        .update({ imagen_principal_url: urlData.publicUrl })
        .eq('id', id);
      if (mainImageError) {
        fastify.log.error(mainImageError, 'No se pudo asignar la imagen principal');
      }
    }

    await logAudit((req as any).adminUser.id, 'upload_image', 'imagenes_productos', imgRecord.id, { producto_id: id });
    return reply.status(201).send({ success: true, data: imgRecord });
  });

  fastify.put('/admin/products/:id/images/:imageId/main', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { id, imageId } = req.params as { id: string; imageId: string };
    const { data: image } = await supabase.from('imagenes_productos')
      .select('id,url').eq('id', imageId).eq('producto_id', id).single();
    if (!image) return reply.status(404).send({ success: false, error: 'Imagen no encontrada' });
    const { error } = await supabase.from('productos').update({ imagen_principal_url: image.url }).eq('id', id);
    if (error) return reply.status(500).send({ success: false, error: 'No se pudo cambiar la imagen principal' });
    await logAudit((req as any).adminUser.id, 'set_main_image', 'productos', id, { image_id: imageId });
    return reply.send({ success: true, data: image });
  });

  fastify.delete('/admin/products/:id/images/:imageId', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { id, imageId } = req.params as { id: string; imageId: string };
    const [{ data: image }, { data: product }] = await Promise.all([
      supabase.from('imagenes_productos').select('id,url').eq('id', imageId).eq('producto_id', id).single(),
      supabase.from('productos').select('imagen_principal_url').eq('id', id).single(),
    ]);
    if (!image || !product) return reply.status(404).send({ success: false, error: 'Imagen no encontrada' });

    const marker = '/storage/v1/object/public/product-images/';
    const markerIndex = image.url.indexOf(marker);
    const { count: sameUrlReferences } = await supabase.from('imagenes_productos')
      .select('id', { count: 'exact', head: true }).eq('url', image.url);
    if (markerIndex >= 0 && (sameUrlReferences ?? 0) <= 1) {
      const storagePath = decodeURIComponent(image.url.slice(markerIndex + marker.length));
      if (storagePath.startsWith(`products/${id}/`)) {
        const { error: storageError } = await supabase.storage.from('product-images').remove([storagePath]);
        if (storageError) return reply.status(500).send({ success: false, error: 'No se pudo eliminar el archivo' });
      }
    }

    const { error: deleteError } = await supabase.from('imagenes_productos').delete().eq('id', imageId);
    if (deleteError) return reply.status(500).send({ success: false, error: 'No se pudo eliminar la imagen' });
    if (product.imagen_principal_url === image.url) {
      const { data: replacement } = await supabase.from('imagenes_productos')
        .select('url').eq('producto_id', id).order('orden').order('created_at').limit(1).maybeSingle();
      await supabase.from('productos').update({ imagen_principal_url: replacement?.url ?? null }).eq('id', id);
    }
    await logAudit((req as any).adminUser.id, 'delete_image', 'imagenes_productos', imageId, { producto_id: id });
    return reply.send({ success: true });
  });

  // ═══════════════════════════════════════════════════════════
  // PEDIDOS
  // ═══════════════════════════════════════════════════════════

  /** GET /api/admin/orders — listar pedidos */
  fastify.get('/admin/orders', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { status, q, desde, hasta, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('orders')
      .select('*, items:order_items(*, product:productos(nombre,imagen_principal_url))')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);
    if (q)      query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%`);
    if (desde)  query = query.gte('created_at', desde);
    if (hasta)  query = query.lte('created_at', hasta + 'T23:59:59');

    const { data, error, count } = await query;
    if (error) return reply.status(500).send({ success: false, error: error.message });
    return reply.send({ success: true, data: data ?? [], total: count ?? 0 });
  });

  /** PUT /api/admin/orders/:id/status — cambiar estado de pedido */
  fastify.put('/admin/orders/:id/status', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { id }    = req.params as { id: string };
    const parsed    = orderStatusSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Estado inválido' });

    const { data, error } = await supabase
      .from('orders')
      .update({ status: parsed.data.status })
      .eq('id', id)
      .select()
      .single();

    if (error) return reply.status(500).send({ success: false, error: error.message });

    await logAudit((req as any).adminUser.id, 'update_order_status', 'orders', id, { status: parsed.data.status });
    return reply.send({ success: true, data });
  });

  // ═══════════════════════════════════════════════════════════
  // STOCK
  // ═══════════════════════════════════════════════════════════

  /** GET /api/admin/stock — resumen de stock */
  fastify.get('/admin/stock', { preHandler: authenticateAdmin }, async (req, reply) => {
    const [productsRes, movementsRes] = await Promise.all([
      supabase
        .from('productos')
        .select('id,nombre,slug,sku,stock,stock_minimo,stock_ilimitado,activo,categoria:categorias(nombre)')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('stock_movements')
        .select('*, producto:productos(nombre,imagen_principal_url)')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (productsRes.error) return reply.status(500).send({ success: false, error: productsRes.error.message });

    return reply.send({
      success: true,
      data: {
        products:  productsRes.data ?? [],
        movements: movementsRes.data ?? [],
        low_stock: (productsRes.data ?? []).filter(
          (p: any) => !p.stock_ilimitado && p.stock <= (p.stock_minimo ?? 5)
        ),
      },
    });
  });

  /** POST /api/admin/stock/adjust — ajustar stock manualmente */
  fastify.post('/admin/stock/adjust', { preHandler: authenticateAdmin }, async (req, reply) => {
    const parsed = stockAdjustSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: parsed.error.flatten().fieldErrors });

    const { product_id, quantity, reason } = parsed.data;

    const { data: prod, error: prodErr } = await supabase
      .from('productos')
      .select('stock, stock_ilimitado, nombre')
      .eq('id', product_id)
      .single();

    if (prodErr || !prod) return reply.status(404).send({ success: false, error: 'Producto no encontrado' });

    const new_stock = (prod.stock ?? 0) + quantity;
    if (new_stock < 0) return reply.status(400).send({ success: false, error: 'El stock no puede ser negativo' });

    await supabase.from('productos').update({ stock: new_stock }).eq('id', product_id);

    await supabase.from('stock_movements').insert({
      product_id,
      type:           'ajuste',
      quantity,
      previous_stock: prod.stock,
      new_stock,
      reason,
      created_by:     (req as any).adminUser.id,
    });

    await logAudit((req as any).adminUser.id, 'adjust_stock', 'productos', product_id, { quantity, reason, new_stock });
    return reply.send({ success: true, data: { product_id, previous_stock: prod.stock, new_stock } });
  });

  // ═══════════════════════════════════════════════════════════
  // REPORTES
  // ═══════════════════════════════════════════════════════════

  /** GET /api/admin/reports — reportes y métricas */
  fastify.get('/admin/reports', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { period = '30d' } = req.query as { period?: string };
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'today': 0 };
    const days = daysMap[period] ?? 30;

    let since: string;
    if (period === 'today') {
      since = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    } else {
      since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    const [ordersRes, itemsRes, clientsRes, lowStockRes] = await Promise.all([
      supabase.from('orders').select('id,total,status,payment_status,created_at').gte('created_at', since),
      supabase.from('order_items').select('product_name,quantity,total_price,order_id').gte('created_at', since),
      supabase.from('profiles').select('id,created_at').eq('role', 'cliente').gte('created_at', since),
      supabase.from('productos')
        .select('id,nombre,stock,stock_minimo,stock_ilimitado')
        .eq('activo', true)
        .eq('stock_ilimitado', false),
    ]);

    const orders      = ordersRes.data ?? [];
    const paidOrders  = orders.filter((o: any) => o.payment_status === 'aprobado');
    const totalRev    = paidOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const avgTicket   = paidOrders.length ? totalRev / paidOrders.length : 0;

    // Ventas por día
    const byDay: Record<string, number> = {};
    paidOrders.forEach((o: any) => {
      const day = o.created_at?.slice(0, 10);
      if (day) byDay[day] = (byDay[day] ?? 0) + Number(o.total);
    });
    const salesByDay = Object.entries(byDay)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Estado de pedidos
    const byStatus: Record<string, number> = {};
    orders.forEach((o: any) => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1; });

    // Productos más vendidos
    const byProduct: Record<string, { name: string; qty: number; revenue: number }> = {};
    (itemsRes.data ?? []).forEach((i: any) => {
      if (!byProduct[i.product_name]) byProduct[i.product_name] = { name: i.product_name, qty: 0, revenue: 0 };
      byProduct[i.product_name].qty     += i.quantity;
      byProduct[i.product_name].revenue += Number(i.total_price);
    });
    const topProducts = Object.values(byProduct).sort((a, b) => b.qty - a.qty).slice(0, 10);

    const lowStock = (lowStockRes.data ?? []).filter((p: any) => p.stock <= (p.stock_minimo ?? 5));

    return reply.send({
      success: true,
      data: {
        total_revenue:   totalRev,
        total_orders:    orders.length,
        paid_orders:     paidOrders.length,
        avg_ticket:      avgTicket,
        total_items:     (itemsRes.data ?? []).reduce((sum: number, item: any) => sum + item.quantity, 0),
        new_clients:     (clientsRes.data ?? []).length,
        sales_by_day:    salesByDay,
        orders_by_status: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
        top_products:    topProducts,
        low_stock:       lowStock,
      },
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CLIENTES
  // ═══════════════════════════════════════════════════════════

  /** GET /api/admin/clients — listar clientes */
  fastify.get('/admin/clients', { preHandler: authenticateAdmin }, async (req, reply) => {
    const { q } = req.query as { q?: string };

    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'cliente')
      .order('created_at', { ascending: false });

    if (q) query = query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%,email.ilike.%${q}%`);

    const { data, error } = await query;
    if (error) return reply.status(500).send({ success: false, error: error.message });
    return reply.send({ success: true, data: data ?? [] });
  });

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════

  /** GET /api/admin/dashboard — métricas rápidas */
  fastify.get('/admin/dashboard', { preHandler: authenticateAdmin }, async (req, reply) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [ordersAll, ordersMonth, profiles, lowStock] = await Promise.all([
      supabase.from('orders').select('id,status,payment_status,total'),
      supabase.from('orders').select('id,total,payment_status').gte('created_at', monthStart),
      supabase.from('profiles').select('id').eq('role', 'cliente'),
      supabase.from('productos')
        .select('id,nombre,stock,stock_minimo')
        .eq('activo', true)
        .eq('stock_ilimitado', false),
    ]);

    const all    = ordersAll.data ?? [];
    const month  = ordersMonth.data ?? [];
    const lsProds = (lowStock.data ?? []).filter((p: any) => p.stock <= (p.stock_minimo ?? 5));

    const byStatus = (status: string) => all.filter((o: any) => o.status === status).length;
    const monthRev = month.filter((o: any) => o.payment_status === 'aprobado')
      .reduce((s: number, o: any) => s + Number(o.total), 0);

    return reply.send({
      success: true,
      data: {
        total_orders:      all.length,
        pending_orders:    byStatus('pendiente'),
        paid_orders:       all.filter((o: any) => o.payment_status === 'aprobado').length,
        delivered_orders:  byStatus('entregado'),
        cancelled_orders:  byStatus('cancelado'),
        total_clients:     (profiles.data ?? []).length,
        month_revenue:     monthRev,
        low_stock_count:   lsProds.length,
        low_stock_items:   lsProds.slice(0, 5),
      },
    });
  });
};

export default adminRoutes;
