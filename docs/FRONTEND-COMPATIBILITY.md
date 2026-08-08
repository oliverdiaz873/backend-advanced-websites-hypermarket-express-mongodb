# FRONTEND-COMPATIBILITY — Backend compartido por Angular y Next.js

> Estado: **F2 (aprobado)**. Este backend es consumido por **dos storefronts**
> (Angular y Next.js) además del dashboard administrativo. Cualquier cambio de
> contrato debe contrastarse contra ambos consumidores aunque hoy estén en
> **modo mock** (sin consumo real del API).

## Regla de diseño del contrato

- El backend entrega **datos semánticos** (`price`, `unit`, `unitQuantity`,
  `image` pública con `?v=`, `category.slug`/`categoryId`).
- La **presentación es del consumidor**: `precioTexto`, `priceLabel`, URLs
  amigables, moneda, `oldPrice` renderizado — cada storefront la construye
  localmente.
- El backend **jamás emite** `translations`, `imageKey`, `imageThumbnailKey`,
  ni texto de precios ya formateado.

## Matriz de compatibilidad

| Área | Angular | Next.js | Backend |
|------|---------|---------|---------|
| Products | mock | mock | contrato F1 |
| Search | mock | mock | contrato F1 |
| Offers | mock | mock | contrato F2 |
| Categories | mock | mock | existente |
| Brands | mock | mock | existente |
| Cart | mock | mock | documentar (Read-only provisional) |
| Orders | mock | mock | documentar (Read-only provisional) |
| Auth | mock | mock | documentar (Read-only provisional) |

> `Read-only / provisional` = se documenta el contrato actual sin cambios de
> comportamiento (ver `docs/API-CONTRACT.md` §15).

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
  `/api/brands`, `/api/cart` → `{ success: true, data }` (products además
  `pagination`).
- Ofertas: `data` es una lista plana (sin paginación).

## Go-forward

- F3: seed con traducciones EN (los storefronts siguen en mock).
- F4+: integración real de los storefronts contra esta API (cart/orders/auth
  fuera del alcance de F2 salvo documentación).