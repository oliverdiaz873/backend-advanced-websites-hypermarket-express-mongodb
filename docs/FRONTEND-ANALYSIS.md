# Frontend Analysis for Backend API Design

> Documento base para diseñar la API REST del backend Express,
> basado en el análisis de los frontends Angular y Next.js.

---

## 1. Estructura de Carpetas

### Angular (`pre-advanced-websites-hypermarket-angular`)

```
src/
├── app/
│   ├── core/                    # Lógica transversal
│   │   ├── constants.ts         # Constantes globales
│   │   ├── i18n/                # Configuración de i18n
│   │   ├── services/            # Servicios base (storage, seo, platform)
│   │   ├── types/               # Interfaces compartidas (Product, Category, SEO)
│   │   └── utils/               # Utilidades transversales
│   ├── data/                    # Datos estáticos (mock DB)
│   │   ├── products.data.ts     # 184 productos
│   │   ├── categories.data.ts   # 8 categorías con subcategorías
│   │   ├── product-page.data.ts # Datos de páginas de producto
│   │   ├── catalog.helpers.ts   # Utilidades de catálogo
│   │   └── index.ts             # Barrel export
│   ├── features/                # Módulos de negocio
│   │   ├── products/            # Listado y grid de productos
│   │   ├── product/             # Página de detalle de producto
│   │   ├── cart/                # Carrito de compras
│   │   ├── category/            # Página de categoría
│   │   ├── offers/              # Página de ofertas
│   │   ├── search/              # Búsqueda de productos
│   │   ├── home/                # Página principal
│   │   ├── contact/             # Página de contacto
│   │   ├── legal/               # Términos y privacidad
│   │   ├── layout/              # Componentes de layout
│   │   └── navigation/          # Navegación
│   ├── layouts/
│   │   └── shop-layout/         # Layout principal de la tienda
│   ├── shared/                  # Componentes reutilizables
│   │   ├── components/          # breadcrumb, drawer, icons, skeleton, toast, etc.
│   │   └── directives/
│   ├── app.routes.ts            # Configuración de rutas
│   └── app.config.ts            # Configuración de la app
├── assets/                      # Imágenes y recursos estáticos
└── main.ts                      # Entry point
```

### Next.js (`pre-advanced-websites-hypermarket-next`)

```
src/
├── app/
│   ├── [locale]/                # Rutas internacionalizadas
│   │   ├── (shop)/              # Grupo de rutas de la tienda
│   │   │   ├── cart/            # Página de carrito
│   │   │   ├── category/        # Página de categoría
│   │   │   ├── contact/         # Página de contacto
│   │   │   ├── legal/           # Términos y privacidad
│   │   │   ├── offers/          # Página de ofertas
│   │   │   ├── product/         # Página de detalle de producto
│   │   │   ├── search/          # Búsqueda
│   │   │   ├── page.tsx         # Home
│   │   │   └── layout.tsx       # Layout de la tienda
│   │   ├── layout.tsx           # Layout raíz con i18n
│   │   ├── not-found.tsx        # 404
│   │   └── page.tsx             # Redirección a locale
│   ├── globals.css
│   └── sitemap.ts
├── features/                    # Módulos de negocio
│   ├── products/                # Product grid, cards, hooks
│   ├── cart/                    # CartContext, componentes, hooks
│   ├── offers/                  # Ofertas, datos, hooks, utils
│   ├── search/                  # Búsqueda
│   ├── home/                    # Home page
│   ├── contact/                 # Contacto
│   ├── legal/                   # Términos y privacidad
│   ├── layout/                  # Header, Footer, Navigation
│   └── navigation/              # Menu items
├── hooks/                       # Hooks globales
├── lib/                         # Utilidades
│   ├── constants.ts             # Constantes globales
│   ├── priceUtils.ts            # Formateo de precios y unidades
│   ├── categoryUtils.ts         # Utilidades de categorías
│   ├── searchUtils.ts           # Lógica de búsqueda
│   └── assetUtils.ts            # Utilidades de assets
├── services/                    # Servicios de datos
│   └── catalog/                 # Datos de catálogo
│       ├── products.ts          # 184 productos (mismo data que Angular)
│       ├── categories.ts        # 8 categorías
│       ├── categorySectionMap.ts # Mapa sección-categoría
│       └── productPageData.ts   # Datos de páginas de producto
├── types/                       # Interfaces TypeScript
│   ├── product.ts               # Product interface
│   └── category.ts              # Category, Subcategory interfaces
└── i18n/                        # Internacionalización
```

