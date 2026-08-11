# F5.0 — Contract Integration Audit

> **Estado**: F5.3.1 CLOSED/CHECKPOINT · **Fase**: F5 (integración de storefronts
> contra el backend real) · Backend **congelado** (solo se modifica ante
> incompatibilidad contractual genuina compartida por Angular **y** Next.js).
>
> **F5.3.1 = Categories integradas** (detalle en **§10.5**): Angular y Next.js
> consumen `GET /api/categories` con `slug` como única identidad. Nav,
> subcategorías, secciones de categoría, breadcrumbs y filtros de ofertas migrados
> a API. Banners conservan autoría local con slugs validados; sitemap permanece
> local. Backend intacto: **938/938**. **F5.3.2 Search**: auditoría/contrato
> redactada (§11) y pendiente de aprobación para implementar.
>
> **F5.3.0 = auditoría documental de Categories y Search** (contrato real
> verificado contra el **código** del backend y el **código** de ambos
> storefronts, no solo contra API-CONTRACT). F5.3.0 **solo documenta**; no
> modifica ningún storefront ni el backend. Estado por storefront y backlog de
> migración: **§10**.
>
> Consumidores auditados:
> - Angular: `pre-advanced-websites-hypermarket-angular`
> - Next.js: `pre-advanced-websites-hypermarket-next`
> - Backend: `backend-advanced-websites-hypermarket-express-mongodb`

---

## 0. Decisiones fijadas (aprobadas)

1. **Categories → `category.slug` como identidad frontend.**
   - Backend: `slug` = identidad navegable. El `id` **no es fiable como forma**
     (seed: `_id === slug`; API-created: `randomUUID()` → ver §2) — el frontend
     **nunca** depende de `id`.
   - Frontend: ruta `/{category.slug}` (URLs semánticas).
   - No se transforma `id` en un falso id frontend.

2. **Products → backend paginado; no cargar 184 artificialmente.**
   - Home/carousels → requests específicos o páginas pequeñas.
   - Category → `category=slug` + paginación.
   - Search → argumentos + paginación (cuando aplique).
   - Listing → paginación `page`/`limit`.
   - Detail → `GET /:id?lang=`.
   - Si una sección necesita >100 productos, se hacen múltiples requests; **no**
     se aumenta `MAX_LIMIT` del backend por conveniencia del frontend.

3. **Backend-invariante:**
   - Angular y Next.js son dos consumidores del mismo contrato.
   - Si Angular necesita algo que Next.js no necesita → se resuelve en el
     mapper/adapter del frontend; no se modifica el backend.
   - Solo si aparece una incompatibilidad contractual genuina compartida por
     ambos → se **detiene** la ejecución, se registra el hallazgo y se revisa el
     contrato antes de tocar el backend.

---

## 1. Productos y detalle

### GET /api/products

**Query params (contract F1/F4):**
`page` (≥1), `limit` (default 50, max 100, clamp [1,100]), `lang` (es|en),
`category` (`category.slug`), `brand` (`brand.slug`), `q` (name), `status`
(no amplía el catálogo: fuerza `active`), `sortBy` (`name|price|createdAt|updatedAt`),
`sortOrder` (`asc|desc`).

**Response (real):**
```json
{
  "success": true,
  "data": [ "PublicProduct[]" ],
  "pagination": { "page": 1, "limit": 50, "total": 184, "pages": 4 }
}
```

`PublicProduct` (`src/types` layer + presenter):
```ts
{
  id: string;            // slug actual en seed (F5.0 nota: coincide con slug)
  sku: string;
  name: string;          // localizado con ?lang=
  description?: string;  // localizado con ?lang=
  price: number;
  image: string | null;  // ver [Hallazgo B]
  categoryId: string;    // = category.slug (data seed)
  category: { name: string; slug: string };
  brandId?: string;
  brand?: { name: string; slug: string };
  unit?: string;
  unitQuantity?: number;
  status: "active" | "inactive";
  isAvailable: boolean;
  createdAt: Date; updatedAt: Date;
}
```

