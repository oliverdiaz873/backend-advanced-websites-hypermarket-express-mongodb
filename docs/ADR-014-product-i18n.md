# ADR: Traducciones de productos en MongoDB

- **Estado**: Aceptado
- **Fecha**: F0.0
- **Decisión durante**: Integración real de ecommerce · Plan maestro (F1/F3/F4)

## Contexto

Existen **dos storefronts** (Angular con `ngx-translate` y Next.js con
`next-intl`) que hoy mantienen el nombre/descripción de cada producto en **claves
i18n locales** (`products.{id}.name|description`) en ES y EN, con los datos
estructurales en arrays estáticos (`products.data.ts`).

Al pasar el catálogo al backend, el nombre/descripción de un producto son **datos
de catálogo**, no de presentación. Si cada storefront mantuviera sus propias
claves, habría dos fuentes de verdad del mismo contenido y riesgo de deriva.

## Decisión

1. **El nombre y la descripción viven en MongoDB**. El modelo real (F3/F4) es:

   ```json
   {
     "name": "Café Superior",              // idioma por defecto (es)
     "description": "...",
     "translations": {
       "en": { "name": "Premium Coffee", "description": "..." }
     }
   }
   ```

   - Los campos raíz `name`/`description` son el **idioma por defecto (es)**,
     tal como los consume el Dashboard y las lecturas sin `lang`.
   - `translations.<lang>` guarda traducciones adicionales; en F3/F4 se siembra
     y administra **solo `en`**. No se administra `translations.es` en el
     boundary editorial (el ES vive en los campos raíz).
2. La API pública acepta `?lang=es|en` y resuelve `translations[lang]` con
   fallback al valor raíz.
3. **Cada storefront sigue haciendo su propio mapping** (API → modelo UI local);
   el backend no se adapta a ningún frontend.
4. Los textos de **presentación** (specs/detalles, breadcrumbs, unidades de
   medida) permanecen en las claves i18n de cada storefront; no se trasladan al
   catálogo en esta fase.

> **Contrato histórico de creación** (`POST /api/products`): acepta
> `translations` con `es` **y** `en` (como se documentó originalmente). F4 no
> redefine ese contrato; el modelo EN-only de editorialización es exclusivo de
> `PATCH /api/admin/products/:id`. Por tanto el documento almacenado puede
> contener `translations.es` (creado por POST) aunque el Dashboard solo edite
> `en`.

## Opciones consideradas

| Opción | Valoración |
| --- | --- |
| Storefronts con claves i18n locales (hoy) | Fuentes de verdad duplicadas; cualquier cambio de nombre debe replicarse en 2+ proyectos. |
| **Translations en MongoDB (elegido)** | Un solo lugar para contenido de catálogo; ambos storefronts consumen lo mismo. |
| Híbrido (backend solo identidad/precio; storefront con claves) | Menos migración, pero mantiene la deriva de contenido que se quiere eliminar. |

## Consecuencias

- La seed incorpora traducciones EN (**F3 cumplida**) a partir de las claves
  i18n de ambos storefronts mediante `npm run sync:i18n`
  (`scripts/sync-i18n.ts` → `src/modules/products/data/products.i18n.data.ts`),
  verificada idéntica 184/184 en Angular y Next.js.
- El Dashboard debe poder editar `translations` a través del boundary
  administrativo (F4): `translations.en` se edita en
  `PATCH /api/admin/products/:id` con merge no destructivo; el ES editorial se
  edita en los campos raíz `name`/`description`. El `POST /api/products`
  histórico sigue aceptando `es` + `en` al crear.
- Los storefronts dejan de ser la fuente del nombre/descripción en producción;
  sus claves quedan como fallback para modo mock.
- Las categorías no se traducen en el backend en esta fase: los storefronts
  localizan nombres de categoría client-side por slug.

## Referencias

- `docs/API-CONTRACT.md` §5 — contrato con `?lang=` y `translations`.
- `docs/PRODUCT-IMAGES-MIGRATION.md` — migración de claves i18n a la seed.
- `scripts/sync-i18n.ts` — generador determinista de `productsI18nEn` (F3).