---

## Backend API Design Principles

La API será independiente del framework frontend. Tanto Angular como Next.js consumirán la misma API REST.

**Principios:**

- Los nombres de campos de la API estarán en **inglés** (`price`, `image`, `category`).
- La API representa entidades del negocio, no componentes del frontend.
- El backend no dependerá de rutas específicas de Angular o Next.js.
- Los recursos multimedia serán referencias independientes del frontend.
- La estructura permitirá migrar de mock data a base de datos real sin modificar los consumidores.

### Mapeo Frontend → API

| Frontend (Angular/Next) | API (Express) |
|------------------------|---------------|
| `precio` | `price` |
| `imagen` / `img` | `image` |
| `categoria` | `category` |
| `unidad` | `unit` |
| `quantity` / `cantidad` | `unitQuantity` |
| `productId` | `id` |

---

## 2. Features Principales

| Feature | Angular (ubicación) | Next.js (ubicación) |
|---------|---------------------|---------------------|
| **Products (listado)** | `features/products/` | `features/products/` |
| **Product (detalle)** | `features/product/` | `app/[locale]/(shop)/product/` |
| **Categories** | `features/category/` + `data/categories.data.ts` | `app/[locale]/(shop)/category/` + `services/catalog/categories.ts` |
| **Cart** | `features/cart/` | `features/cart/` |
| **Offers** | `features/offers/` | `features/offers/` |
| **Search** | `features/search/` | `features/search/` |
| **Home** | `features/home/` | `app/[locale]/(shop)/page.tsx` |
| **Contact** | `features/contact/` | `app/[locale]/(shop)/contact/` |
| **Legal (terms/privacy)** | `features/legal/` | `app/[locale]/(shop)/legal/` |

---

## 3. Modelos e Interfaces

### Product (Frontend - Angular y Next.js)

```typescript
interface Product {
    id: string;          // Ej: "coca_cola", "arroz"
    name: string;        // Nombre del producto
    url: string;         // URL friendly: "/product/coca_cola"
    categoria: string;   // ID de categoría: "bebidas", "despensa"
    precio: number;      // Precio numérico: 80, 350
    precioTexto: string; // Texto formateado: "Precio: $80 / 2 Litros"
    imagen: string;      // Ruta de imagen: "/assets/images/..."
    unidad?: string;     // Unidad opcional: "litro", "kg", "lb", "unidad"
    quantity?: number;   // Cantidad opcional: 2 (para empaques multi-unidad)
}
```

### Product (API Contract)

```json
{
  "id": "coca_cola",
  "name": "Coca Cola",
  "price": 80,
  "image": "products/bebidas/coca-cola.avif",
  "category": "bebidas",
  "unit": "litro",
  "unitQuantity": 2,
  "priceLabel": "Precio: $80 / 2 Litros"
}
```

| Campo Frontend | Campo API |
|---------------|-----------|
| `precio` | `price` |
| `imagen` | `image` |
| `categoria` | `category` |
| `unidad` | `unit` |
| `quantity` | `unitQuantity` |

### Category (idéntico en Angular y Next.js)