> La lista pública **solo** devuelve productos `active + isAvailable: true`.
> `?status=inactive` devuelve lista vacía.

### GET /api/products/:id

- `?lang=es|en` localiza `name`/`description`.
- 404 si no existe o no es visible públicamente.

**Mapper → Angular/Next UI** (`Product` del storefront):
| UI (Angular/Next) | API |
|---|---|
| `id` | `id` |
| `name` | `name` (localizado) |
| `url` | generada `/product/${id}` (no del backend) |
| `categoria` | `category.slug` |
| `precio` | `price` |
| `precioTexto` | formato local (`price` + `unit`/`unitQuantity`) — no se pide al backend |
| `imagen` | `image` (resuelta; ver Hallazgo) |
| `unidad` / `quantity` | `unit` / `unitQuantity` |
| `oldPrice` / `discountPercentage` | de `/api/offers` (client-side) |

---

## 2. Categories

### GET /api/categories

**Response (real):**
```json
{
  "success": true,
  "data": [
    {
      "id": "UUID",
      "name": "Alimentos",
      "slug": "alimentos",
      "subcategories": [ { "name": "Bebidas", "slug": "bebidas" } ]
    }
  ]
}
```

> **Contract real (verificado en `category.repository` / `category.service` /
> `category.controller`):** `Category = { id, name, slug, subcategories }`.
>
> - `id` = identidad interna; `slug` = identidad navegable. **Matiz F5.3.0
>   (verificado en código):** en el seed actual `_id === slug` — el `id` **NO** es
>   UUID; solo las categorías creadas por `POST /api/categories` usan
>   `randomUUID()`. El storefront **nunca** debe depender de la forma de `id`:
>   la identidad estable de navegación es `slug`.
> - `subcategories[].slug` == slug del producto (`category.slug`).
> - El endpoint **no soporta `?lang=`** ni traduce `name`: los storefronts
>   mantienen `categories.{slug}` / `categories.sub.{slug}` client-side (§5).
>
> ### GET /api/categories/:id
>
> - `:id` = `_id` (slug en el seed; UUID si la categoría fue creada por API).
>   Requiere conocer el id → fuerza un segundo request o un lookup;
>   **recomendación: usar slugs** al consumir (decisión 1) y buscar el parent en
>   la lista por `slug`.
> - Escritura (`POST` / `PATCH` / `DELETE`) protegida por
>   `authMiddleware + authorizeRole("admin")` → fuera de alcance F5 (solo lectura).

**Mapper frontend:**
| UI (Angular/Next) | API |
|---|---|
| `Category.id` (slugs actuales del mock) | `slug` |
| `Category.name` | `name` |
| `Subcategory.href` (`#slug`) | `subcategories[].slug` |
| `Category.href` (`/categorias/{slug}`) | generada desde `slug` |

**Hallazgo a resolver en F5.0 (`categoryId` vs `category.slug`):**
- Los productos seed llevan `categoryId: raw.category` = el **slug de
  subcategoría** (ej. `"bebidas"`) y `category.slug` idem (`"bebidas"`).
- Las **categorías padre** (`alimentos`, `tecnologia`) tienen slug distinto al
  de los productos. La página de categoría del frontend navega por slug **padre**
  y muestra secciones por subcategoría (`#slug`).
- => El frontend debe:
  1. cargar `/api/categories` → localizar el parent por su `slug`;
  2. para cada subcategoría, pedir `GET /api/products?category=<sub.slug>`;
  3. recomponer las secciones (carousels) del frontend.
- No se requiere cambio de backend (los productos ya filtran por `category.slug`).

---

## 3. Search

### GET /api/search?q=&category=&lang=

