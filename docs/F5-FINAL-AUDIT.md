# F5.0 — Final Audit (transversal)

> **Estado**: F5 **CLOSED / APPROVED** — **Fase**: F5 (integración de storefronts
> contra el backend real) — Backend **intacto** desde `746a7a6` (cierre F4).
>
> Este documento es la **fuente transversal** del cierre F5 y sintetiza la
> auditoría documental de Products, Categories, Search, Offers, i18n, Images y
> mock residual en **Angular** (`pre-advanced-websites-hypermarket-angular`),
> **Next.js** (`pre-advanced-websites-hypermarket-next`) y el **backend**
> (`backend-advanced-websites-hypermarket-express-mongodb`).
>
> **Naturaleza del documento**: auditoría/trabajo, **sin commit en este
> checkpoint** (untracked), misma política que `API-INTEGRATION.md` (Angular y
> Next.js) y `F5-CONTRACT-AUDIT.md` (backend).

---

## 0. Resumen de cierre

| Métrica | Resultado |
| --- | --- |
| P0 | **0** |
| P1 | **0** |
| Fuga de campos internos en respuestas públicas | **No** |
| Dependencias cross-repo en runtime | **0** |
| Backend intacto desde `746a7a6` | **Sí** (cero cambios contractuales durante F5) |
| P2 / P3 | Documentados y **DEFERRED** (ver §4 y §5) |
| F5-post (Featured/Home + sitemap estático) | Aceptado y documentado (§8) |

**Veredicto**: no existe deuda que bloquee la apertura del siguiente dominio
(Cart/Auth/Orders). Los hallazgos P2/P3 quedan en este documento y **no** se
corrigen de forma silenciosa durante la siguiente fase.

---

## 1. Evidencia por repositorio

### Backend: `backend-advanced-websites-hypermarket-express-mongodb`
- HEAD `746a7a6` (`feat(products): close F4 admin editorial boundary and EN-only translations`).
- Worktree limpio salvo `docs/F5-CONTRACT-AUDIT.md` (untracked).
- Cero modificaciones contractuales acumuladas durante toda la fase F5.
- Boundary: `toPublicProduct` expone exactamente los 16 campos del contrato
  público; campos internos (`translations`, `imageKey`, `imageThumbnailKey`,
  `auditId`) quedan en el boundary admin y **no** se filtran al público (grep
  en mappers de ambos storefronts limpio).

### Angular: `pre-advanced-websites-hypermarket-angular`
- Commits F5: `ae14152` (HTTP infr + image resolver), `5f4bb5c` (Products/detail),
  `bf45318` (Categories), `6e67f02` (Search), `8472414` (fix infinite refetch),
  `2519a55` (Offers), `4b13f6c` (docs F5-post).
- Worktree limpio salvo `docs/API-INTEGRATION.md` (untracked).

### Next.js: `pre-advanced-websites-hypermarket-next`
- Commits F5: `eb4a9fd` (HTTP client + resolver + remote images),
  `318bee1` (Products/detail + category products), `93fdbca` (Categories),
  `20562ca` (Search), `007efd1` (Offers), `9648491` (de-mock + discount utils),
  `dccdb39` (docs), `f90aa39` (offer enrichment no-fatal).
- Worktree limpio salvo `docs/API-INTEGRATION.md` (untracked).

---

## 2. Tabla transversal F5

| Área | Angular | Next.js | Backend | Estado |
| --- | --- | --- | --- | --- |
| Products | V: mappers sin fuga, paginación (≤100/50), `?lang` vía interceptor, image resolver, mappers filtran `active+isAvailable` | V: mapper, paginación, SSR try/catch; `image:null → src=""` rotura potencial (P2/P3); `?lang` NO en `getProducts/getProduct` (rescatado por overlay i18n) | V: `toPublicProduct` 16 campos, gate `active+isAvailable`; expone `sku`+`status` (divergencia documentada, §4) | **V** |
| Categories | V: `slug`=identidad, rutas frontend por slug, banners con slugs validados | V: `slug`=identidad, breadcrumb y fallback de nombre | V: `slug` público; `GET /:id` por `_id` (Obs §7); sin `?lang` (documentado) | **V** |
| Search | V: guard `q` vacío, estados de carga/vacío, fix refetch `8472414` + spec "fetches exactly once" | V: guard `q` vacío, join de ofertas no-fatal, estados, skeleton | V: `q` vacío → 400; `$text` sobre `name`; gate | **V** |
| Offers | V: única fuente, join por id, badges en 4 vistas, cart sin `offersData`, degradación `[]` | V: joins en servidor, `fetchOffers` no lanza, cart limpio | V: `findAllActive(now)` + visibilidad, `discountPercentage` en servidor | **V** |
| i18n | V: es/en, `?lang` interceptor, `check:i18n`; error de producto hardcodeado ES (P3); precios en-US inconsistente (P3) | V: es/en, `check:i18n`; `?lang` solo en offers/search, no en list/detail (P2) | V: `lang` normalizado, invalid → `es` | **V** |
| Images | V: resolver ok (key → URL; absoluta/data pasan; sin `?v=`) | V: resolver ok; `remotePatterns` solo `localhost` (CDN prod → 400, P3) | Seed emite raw key, no URL pública (decisión `PRODUCT-IMAGES-MIGRATION.md`, Obs §7) | **V** |
| Mock residual | `products.data` muerto, `productPageData` nunca se renderiza, `catalog.helpers` muerto, barrel `@data` muerto; `CATEGORY_DATA` + `subcategorySlugFromHref` vivos-legítimos | `services/catalog/products.ts` vivo en Home featured + sitemap; `productPageData` overlay fallback (con mojibake, P3); sitemap desde catálogo estático | — | **F5-post** |