```typescript
interface Category {
    name: string;           // "Alimentos", "Electrodomésticos"
    id: string;             // "alimentos", "electrodomesticos"
    href: string;           // "/category/alimentos"
    subcategories: Subcategory[];
}

interface Subcategory {
    name: string;           // "Frutas y Verduras", "Despensa"
    href: string;           // "/category/alimentos#frutas-y-verduras"
}
```

### CartItem

**Angular (`cart/types/cart.interface.ts`):**
```typescript
interface CartItem {
    productId: string;
    name: string;
    imagen: string;
    unitPrice: number;
    unitLabel: string;
    quantity: number;
    precioTexto?: string;
    oldPrice?: string;
    unidad?: string;
    isOffer?: boolean;
    discountPercentage?: number;
    unitQuantity?: number;
}

interface CartState {
    items: CartItem[];
}
```

**Next.js (`features/cart/CartContext.tsx`):**
```typescript
interface CartItem {
    id: string;
    name: string;
    precio: number;
    precioTexto?: string;
    img: string;
    unidad?: string;
    unitLabel: string;
    cantidad: number;
    isOffer?: boolean;
    oldPrice?: string;
    discountPercentage?: number;
    unitQuantity?: number;
}
```

**Diferencias clave CartItem:**
| Campo | Angular | Next.js |
|-------|---------|---------|
| ID del producto | `productId` | `id` |
| Imagen | `imagen` | `img` |
| Precio | `unitPrice` | `precio` |
| Cantidad | `quantity` | `cantidad` |
| Unidad | `unitLabel` + `unidad` | `unitLabel` + `unidad` |

### ProductUI (Angular - solo UI)

```typescript
interface ProductUI extends Product {
    oldPrice?: string;
    discountPercentage?: number;
}
```

### OfferData (Next.js)

```typescript
interface OfferData {
    id: string;        // product ID
    oldPrice: string;  // "RD$ 56.25"
}
```

Las ofertas se definen mediante un array de IDs de producto con su precio anterior. El cálculo del descuento se hace en el frontend.

---

## 4. Servicios del Frontend

### Angular

| Servicio | Ubicación | Responsabilidad |
|----------|-----------|-----------------|
| `ProductService` | `features/products/services/product.service.ts` | Cargar productos desde datos estáticos, mapear a ProductUI, exponer signals |
| `CartService` | `features/cart/services/cart.service.ts` | Estado global del carrito con signals, persistencia en localStorage, add/remove/update/clear |
| `StorageService` | `core/services/storage.service.ts` | Wrapper de localStorage con detección de SSR |
| `PlatformService` | `core/services/platform.service.ts` | Detección de plataforma (browser/server) |
| `SEOService` | `core/services/seo.service.ts` | Manejo de meta tags y SEO |
| `ProductTranslationService` | `features/products/services/product-translation.service.ts` | Traducción de datos de producto |

### Next.js

| Servicio/Contexto | Ubicación | Responsabilidad |
|--------------------|-----------|-----------------|
| `CartContext` | `features/cart/CartContext.tsx` | Estado global del carrito con Context + useState, persistencia en localStorage |
| `products` (data) | `services/catalog/products.ts` | Array estático de 184 productos |
| `categories` (data) | `services/catalog/categories.ts` | Array estático de 8 categorías |
| `categorySectionMap` | `services/catalog/categorySectionMap.ts` | Mapa de slugs sección ↔ categoría |
| `productPageData` | `services/catalog/productPageData.ts` | Datos para páginas de producto |

---

## 5. Flujo de Usuario

```
Home
 ├── Ver categorías destacadas → /category/:id
 │    └── Filtrar por subcategoría → /category/:id#subcategoria
 ├── Ver productos destacados → / (home)
 └── Ver ofertas → /offers
      └── Producto con descuento

Navegación
 ├── Categorías → /category/:id
 ├── Ofertas → /offers
 └── Búsqueda → /search?q=termino

Producto
 ├── Ver detalle → /product/:id
 ├── Agregar al carrito
 └── Ver precio + unidad

Carrito
 ├── Ver items → /cart
 ├── Actualizar cantidad (+/-)
 ├── Eliminar item
 ├── Ver total
 └── (Futuro: checkout)

Contacto → /contact
Legal → /legal/terms, /legal/privacy
```