**Response (real, verificado en `search.controller` / `search.service` /
`product.repository.search()`):** `{ success: true, data: PublicProduct[] }`
(sin paginación).
- `q` **obligatorio** (vacio → `InvalidDataError`, HTTP 400): el cliente **no**
  debe llamar al API con `q` vacío.
- `category` usa `category.slug` (subcategoría); `lang` localiza `name`/`description`.
- **Sin límite ni paginación:** devuelve el array completo de coincidencias.
- Mismo filtro de visibilidad que Products (`active + isAvailable`).

**Gap F5 (`?lang=` en search por nombre):** `product.repository.search()` busca
sobre `name` raíz (ES) vía `$text`/regex; con `?lang=en` la búsqueda **no**
indexa el nombre EN (solo la respuesta se localiza). Gap aceptado (ver §10.3).

---

## 4. Offers

### GET /api/offers?lang=

**Response (shape OfferResponse, contract F2):**
```ts
{
  id: string;          // product id
  name: string;        // localizado
  price: number;       // = discountPrice (precio final)
  originalPrice: number;  // numbers, no strings
  discountPrice: number;
  discountPercentage: number;
  image: string | null;
  categoryId: string;
  unit?: string;
  unitQuantity?: number;
}
```

**Mapper frontend:**
| UI (Angular/Next) | API |
|---|---|
| `precio` | `price` |
| `oldPrice` (string display) | formateado desde `originalPrice` client-side |
| `discountPercentage` | `discountPercentage` |
| `isOffer` | `true` (viene de `/offers`) |

No se pide al backend `oldPrice` como string ni `precioTexto` (decisión F2
mantenida).

**Nota de cantidad de ofertas:** backend solo emitirá ofertas activas con
producto visible; el mock tenía 7. Compatible.

---

## 5. i18n

- Ambos storefronts mandan `?lang=<idioma activo>` en todos los GET (es/en).
- `name`/`description` llegan ya localizados (fallback al root/es en backend).
- Las claves i18n de producto (`products.{id}.name|description`) **dejan de ser
  la fuente** (quedan como fallback en modo mock). No se borran los `.json`.
- Categorías: el backend no traduce `category.name`; los storefronts mantienen
  `categories.{slug}` / `categories.sub.{slug}` client-side.

---

## 6. Imágenes / CDN — Hallazgo registrado (contrato real)

**En producción planificada (flujo F1):** una imagen confirmada tiene
`imageKey`; `image` → `getStorageProvider().getPublicUrl(imageKey)` + `cacheBust`
(`?v=updatedAt`). Para R2/CDN devuelve `https://cdn...`.

**En el catálogo seedado (184 productos):** los productos **no tienen
`imageKey`**. El `presenter` cae en `return product.image ?? null`, y `image`
en la seed es el **raw key** (`products/bebidas/coca-cola.avif`), no una URL.
Con local provider: `GET /uploads/<key>`). Con R2/CDN la URL pública se forma
desde el key.

→ **Hallazgo (registrado, pendiente de decisión):** el contrato público promete
(API-CONTRACT §5) `image` como URL pública con cache-bust; hoy los 184 productos
seed emiten un **key relativo**, no una URL. Impacto: Angular/Next no pueden
renderizar `image` tal cual sin resolver el key contra su base/local/uploads o
contra el CDN. **Se debe decidir si**: (a) el seed/función published llena
`image` con URL pública (cambio backend: requiere aprobación conjunta); o (b)
el adapter frontend compone la URL (según storageProvider local y domin
CDN). Recomendación: (b) para F5 sin tocar backend; el (a) como hallazgo
contractual si ambos consumidores lo necesitan de verdad.

---

## 7. Compatibilidad Angular vs Next (mismas reglas)

- Ambos consumen `GET /api/products`, `/:id`, `/api/categories`,
  `/api/search`, `/api/offers` con `?lang=`.
- Ambos mappers son análogos; ningún endpoint se usa en un solo frontend.
- Estados exigidos por ambos: loading / error / empty (invariante: loader
  real, mensajes i18n `error.*`).