---

## 3. Hallazgos P2 — deuda con impacto, decisión DEFERRED

> Regla: ninguno de estos hallazgos bloquea Cart/Auth/Orders. Si una futura fase
> necesita tocarlos, debe auditarse contra **Angular + Next.js** primero (§9).

### P2.1 — Next.js: `?lang` ausente en `getProducts` y `getProduct`
- **Localización**: `api-client.ts` (funciones `getProducts`/`getProduct`, ~líneas 255-269).
- La llamada no pasa `?lang=` aunque el contrato público lo soporta (§5 de
  `API-CONTRACT.md`), por lo que `name`, `description` y campos textuales llegan
  en el idioma por defecto (`es`).
- **Mitigación actual**: el overlay i18n `products.{id}.*` localiza los nombres
  cuando el id del backend coincide con una clave de mensajes (los seed ids
  alinean con el catálogo de 184 ítems), p. ej. `/en/product/<slug>` muestra el
  nombre EN en el `h3` mientras el `aria-label` del botón usa el `name` del
  backend (ES) — inconsistencia localizada verificada empíricamente.
- **Impacto**: `description` y productos no-seeded quedan en ES en vistas EN;
  inconsistencia EN/ES en nombres visibles vs. accesibilidad.
- **Decisión**: **DEFERRED**.

### P2.2 — Angular: el cambio de idioma en Search no re-ejecuta la búsqueda
- **Localización**: `search.service.ts` (~líneas 100-104 y 137-143).
- Reinicio del flujo: `onLangChange → searchTrigger.next()` → `combineLatest` →
  `map(([term]) => term)` → `debounceTime` → `distinctUntilChanged`. Como el
  término no cambia, `distinctUntilChanged` filtra el disparo y **no** se
  re-fetcha.
- **Impacto**: tras cambiar `es → en`, los resultados de búsqueda conservan el
  idioma anterior (nombres ES).
- **Decisión**: **DEFERRED**.

### P2.3 — Angular: `api.config.ts` hardcodea `localhost:3000` sin `environments`
- **Localización**: `api.config.ts` (líneas ~9-10); sin `fileReplacements` ni
  `environment.*.ts`.
- **Impacto**: producción apuntaría al backend local; deuda de deploy conocida
  (F4-A), documentada previamente en la integración.
- **Decisión**: **DEFERRED** (fuera del alcance F5).

### P2.4 — Backend: `PublicProduct` expone `sku` y `status`
- **Localización**: `toPublicProduct` / tipo `PublicProduct`.
- Divergencia **documentada** en `F5-CONTRACT-AUDIT.md` (§3, ~líneas 78-91): el
  `status` siempre es `active` por el gate de visibilidad y el `sku` de seed es
  `sku-sku-<id>` (sin valor real). No se filtran por decisión deliberada al
  mantener el contrato; se audita antes del deploy productivo.
- **Decisión**: **DEFERRED** (documentada, no bloqueante).

---

## 4. Hallazgos P3 — deuda menor agrupada

### Deuda de producción / deploy
- Next.js: `next.config.ts` `remotePatterns` solo `localhost:3000/uploads` —
  un CDN de producción (`cdn.hipermercadosuperior.com`) daría **400**.
- Backend + Angular: el seed emite *raw key*, no URL pública (decisión de
  `PRODUCT-IMAGES-MIGRATION.md` §6). Reconcilia antes de deploy productivo.

### Bug potencial
- Next.js: `image: null` → `<Image src="">` rompe el runtime en
  `ProductCard`/`ProductDetailSection` (sin fallback de imagen).

### Bug de calidad
- Next.js: mojibake/bytes inválidos en `productPageData.ts` (fallback sutil en
  carruseles/detalle cuando se aplica).

### Deuda de presentación
- Precios: `$` vs `RD$` + locale `en-US` inconsistente (Angular y Next.js).
- Angular: mensaje de error de carga de productos hardcodeado en ES.

### Código muerto / limpieza (no funcional, solo mundanza)
- Angular: barrel `@data`, `catalog.helpers`, `products.data`, `productPageData`
  (nunca se renderiza), export de `categories` residuales.
