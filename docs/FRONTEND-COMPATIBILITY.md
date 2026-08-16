# FRONTEND-COMPATIBILITY — Backend compartido por Angular y Next.js

> Estado: **F2 (aprobado), F3 (implementado), F4 (implementado)**. Este backend es consumido por
> **dos storefronts** (Angular y Next.js) además del dashboard administrativo.
> Cualquier cambio de contrato debe contrastarse contra ambos consumidores.
> La integración real ya está implementada: Angular y Next.js consumen el catálogo
> público (`/api/products`, `/api/search`, `/api/offers`, `/api/categories`) y los
> endpoints autenticados (`/api/auth`, `/api/cart`, `/api/orders`, `/api/addresses`),
> y el dashboard consume el boundary administrativo (`/api/admin/*`).

## Regla de diseño del contrato

- El backend entrega **datos semánticos** (`price`, `unit`, `unitQuantity`,
  `image` pública con `?v=`, `category.slug`/`categoryId`).
- La **presentación es del consumidor**: `precioTexto`, `priceLabel`, URLs
  amigables, moneda, `oldPrice` renderizado — cada storefront la construye
  localmente.
- El **boundary público** jamás emite `translations`, `imageKey`,
  `imageThumbnailKey`, ni texto de precios ya formateado.

### Boundary público vs Dashboard (F4)

- **Público** (`/api/products`, `/api/search`, `/api/offers`): solo productos
  `active` + `isAvailable: true`; `name`/`description` ya localizados según
  `?lang=`; jamás incluye `translations`, `imageKey` ni `imageThumbnailKey`.
- **Dashboard/admin** (`/api/admin/products`): boundary editorial. Lista y
  detalle **sí** devuelven `translations` (solo `en`), `imageKey` e
  `imageThumbnailKey`, e incluyen drafts e inactivos para gestión.
  `PATCH /api/admin/products/:id` edita `translations.en` con merge no
  destructivo y rechaza `translations.es` (`400`); el ES editorial se edita en
  los campos raíz `name`/`description`.
- **Creación** (`POST /api/products`): el contrato histórico acepta
  `translations` con `es` **y** `en`; la editorialización EN-only es solo del
  boundary administrativo.

## Matriz de compatibilidad

| Área | Angular | Next.js | Backend |
|------|---------|---------|---------|
| Products | real | real | contrato F1 |
| Search | real | real | contrato F1 |
| Offers | real | real | contrato F2 |
| Categories | real | real | existente |
| Brands | — | — | existente (sin consumidor) |
| Cart | real (auth) | real (auth) | contrato autenticado |
| Orders | real (auth) | real (auth) | contrato autenticado |
| Auth | real (auth) | real (auth) | contrato autenticado |
| Contact | real | — | existente (`POST /api/contact`) |
| Admin | dashboard | — | boundary `/api/admin/*` |

> Angular consume el API desde `src/app/core/api/api.service.ts` y los
> servicios `auth-api`, `cart-api`, `order-api`, `address-api`; Next.js desde
> `src/lib/api-client.ts` (cliente) y `src/features/auth/config.ts`
> (server-side). Brands no es consumido por ningún storefront.

## Endpoints autenticados (público/cliente)

Todos responden `{ success: true, data }` y requieren **sesión**
(`authMiddleware`), salvo lo indicado.

### Auth (`/api/auth`)

| Método | Ruta | Requiere sesión | Notas |
|--------|------|-----------------|-------|
| POST | `/register` | no | body `email`, `password`; rate-limited |
| POST | `/login` | no | rate-limited |
| POST | `/logout` | no | cierra sesión |
| GET | `/me` | sí | usuario actual |
| PATCH | `/me` | sí | actualiza perfil |