---

## 8. Fuera de alcance (fase posterior)

- Cart, Auth, Orders, Checkout → fase posterior con su propia auditoría de
  contratos (se conservan los «read-only / provisional» de API-CONTRACT §15).
- Brands → no hay feature en ninguno de los dos; `GET /api/brands` queda
  disponible para su decisión posterior.

---

## 9. Verificación y cierre de F5

1. `npm run build` / typecheck / tests de **cada** storefront.
2. `npm test` backend debe quedar **idéntico** (938 tests) — backend invariante.
3. Backend local + pruebas de integración reales contra el API + smoke tests
   manuales (home, listado, detalle, búsqueda, ofertas, cambio de idioma).
4. Auditoría independiente F5 (igual que F1-F4).
5. Criterio de cierre: los 4 dominios del catálogo se mapean 1:1 con
   API-CONTRACT §5/§6/§7/§8 sin modificar el backend.
6. Sub-fase F5.3.0 (Categories & Search): criterio de cierre en **§10.4**.

---

## 10. F5.3.0 — Categories & Search: estado por storefront y backlog

> **Solo auditoría/documentación.** Documenta, verificado contra el **código** de
> ambos storefronts, el estado actual (todavía en **mock**) de Categories y
> Search, y el backlog concreto para su migración al contrato real de §2/§3.
> F5.3.0 **no implementa**: no se modifica ningún storefront ni el backend
> (se mantienen los **938 tests**).

### 10.1 Estado actual por storefront

**Angular (`pre-advanced-websites-hypermarket-angular`):**

| Consumidor | Fuente actual (F5.3.0) | Gap |
|---|---|---|
| Nav desktop/tablet/mobile (`features/navigation/**`) | mock `data/categories.data.ts` | Sin llamada a `/api/categories` |
| Página de categoría (`features/category/category-page.component.ts`) | mock `categories` (validación del id) + secciones desde mock `products`, pero `loading` de `productService.loadProducts` (API) | Mezcla capa mock con capa API; validar el id contra la API (`slug`) |
| Banners del home (`home/components/category-banners-section`) | `CATEGORY_DATA` local (colores/imágenes/keys `home.category_banners.*`) | Se conserva autoría local; solo se validan slugs contra API (§10.3) |
| Breadcrumb product-page (`features/product/product-page.component.ts`) | `categories.{product.categoria}` — trata `categoria` (= **sub**slug, ej. `bebidas`) como key de categoría | **Roto**: no existe `categories.bebidas*`; falta lookup del parent vía API |
| Filtros de ofertas (`offer-filters.service.ts`) | mock `categories` + `subcategorySlugFromHref` | Migrar fuente a API |
| Search typeahead (`features/search/search.service.ts`) | mock `products.data` (filtro en memoria) | Sin fetch; `isSearching` rama muerta (nunca `true`); sin señal de error |
| Search page `/search` (`search-page.component.ts`) | mock `products` + `matchesSearchQuery` (solo compara ES) | Discrepancia de idioma con el typeahead (este usa `products.{id}.name`) |
| Capa API (`core/api/api.service.ts`) | `search()` y `getCategories()` existen **sin consumidores**; `ProductService.getCategories()` es stub `[]` | Cablear |
| `?lang=` | `ApiLangInterceptor` ya estampa `?lang=` en los GET `/api/` | Listo para cuando haya API |

**Next.js (`pre-advanced-websites-hypermarket-next`):**

