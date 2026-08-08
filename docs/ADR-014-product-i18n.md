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

1. **El nombre y la descripción viven en MongoDB** en un campo `translations`:

   ```json
   {
     "translations": {
       "es": { "name": "Leche Entera", "description": "..." },
       "en": { "name": "Whole Milk", "description": "..." }
     }
   }
   ```

2. Los campos raíz `name`/`description` siguen existiendo como **idioma por
   defecto** (es) para compatibilidad con el Dashboard y lecturas sin `lang`.
3. La API pública acepta `?lang=es|en` y resuelve `translations[lang]` con
   fallback al valor raíz.
4. **Cada storefront sigue haciendo su propio mapping** (API → modelo UI local);
   el backend no se adapta a ningún frontend.
5. Los textos de **presentación** (specs/detalles, breadcrumbs, unidades de
   medida) permanecen en las claves i18n de cada storefront; no se trasladan al
   catálogo en esta fase.

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
- El Dashboard debe poder editar `translations` (ES/EN) al crear/editar producto.
- Los storefronts dejan de ser la fuente del nombre/descripción en producción;
  sus claves quedan como fallback para modo mock.
- Las categorías no se traducen en el backend en esta fase: los storefronts
  localizan nombres de categoría client-side por slug.

## Referencias

- `docs/API-CONTRACT.md` §5 — contrato con `?lang=` y `translations`.
- `docs/PRODUCT-IMAGES-MIGRATION.md` — migración de claves i18n a la seed.
- `scripts/sync-i18n.ts` — generador determinista de `productsI18nEn` (F3).