**Datos que necesita cada pantalla:**

| Pantalla | Datos necesarios |
|----------|------------------|
| Home | Categorías destacadas (8), productos destacados/ofertas |
| Categoría | Productos filtrados por categoría, nombre de categoría |
| Producto | Datos completos del producto, oferta (si aplica) |
| Ofertas | Productos con descuento, precio anterior, % descuento |
| Búsqueda | Productos filtrados por término, resultados |
| Carrito | Items del carrito, totales, ofertas aplicadas |

---

## 6. Datos Actuales (Mock)

Actualmente, **todos los datos son estáticos** y están duplicados en ambos proyectos:

| Archivo | Angular | Next.js | Contenido |
|---------|---------|---------|-----------|
| Productos | `data/products.data.ts` | `services/catalog/products.ts` | 184 productos (idéntico contenido) |
| Categorías | `data/categories.data.ts` | `services/catalog/categories.ts` | 8 categorías (idéntico) |
| Mapa sección-categoría | `data/category-section-map.data.ts` | `services/catalog/categorySectionMap.ts` | Mapeo de slugs |
| Páginas de producto | `data/product-page.data.ts` | `services/catalog/productPageData.ts` | Metadatos de páginas |
| Ofertas | `features/offers/data/` | `features/offers/data/offers.ts` | 7 ofertas (ID + oldPrice) |
| Carrito | `localStorage` (key: `carrito`) | `localStorage` (key: `carrito`) | Estado persistente del carrito |

**IMPORTANTE:** Actualmente no hay backend. Todo es mock. Estos datos deberán migrarse al backend.

---

## 7. Comparación Angular vs Next.js

| Aspecto | Angular | Next.js |
|---------|---------|---------|
| **Framework** | Angular 17+ (Standalone Components) | Next.js 14+ (App Router) |
| **Estado del carrito** | Signals (`CartService`) | Context + useState (`CartContext`) |
| **Persistencia carrito** | localStorage (key: `carrito`) | localStorage (key: `carrito`) |
| **Datos de productos** | Array estático idéntico | Array estático idéntico |
| **Datos de categorías** | Array estático idéntico | Array estático idéntico |
| **Ofertas** | Feature module con data | Feature module con data |
| **Internacionalización** | i18n config (`core/i18n/`) | next-intl (`messages/`) |
| **Rutas** | Router config (`app.routes.ts`) | File-system based (`app/[locale]/`) |
| **SEO** | Service + meta tags | next-intl + sitemap/robots |
| **Imágenes** | `/assets/images/...` | `/assets/images/...` |
| **Tipos Product** | `Product` interface idéntica | `Product` interface idéntica |
| **Tipos Category** | `Category` interface idéntica | `Category` interface idéntica |
| **Tipos CartItem** | `CartItem` (productId, unitPrice, quantity) | `CartItem` (id, precio, cantidad) |

### Diferencias Críticas entre Consumidores

| Diferencia | Angular | Next.js | Impacto en API |
|-----------|---------|---------|----------------|
| Nombre campo ID carrito | `productId` | `id` | La API debe usar `id` como estándar |
| Nombre campo precio | `unitPrice` / `precio` | `precio` | La API usa `price` (inglés) |
| Nombre campo cantidad | `quantity` | `cantidad` | La API usa `quantity` (inglés) |
| Imagen campo | `imagen` | `img` | La API usa `image` (inglés) |
| Formato de imagen | `/assets/images/...` | `/assets/images/...` | Misma ruta |
| SEO | Meta tags manuales | next-intl + sitemap | Sin impacto directo |
| SSR | Parcial (SSR con Express) | Total (App Router) | Next.js necesita datos precargados |
| Carrito | Signals + StorageService | Context + localStorage | Sin impacto (es frontend) |