| Consumidor | Fuente actual (F5.3.0) | Gap |
|---|---|---|
| Nav desktop/tablet/mobile (`src/features/navigation/**`) | mock `services/catalog/categories.ts` | Sin llamada a `/api/categories` |
| Página de categoría (`app/[locale]/(shop)/category/[id]/page.tsx`) | categorías mock; productos ya vía `getProducts({ category })` (F5.2) | `[id]` = slug del mock; validar contra API (`slug`) |
| Breadcrumb product-page (`_components/ProductPageClient.tsx`) | `categories.find(... sub.href.includes('#${categoria}'))` | Ya resuelve parent, pero sobre `href` del mock |
| Banners del home (`CategoryBannersSection.tsx`) | `categoryData` hardcode local | Se conserva autoría local; solo se validan slugs contra API (§10.3) |
| Sitemap (`sitemap.ts`) | categorías y productos desde mock | Se conserva mock (autoría local); slugs de API cuando migre (§10.3) |
| Search page (`SearchPageClient.tsx`) | mock `products` + `normalizarTexto` | Sin uso de `search()` |
| Header autocomplete (`useHeaderSearch.ts`) | mock `products`, `slice(0, 8)` | Sin uso de `search()` |
| Capa API (`src/lib/api-client.ts`) | `search()` y `getCategories()` definidos **sin consumidores**; `search()`/`getCategories()` **sin param `lang`**; falta `mapApiCategoryToCategory` | Cablear + `lang` |

### 10.2 Backlog F5.3.0 (planes por storefront — NO ejecutados)

**Angular (orden sugerido):**
1. `getCategories()` → `mapApiCategoryToCategory`: `id`/`name` desde `slug`/`name`
   del API, `href ← /category/{slug}`, subcat `href ← /category/{slug}#{sub.slug}`;
   `name` renderizado vía `categories.{slug}` con fallback al `name` del API.
2. Implementar `ProductService.getCategories()` (reemplaza el stub `[]`) con cache.
3. Nav x3 + filtros de ofertas + validación de slugs del home: consumir categorías
   del servicio (conservando `CATEGORY_DATA` para la autoría).
4. Category page: validar el id contra la API (`slug`); secciones seguir usando
   `productService.loadProducts({ category: sub.slug })` (params ya soportan `category`).
5. Breadcrumb product-page: lookup del parent por `product.categoria`
   (= `category.slug`/subslug) contra la lista de categorías API.
6. Search: cablear typeahead + search-page a `ApiService.search(q, { lang })` con
   guard de `q` vacío (no llamar al API), activar `isSearching` (desbloquea la
   rama muerta), señal de `error` y `empty`.
7. Unificar idioma typeahead vs página (ambos con nombre localizado por `?lang=`).

**Next.js (orden sugerido):**
1. `api-client.ts`: añadir `lang?` a `search()` (y `getCategories()` si se necesita
   para SEO/nombres); crear `mapApiCategoryToCategory` (deriva `href` y `#sub.slug`).
2. Nav x3: consumir `getCategories()` (reemplaza el import del mock).
3. Category page: resolver categoría por `slug` desde la API (`notFound()` si no
   existe); secciones ya con `getProducts({ category })`.
4. Breadcrumb product-page: resolver parent/sub a partir de categorías API
   (`product.category.slug` del producto vs `sub.slug`).
5. Search page + `useHeaderSearch`: llamar `search(q, { lang })` (con debounce en
   el typeahead); estados loading/error/empty ya presentes; mantener
   `enrichWithOffer`.
6. Sitemap: mantener obtención desde mock conservando la estructura; al migrar,
   slugs desde `getCategories()` (§10.3).

### 10.3 Decisiones registradas (F5.3.0)

- **Categories:** `slug` = identidad de navegación del storefront (**nunca** `id`;
  el seed tiene `id === slug`, pero la forma de `id` no es fiable).
- **Search:** sin paginación y con `q` obligatorio; el cliente no llama con `q`
  vacío y no asume ningún límite en la respuesta.
- **`?lang=`:** localiza la respuesta, pero **no internacionaliza el índice de
  búsqueda** (regex/`$text` sobre `name` raíz ES). Gap aceptado.
- **Angular y Next:** backlog **separado y concreto** (§10.2), migración
  independiente por storefront.
