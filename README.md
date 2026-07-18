# Yas&Dani Impresiones 💖

> Plataforma de e-commerce para productos personalizados: agendas, cuadros, álbumes, regalos y más.
> Arquitectura monorepo: Next.js · Fastify · Supabase · Mercado Pago Chile.

---

## Estructura del proyecto

```
yasydani-impresiones/
├── frontend/          # Next.js 14 · TypeScript · Tailwind CSS
├── backend/           # Fastify · TypeScript · Node.js
├── supabase/
│   ├── migrations/    # SQL: tablas + RLS
│   └── seed.sql       # Datos iniciales
├── packages/
│   └── shared/        # Tipos TypeScript compartidos
├── .env.example
├── .gitignore
└── package.json       # Monorepo raíz (npm workspaces)
```

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js     | 18+            |
| npm         | 9+             |
| Git         | cualquiera     |

---

## Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/yasydani-impresiones.git
cd yasydani-impresiones
```

### 2. Instalar dependencias (todos los workspaces)

```bash
npm install
```

### 3. Configurar variables de entorno

**Frontend:**
```bash
cp frontend/.env.local.example frontend/.env.local
# Edita frontend/.env.local con tus valores de Supabase
```

**Backend:**
```bash
cp backend/.env.example backend/.env
# Edita backend/.env con tus valores de Supabase + Mercado Pago
```

### 4. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) → **DanielBravos88's Org** → proyecto `yasdani-impresiones`
2. Abre el **SQL Editor** y ejecuta en orden:
   ```sql
   -- Paso 1: Crear tablas
   -- (pega el contenido de supabase/migrations/001_create_tables.sql)

   -- Paso 2: Políticas RLS
   -- (pega el contenido de supabase/migrations/002_rls_policies.sql)

   -- Paso 3: Datos iniciales
   -- (pega el contenido de supabase/seed.sql)
   ```
3. Copia las **API Keys** desde `Settings → API Keys` y pégalas en tus archivos `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `frontend/.env.local`
   - `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` → `backend/.env`

### 5. Subir imágenes de productos

Copia las imágenes de `assets/` al bucket `product-images` de Supabase Storage:
- Ve a **Storage → product-images → Upload**
- Sube `product1.jpeg` … `product13.jpeg` y `logo.png`
- Luego actualiza el campo `imagen_principal_url` en la tabla `productos` con las URLs públicas.

---

## Ejecutar en desarrollo

### Iniciar ambos servicios simultáneamente

```bash
npm run dev
```

### O individualmente:

```bash
# Solo frontend (http://localhost:3000)
npm run dev:frontend

# Solo backend (http://localhost:3001)
npm run dev:backend
```

---

## Rutas del Backend

| Método | Ruta                                           | Descripción                              |
|--------|------------------------------------------------|------------------------------------------|
| GET    | `/health`                                      | Health check                             |
| GET    | `/api/products`                                | Listar productos (filtros: q, categoria) |
| GET    | `/api/products/:id`                            | Detalle de producto por id o slug        |
| GET    | `/api/categories`                              | Listar categorías activas                |
| POST   | `/api/orders`                                  | Crear pedido nuevo                       |
| GET    | `/api/orders/:id`                              | Detalle de pedido                        |
| POST   | `/api/uploads/signed-url`                      | URL firmada para subir archivo           |
| POST   | `/api/payments/mercadopago/create-preference`  | Crear preferencia Mercado Pago           |
| POST   | `/api/payments/mercadopago/webhook`            | Webhook de notificaciones de pago        |

---

## Páginas del Frontend

| Ruta                   | Descripción                     |
|------------------------|---------------------------------|
| `/`                    | Inicio con Hero + destacados    |
| `/productos`           | Catálogo con filtros            |
| `/productos/[slug]`    | Detalle de producto             |
| `/carrito`             | Vista del carrito               |
| `/personalizar`        | Formulario de personalización   |
| `/contacto`            | Información de contacto         |
| `/admin`               | Panel admin (próximamente)      |
| `/pago/exito`          | Confirmación de pago exitoso    |
| `/pago/error`          | Error en el pago                |
| `/pago/pendiente`      | Pago en revisión                |

---

## Base de datos (Supabase)

### Tablas

| Tabla               | Descripción                              |
|---------------------|------------------------------------------|
| `categorias`        | Agendas, Cuadros, Regalos, etc.          |
| `productos`         | Catálogo de productos con precio y stock |
| `imagenes_productos`| Galería de imágenes por producto         |
| `clientes`          | Datos de contacto del cliente            |
| `pedidos`           | Pedidos con estado y total               |
| `pedido_items`      | Líneas de cada pedido                    |
| `archivos_cliente`  | Fotos subidas por el cliente             |
| `pagos`             | Registros de pago via Mercado Pago       |

### Buckets de Storage

| Bucket           | Visibilidad | Uso                               |
|------------------|-------------|-----------------------------------|
| `product-images` | Público     | Imágenes del catálogo             |
| `client-uploads` | Privado     | Fotos personalizadas de clientes  |

---

## Despliegue

### Frontend → Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

cd frontend
vercel

# En el dashboard de Vercel, agrega las variables:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_API_URL  (URL del backend desplegado)
# NEXT_PUBLIC_MP_PUBLIC_KEY
```

### Backend → Railway / Render

```bash
# En Railway.app o Render.com:
# 1. Conecta el repositorio de GitHub
# 2. Selecciona la carpeta "backend" como root
# 3. Build command: npm run build
# 4. Start command: npm start
# 5. Agrega las variables de entorno:
#    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#    MERCADOPAGO_ACCESS_TOKEN, FRONTEND_URL, NODE_ENV=production
```

### Subir a GitHub

```bash
git add .
git commit -m "feat: migración completa a Next.js + Fastify + Supabase"
git remote add origin https://github.com/TU_USUARIO/yasydani-impresiones.git
git push -u origin main
```

---

## Stack tecnológico

| Capa       | Tecnología                    |
|------------|-------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS 3, Zustand |
| Backend    | Fastify, TypeScript, Node.js 18+ |
| Base datos | Supabase PostgreSQL            |
| Storage    | Supabase Storage               |
| Auth       | Supabase Auth (próximamente)   |
| Pagos      | Mercado Pago Chile             |
| Deploy     | Vercel (frontend) + Railway (backend) |

---

## Próximos pasos

- [ ] Supabase Auth — login admin con email/password
- [ ] Panel admin completo (CRUD de productos)
- [ ] Integración real con Mercado Pago en producción
- [ ] Subida de imágenes desde el admin
- [ ] Notificaciones WhatsApp en nuevos pedidos (Twilio / Meta API)
- [ ] SEO mejorado y sitemap.xml
- [ ] Modo oscuro opcional

---

## Contacto

📸 Instagram: [@yasydaniimpresiones](https://www.instagram.com/yasydaniimpresiones)<br>
💬 WhatsApp: [+56 9 8322 0168](https://wa.me/56983220168)<br>
🌐 Web: [yasydaniimpresiones.cl](https://yasydaniimpresiones.cl)

---

*Hecho con amor 💖 — Yas&Dani Impresiones · Chile 🇨🇱*