### Cart (`/api/cart`) — todas requieren sesión

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/` | carrito actual |
| POST | `/items` | body `productId` (y `quantity`) |
| POST | `/merge` | fusiona carrito anónimo al de sesión |
| PATCH | `/items/:productId` | actualiza cantidad |
| DELETE | `/items/:productId` | elimina línea |
| DELETE | `/` | vacía carrito |

### Orders (`/api/orders`) — todas requieren sesión

| Método | Ruta | Notas |
|--------|------|-------|
| POST | `/` | body `addressId`, `idempotencyKey` |
| GET | `/` | pedidos del usuario |
| POST | `/:id/pay` | marca pagado |
| GET | `/:id` | detalle |
| PATCH | `/:id/status` | body `status` |

### Addresses (`/api/addresses`) — todas requieren sesión

| Método | Ruta | Notas |
|--------|------|-------|
| GET | `/` y `/user/:userId` | listado del usuario |
| GET | `/:id` | detalle |
| POST | `/` | body `label`, `street`, `city`, `state`, `zipCode`, `country` |
| PATCH | `/:id` | actualiza |
| DELETE | `/:id` | elimina |

## Boundary administrativo

Todas las rutas `/api/admin/*` exigen `authMiddleware` + `authorizeRole("admin")`
y devuelven `{ success: true, data }`. Es consumido únicamente por el dashboard.

| Área | Rutas |
|------|-------|
| Products | `/api/admin/products` (boundary editorial F4) |
| Offers | `/api/admin/offers` |
| Orders | `/api/admin/orders`: GET `/`, GET `/:id`, PATCH `/:id/status` |
| Customers | `/api/admin/customers`: GET `/`, GET `/stats`, GET `/:id`, PATCH `/:id/status`, PATCH `/:id` |
| Stats | `/api/admin/stats`: GET `/`, `/overview`, `/dashboard`, `/revenue`, `/orders-status`, `/top-products`, `/category-sales`, `/inventory-summary` |
| Search | `/api/admin/search`: GET `/` |
| Audit logs | `/api/admin/audit-logs`: GET `/`, GET `/:id` |
| Contact | `/api/admin/contact`: GET `/`, GET `/:id`, PATCH `/:id` (body `status`), DELETE `/:id` |
| Uploads | `/api/admin/uploads`: POST `/presigned` (body `fileName`, `contentType`; rate-limited) |

## Mapeo de campos por endpoint

### Products / Search (contrato F1)

| Campo Frontend (ambos) | Campo API |
|------------------------|-----------|
| `precio` | `price` |
| `imagen` | `image` (URL pública con `?v=`) |
| `categoria` | `category.slug` (o `categoryId`) |
| `unidad` | `unit` |
| `quantity` / `cantidad` | `unitQuantity` |
| `precioTexto` | **no se emite** — formato local |
| `url` de producto | se construye en el frontend desde `id`/`slug` |

### Offers (contrato F2)

| Campo Frontend | Campo API |
|----------------|----------|
| `id` | `id` |
| `name` | `name` (localizado con `?lang=`) |
| `precio` (final) | `price` = `discountPrice` |
| `precioOriginal` | `originalPrice` |
| `precioDescuento` | `discountPrice` |
| `%` de descuento | `discountPercentage` (number) |
| `imagen` | `image` (URL pública con `?v=`, puede ser `null`) |
| `categoria` | `categoryId` |
| `unidad` | `unit` |
| `cantidad/unidad` | `unitQuantity` |

### Envelope

- `GET /api/products`, `/api/search`, `/api/offers`, `/api/categories`,
  `/api/brands`, `/api/cart`, `/api/orders`, `/api/addresses` →
  `{ success: true, data }` (products además `pagination`).
- Ofertas: `data` es una lista plana (sin paginación).

## Storage de imágenes y `getAssetUrl`

### Contrato de datos en MongoDB

- MongoDB guarda **`image`** (URL pública, con `?v=`) e **`imageKey`**
  (referencia de storage); jamás el binario.
- El backend **no traduce URLs** de imagen en las respuestas: entrega
  `image` tal cual y `imageKey` solo en el boundary administrativo.

### Resolución de imagen en los storefronts (contrato compartido)

Ambos storefronts resuelven localmente a partir de `image`:

- URL absoluta (`http`/`https`/`data:`) → se usa tal cual.
- Key relativa legacy de la seed (p. ej. `products/bebidas/coca-cola.avif` sin
  `imageKey`) → `<storagePublicBase>/uploads/<key>`.
- `?v=` se conserva si viene en la respuesta; el cliente **jamás** genera
  versionado.

### `getAssetUrl` (Angular, estáticos de la app)

Helper de assets estáticos de la aplicación (no storage):

- Passthrough de URLs absolutas (`http`/`https`/`data:`) y de las que ya
  empiezan por `/uploads/`.
- Cualquier otra ruta se prefija con `/assets/`.

### Proveedor de storage

Seleccionado por `STORAGE_PROVIDER` (`config/index.ts`). El dominio de
productos no conoce el proveedor concreto (interfaz `ObjectStorageProvider`).

| | **Local (dev/test)** | **R2 / S3 (producción)** |
|---|---|---|
| Proveedor | `LocalStorageProvider` | `R2StorageProvider` |
| Base pública | `STORAGE_PUBLIC_BASE_URL` (default `http://localhost:3000`) | `R2_PUBLIC_URL` (base CDN) |
| Archivos | `/uploads` estático servido por Express desde `STORAGE_LOCAL_DIR` | servidos por el CDN de R2 |
| Upload | `PUT /api/uploads/local` (mismo contrato "presigned", solo activo con proveedor local; 404 si no) | `POST /api/admin/uploads/presigned` (admin) devuelve `uploadUrl` firmado |

> La base pública de los storefronts: Angular usa `DEFAULT_STORAGE_PUBLIC_URL`
> (`''` en dev → URLs relativas `/uploads/...` proxied a `:3000`); Next.js usa
> `NEXT_PUBLIC_STORAGE_PUBLIC_URL` (default `http://localhost:3000`). En
> producción ambos apuntan a la base CDN de R2.

## Go-forward

- F3 (hecho): la seed puebla `translations.en` de cada producto con las
  traducciones reales de los storefronts (Angular y Next.js en.json, verificados
  idénticos 184/184 por `npm run sync:i18n`). Solo se siembra EN; los campos raíz
  `name`/`description` siguen siendo el idioma por defecto (es). El backend no
  depende en runtime de los repos storefront.
- F4 (hecho): la integración real de los storefronts contra esta API está
  implementada (catálogo público, auth/cart/orders/addresses autenticados) y el
  dashboard consume el boundary administrativo.