- **Banners del home y sitemap:** conservan **autoría local** (colores/imágenes/
  keys `home.category_banners.*`, estructura del sitemap); sus referencias a
  categorías (slugs/hrefs) se validan contra `GET /api/categories`.
- **Backend sin modificaciones:** se mantienen los **938 tests**; F5.3.0 no toca
  backend.
- **F5.3.0 es solo auditoría/documentación:** no se implementa en los storefronts.

### 10.4 Criterio de cierre F5.3.0

1. `F5-CONTRACT-AUDIT.md` refleja el contrato real de Categories y Search
   (verificado en el **código** del backend, no solo en API-CONTRACT).
2. Estado por storefront y backlog quedan documentados y son accionables
   (§10.1 / §10.2).
3. Decisiones de identidad (`slug`), autoría local y backend invariante quedan
   explícitas (§10.3).
4. Siguiente paso: **revisar el diff de esta auditoría y hacer una auditoría de
   F5.3.0**, antes de autorizar **F5.3.1 Categories**.

### 10.5 F5.3.1 — Categories integradas (CLOSED/CHECKPOINT)

> **F5.3.1 = implementación de Categories contra el backend real** en Angular y
> Next.js, siguiendo el backlog de §10.2 y las decisiones de §10.3. Commits
> separados por storefront. Backend sin modificaciones (**938/938 tests**).

**Angular (commit `bf45318`, `feat(categories): F5.3.1 integrate categories with real backend API`):**
- `core/api/category.mapper.ts` (+spec): `ApiCategory → CategoryUI`; `id ← slug`
  (nunca `id` del backend), `href ← /category/{slug}`, subcat `href ← /category/{slug}#{sub.slug}`.
- `ProductService` como hub: signals `categories/categoriesLoading/categoriesLoaded`/
  `categorySections/categorySectionsLoading`; `loadCategories()` con cache
  (reemplaza el stub `[]`); `loadCategorySections(category)` respeta la paginación
  del backend (`LIMIT=100`, paginando si `total > limit`); `fetchAllProductsInCategory`.
- Nav desktop/tablet/mobile + header: mock → `ProductService.categories` (template `categories()`).
- Category page: categoría y secciones desde API; validación por `slug`; not-found
  y re-SEO mediante effects; sin imports `@data` para datos funcionales.
- Breadcrumb product-page: lookup del parent por `product.categoria` vs
  `subcategorySlugFromHref` con fallback al comportamiento previo.
- Banners del home: `CATEGORY_DATA` filtrado por slugs válidos de API (autoría local conservada).
- Filtros de ofertas: `categories as CATEGORIES` (mock) → `ProductService.categories()`.
- Tests: **94 en verde** (12 archivos); `ng build` OK.

**Next.js (commit `93fdbca`, `feat(categories): F5.3.1 integrate categories with real backend API`):**
- `src/lib/api-client.ts`: `mapApiCategoryToCategory`/`mapApiCategoriesToCategories`
  (`id ← slug`); `fetchCategories()` (try/catch → `[]`, nunca rompe SSR);
  `getAllCategoryProducts(category, limit=100)` con paginación según `total` real.
- Categorías fetcheadas en `[locale]/layout.tsx` (server) → `CartLayout` → `Header`
  → `DesktopNav`/`MobileNav`/`TabletNav` (props; sin imports mock).
- Category page: `getCategories()` + `notFound()` por slug; secciones paginadas
  (`getAllCategoryProducts`); títulos via `getSubcategoryName` (i18n con fallback).
- Breadcrumb product-page: `categories` por prop desde `product/[id]/page.tsx`.
- Offers: `offers/page.tsx` (server) → `OffersPageClient` → `useOfferFilters`/`OfferFilters`
  con categorías API.
- Banners del home: `CategoryBannersSection` recibe `categories` y filtra
  `categoryData` por slug derivado de `href`.