---

## 8. Entidades de Negocio para el Backend

Basado en el análisis de ambos frontends, las entidades necesarias son:

| Entidad | Prioridad | Justificación |
|---------|-----------|---------------|
| **Product** | Inmediata | Entidad central. 184 productos en mock. Todos los features dependen de ella. |
| **Category** | Inmediata | 8 categorías con subcategorías. Navegación y filtrado. |
| **Offer** | Fase 3 | Productos con descuento temporal. 7 ofertas estáticas. |
| **User** | Fase 4 | No implementada aún. Necesaria para autenticación y órdenes. |
| **Cart** | Fase 5 | Estado del carrito por usuario. Actualmente en localStorage. |
| **Order** | Fase 6 | No implementada aún en frontends, necesaria para checkout futuro. |
| **Inventory** | Futura | Control de existencias, stock disponible y gestión de productos en warehouse. |

---

## Backend Implementation Roadmap

| Fase | Módulo | Descripción |
|------|--------|-------------|
| **Phase 1** | Setup | Project setup + Feature-Based Architecture ✅ |
| **Phase 2** | Products | Products API with mock repository |
| **Phase 3** | Categories + Offers | Categories and Offers API |
| **Phase 4** | Auth + Users | Authentication and Users |
| **Phase 5** | Cart | Cart persistence in backend |
| **Phase 6** | Orders | Orders and Checkout |
| **Phase 7** | Database | MongoDB integration |
| **Phase 8** | Inventory | Inventory management |

---

## 9. Propuesta de Endpoints REST

> Propuesta inicial basada en necesidades identificadas de los frontends.
> Sujeto a refinamiento en fases posteriores.

### Products
```
GET    /api/products          → Listar productos (con filtros: categoria, search, page)
GET    /api/products/:id      → Obtener producto por ID
POST   /api/products          → Crear producto (futuro)
PUT    /api/products/:id      → Actualizar producto (futuro)
DELETE /api/products/:id      → Eliminar producto (futuro)
```

### Categories
```
GET    /api/categories        → Listar categorías con subcategorías
GET    /api/categories/:id    → Obtener categoría por ID (con productos)
```

### Offers
```
GET    /api/offers            → Listar productos en oferta (con precio anterior y % descuento)
```

### Search
```
GET    /api/search?q=termino  → Buscar productos por término
```

### Contact
```
POST   /api/contact           → Enviar formulario de contacto
```

---

## 10. Constantes Globales

| Constante | Valor |
|-----------|-------|
| `BRAND_NAME` | "Hipermercado Superior" |
| `CONTACT_EMAIL` | soporte@hipermercadosuperior.com |
| `SITE_URL` | https://hipermercadosuperior.com |
| `STORAGE_KEY` (carrito) | `carrito` (ambos frontends) |

---

## 11. Próximos Pasos (Fase 2)

### 11.1 Crear API Contract

Antes de implementar, crear `docs/API-CONTRACT.md` que defina:
- Formato de request y response para cada endpoint
- Códigos de error estandarizados
- Reglas de paginación y filtrado
- Formato de respuestas (`data`, `meta`, `error`)

### 11.2 Implementar Products API

Módulo **Products** completo siguiendo el contrato definido:

```
src/modules/products/
├── routes/
│   └── product.routes.js
├── controllers/
│   └── product.controller.js
├── services/
│   └── product.service.js
├── repositories/
│   └── product.repository.js
└── data/
    └── products.data.js    # Migrar los 184 productos aquí
```

Endpoints:
- `GET /api/products` → Listar productos (con filtros: category, search, page)
- `GET /api/products/:id` → Obtener producto por ID

Datos en memoria inicialmente, preparados para migrar a MongoDB en fase futura.