- Next.js: barrel `services/catalog` (parcialmente vivo en Home/sitemap).
- Vivos-legítimos (NO son deuda): `CATEGORY_DATA` y `subcategorySlugFromHref`
  (Angular, autoría visual de categorías).

---

## 5. Clasificación decidida (P3 distinta de "bug")

Para que el documento no sea una lista artificial de problemas, cada hallazgo
P3 queda clasificado explícitamente:

| Hallazgo | Clasificación |
| --- | --- |
| `remotePatterns` solo localhost (CDN prod) | **Deuda real de producción** |
| `image: null → src=""` | **Bug potencial** |
| Mozilla/mojibake en `productPageData.ts` (Next) | **Bug de calidad** |
| Precios `$`/`RD$` + `en-US` | **Deuda de presentación** |
| Mock Featured/Home (Angular `FEATURED_IDS` / Next `featuredIds`) + sitemap estático | **F5-post explícitamente aceptado** |
| Search = `$text` Mongo ES-only | **Limitación contractual conocida, no bug de F5** |
| `category` filter del contrato de search sin consumidores | **Observación, no blocker** |

---

## 6. Observaciones contractuales (no bugs de F5)

- **Search**: el índice de búsqueda es `$text` de MongoDB sobre `name` español
  (no Elasticsearch, sin normalización de diacríticos, no internacionalizado).
  Documentado en `F5-CONTRACT-AUDIT.md` (§3 y §10.3).
- **`GET /categories/:id`**: identifica por `_id`, no por `slug`; el frontend
  usa siempre `slug` como forma, nunca `id`.
- **`category` filter**: existe en el contrato de search pero no tiene
  consumidores en Angular ni Next.js.
- **`lang` en `/categories`**: no soportado por el backend (documentado).
- **Carousel por categoría (Next)**: una oferta con `categoryId` raíz
  (`frutas-y-verduras`) quedaría invisible en el filtro de categorías porque el
  match usa solo subcategorías.
- **`tCategories(slug)` sin fallback** (Next): nav/filtros mostrarían el slug
  crudo si el slug no tiene clave en mensajes.
- **Imágenes de seed**: sin `imageKey`, `resolvePublicImage` devuelve la raw
  key, no una URL pública (`F5-CONTRACT-AUDIT.md` §6, pendiente de decisión).

---

## 7. F5-post (aceptada y alineada en docs)

- **Featured / Home**: catálogo/reactivos de mock viven **exclusivamente** en el
  Home (`FEATURED_IDS` en Angular, `featuredIds`/`products.ts` en Next.js).
  Carrusel featured y hero banners consumen catálogo estático; alineado con la
  doc de F5-post de cada storefront.
- **Sitemap (Next)**: generado desde el catálogo estático, no desde la API.
- **Offers ya no usan mock**: único catálogo local restante es el de
  Home/featured y el sitemap. `products.data.ts` (Angular) está **muerto**.

---

## 8. Versiones / commits relevantes

| Repo | Commit F5 clave | HEAD |
| --- | --- | --- |
| Backend | — (congelado) | `746a7a6` (F4) |
| Angular | `8472414` (fix search refetch), `2519a55` (offers), `4b13f6c` (docs F5-post) | `4b13f6c` |
| Next.js | `007efd1` (offers), `9648491` (de-mock), `dccdb39` (docs), `f90aa39` (no-fatal) | `f90aa39` |

---

## 9. Tests / build / typecheck verificados

- **Backend**: `npm test` → **938/938** (86 suites).
- **Angular**: `tsc --noEmit` limpio; `ng test` → **93/93** (12 suiten);
  `check:i18n` → **CLEAN** (184 ítems es + en).
- **Next.js**: `npm run build` OK; `check:i18n` → **CLEAN**.
- Verificaciones hechas durante la auditoría: `?lang` gap (Next) confirmado
  empíricamente en `/en/product/...`; fix de refetch confirmado en ambos
  storefronts; grep de fuga de campos internos limpio en mappers.

---

## 10. Regla de gobernanza

1. **Ningún P2/P3 se corrige silenciosamente** durante Cart/Auth/Orders.
2. Si una fase futura necesita modificar alguno, debe **auditarse primero
   contra Angular + Next.js** (no solo contra el contrato).
3. El backend permanece **congelado** salvo incompatibilidad contractual
   genuina compartida por Angular **y** Next.js.
4. Este documento queda **untracked** como trabajo de auditoría (misma política
   que `API-INTEGRATION.md` y `F5-CONTRACT-AUDIT.md`).

---

## Resultado

```
F5 - CLOSED / APPROVED
P0: 0   P1: 0
Backend: 938/938 intacto desde 746a7a6
Angular: 93/93 | tsc limpio | i18n CLEAN
Next: build OK | i18n CLEAN
Sin leakage público · Sin deps cross-repo
P2/P3 documentados y DEFERRED
F5-post documentado
```

**Siguiente paso**: auditoría contractual de **Cart/Auth/Orders** (empezando
por contrato, no por implementación).