- Sitemap: **permanece mock** (autoría local, sin dependencia backend en build-time).
- Verificación: `next build` OK (rutas dinámicas); lint limpio en archivos F5.3.1
  (queda solo el error pre-existente de `useIsMobile.ts`); smoke end-to-end con
  backend real: nav 8 categorías, secciones por slug (ES/EN), filtros de ofertas,
  breadcrumb `…/alimentos#carnes-pescados-mariscos`, banners validados.

**Veredicto F5.3.1:** `F5.3.1 CLOSED/CHECKPOINT - Categories integradas con
backend real en Angular + Next.js. Identity = slug. Navigation, subcategories,
category sections, breadcrumbs y offer filters consumen API. Banners conservan
autoría local con slugs validados. Sitemap permanece local. Backend intacto:
938/938.`

**Pendiente → F5.3.2 Search:** empezar por su auditoría/contrato (sin asumir que
el `?lang=en` del backend implica búsqueda semántica en inglés; el índice no se
internacionaliza, gap aceptado en §10.3).

---

## 11. F5.3.2 — Search: contrato real y estado por storefront (auditoría)

> **Solo auditoría/documentación.** Verificado contra el **código** real del
> backend (`src/modules/search/**`, `src/modules/products/repositories/product.repository.ts`)
> y el **código** de ambos storefronts. F5.3.2 **todavía no implementa**: no se
> modifica ningún storefront ni el backend (se mantienen los **938 tests**).

### 11.1 Estado actual por storefront (F5.3.2)

**Angular (`pre-advanced-websites-hypermarket-angular`):**

| Consumidor | Fuente actual | Gap |
|---|---|---|
| Typeahead header (`features/search/services/search.service.ts`) | mock `@data/products.data`; matching bilingüe ES+EN vía `products.{id}.name` + `normalizarTexto` (acentos); `slice(0,8)` | `isSearching` nunca pasa a `true` (rama muerta); sin señal de error; sin fetch |
| Search page (`features/search/components/search-page/search-page.component.ts`) | mock `products` (+ `offersData` para badges) + `matchesSearchQuery` (name ES + translatedName) | Sin fetch; SEO effect sí local |
| Capa API (`core/api/api.service.ts`) | `search(q, category)` definido **sin consumidores**; `ApiLangInterceptor` ya estampa `?lang=` | Cablear |

**Next.js (`pre-advanced-websites-hypermarket-next`):**

| Consumidor | Fuente actual | Gap |
|---|---|---|
| Typeahead header (`features/search/hooks/useHeaderSearch.ts`) | mock `services/catalog/products`; matching bilingüe vía `tProducts('products.{id}.name')` + `normalizarTexto`; `slice(0,8)` | Sin fetch; sin estados loading/error sobre API |
| Search page (`features/search/components/SearchPageClient.tsx`) | mock `products` + filter `normalizarTexto` sobre name ES + translatedName (key i18n); `enrichWithOffer` | Sin fetch |
| Search route (`app/[locale]/(shop)/search/page.tsx`) | lee `?q=` y lo pasa al cliente | Server no hace búsqueda |
| Capa API (`src/lib/api-client.ts`) | `search(q, category)` definido **sin consumidores** y **sin param `lang`** | Cablear + `lang` |

### 11.2 Contrato real de `GET /api/search` (verificado en código)

- **Firma:** `GET /api/search?q=&category=&lang=` → `{ success, data: PublicProduct[] }`.
- **`q` obligatorio:** sin `q` o solo espacios → `InvalidDataError` (**400**, "Search
  term is required").
- **`category` opcional:** filtra por `category.slug` (`trim().toLowerCase()`).
- **Matching — SOLO sobre el `name` raíz ES:**
  - 1 palabra → `$regex` `escapeRegExp(term)` + `options: "i"` (mayúsculas/minúsculas,
    **sin** normalización de diacríticos: "cafe" no coincide con "Café").
  - N>1 palabras → `$text` (índice `name: "text"` del modelo, única campo indexado)
    ordenado por `textScore`; si `$text` no devuelve nada → fallback regex (en la
    práctica vacío para frases completas).
- **`lang`:** `normalizeLang` (solo `es`/`en`); **localiza la respuesta**
  (`name`/`description` vía `toPublicProduct`), **no internacionaliza el índice** de
  búsqueda. No existe búsqueda semántica en inglés. **Gap aceptado.**
- **Gate de visibilidad:** `status: 'active' && isAvailable: true` (producto público).
- **Sin paginación** (a diferencia de `GET /products`); se devuelven todos los hits.
- **Imágenes:** resueltas en el presentador (`resolvePublicImage`), igual que F5.2.

### 11.3 Decisiones registradas (F5.3.2)

- **No asumir `?lang=en` = búsqueda semántica en inglés.** El matching es solo
  `name` raíz ES; EN se limita a *mostrar* nombres/descripciones localizados
  (`?lang=` o claves i18n `products.{id}.name`).
- **`q` vacío:** el cliente no llama al API (guard local `hasSearchQuery`), evitando
  el 400; tipo de "sin resultados" se resuelve por coincidencia (no por error).
- **Diacríticos:** el backend no normaliza acentos. Límite del contrato: la
  coincidencia es contra el texto ES tal cual está almacenado. El cliente puede
  recortar/limpiar el término, pero no se garantiza insensibilidad a acentos server-side.
- **Sin paginación:** el cliente consume todos los hits; el typeahead conserva el
  límite visual de 8 (`slice(0,8)`); la search page muestra la grilla completa.
- **Reuso de mappers:** resultados API (`PublicProduct[]`) → modelo de producto del
  storefront con `mapApiProductsToProducts`; badges de oferta con `enrichWithOffer`
  (Next) / `offer-filters` (Angular).
- **Backend sin modificaciones:** se mantienen los **938 tests**.

### 11.4 Backlog F5.3.2 (planes por storefront — NO ejecutados)

**Angular (orden sugerido):**
1. `ProductService` (o `SearchService`) → `searchProducts(q, category?)` con guard de
   `q` vacío y señales `idle/loading/error/empty`; reutiliza `mapApiProductsToProducts`.
2. Typeahead: `SearchService.searchResults` deja de filtrar el mock; pide a la API con
   debounce, activa `isSearching` (desbloquea la rama muerta) y expone `error`/`empty`.
3. Search page: `results` desde la API sincronizados con `?q=` (loading skeleton +
   error/empty); SEO local se mantiene.
4. Migración de search del admin (si aplica a storeGrain) y limpieza de imports mock
   `@data/products.data` / `@data/index` en consumidores de search.

**Next.js (orden sugerido):**
1. `api-client.ts`: añadir `lang?` a `search()` (alineado al interceptor de Angular).
2. `useHeaderSearch`: sustituir el filtro del mock por `search(q)` con debounce y
   estados loading/error + `slice(0,8)`.
3. `search/page.tsx` (server): guardar `q` vacío → no llamar; buscar con `search(q, { lang })`
   y pasar resultados a `SearchPageClient`; quitar mock `products`.
4. `SearchPageClient`: renderiza resultados API con `enrichWithOffer`; limpieza de
   imports mock en consumidores de search.

### 11.5 Criterio de cierre F5.3.2

1. **0 imports mock** en consumidores de search (typeahead + search page) de Angular y Next.
2. **Guard de `q` vacío:** ninguna petición real al API con `q` vacío en ningún storefront.
3. **Estados `loading`/`error`/`empty`** implementados y visibles en ambos storefronts.
4. **`GET /api/search` realmente consumido** (verificación por smoke/red real, no solo
   por tipo).
5. **Backend intacto:** 938/938 tests sin cambios en el repositorio del backend.