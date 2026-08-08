# Ecommerce Data Flow — Producto de extremo a extremo

- **Estado**: Borrador (F0.0)
- **Alcance**: Describe el flujo completo de un producto a través de
  Dashboard → Express → R2 → MongoDB → API → storefronts. Documentación de
  referencia para F0–F7.

---

## 1. Diagrama general

```
┌────────────────────┐
│    Dashboard       │
│     Angular        │
└─────────┬──────────┘
          │ Admin API (JWT + RBAC)
          ▼
┌────────────────────┐
│     Express        │
│       API          │
└────┬─────────┬─────┘
     │         │ presigned URL (PUT directo)
     ▼         ▼
┌──────────┐  ┌──────────────────┐
│ MongoDB  │  │   Cloudflare R2  │
│  datos   │  │    imágenes      │
│ i18n     │  └────────┬─────────┘
└──────────┘           │ CDN / URLs públicas
     │                 ▼
     │          ┌──────────────────┐
     ▼          │    Angular Store │
┌─────────────────────┐           │  Next.js Store │
│  GET /api/products  │           └────────────────┘
│  (público, ?lang=)  │
└─────────────────────┘
```

- **MongoDB** = fuente de verdad de datos (incluidas traducciones).
- **R2** = fuente de verdad de archivos multimedia (compartido por ambos storefronts).
- **Express** = único punto de control de autorización y metadata.

## 2. Flujo: crear producto (Dashboard → R2 → MongoDB → API)

```
1. Admin abre Dashboard → Productos → Crear producto
2. Selecciona imagen desde su computadora (input file + preview)
3. Dashboard valida tipo/tamaño (client-side)
4. POST /api/products { name, price, categoryId, ... } → se crea el DRAFT
   (status: inactive, isAvailable: false, image: null) y responde productId
5. POST /api/admin/uploads/presigned {
     productId, fileName, contentType, purpose: "product" }
   Express autentica (JWT + role admin), valida MIME/extensión y emite:
     key = products/{productId}/{uuid}.{ext}
     → { uploadUrl, publicUrl, key, productId, expiresInSeconds }
   (el presign NO genera el productId; solo lo valida)
6. Dashboard hace PUT {uploadUrl} con el binario → sube DIRECTAMENTE al storage
   (el archivo nunca pasa por Express)
7. Dashboard confirma con PATCH /api/products/:id { imageKey: key }
   Express valida key segura + pertenece al producto + existe + contenido (best-effort)
   → Actualiza Mongo (imageKey + image pública) → 200
8. Dashboard activa explícitamente: PATCH /api/products/:id
   { status: "active", isAvailable: true }
9. El catálogo público (GET /api/products?lang=) ya muestra el producto
```

**Casos de borde:**

- **Upload directo falla** → el producto queda en draft; no hay registro fantasma.
- **Confirm OK pero Mongo falla** → la imagen anterior sigue vigente; el objeto
  nuevo queda huérfano y lo elimina `orphan-cleanup.ts` (regla 24 h). No
  borrado best-effort inmediato de la key vigente.
- **Imagen inválida** → 400 antes de tocar el storage (validación en presign).

## 3. Flujo: ver producto en los storefronts

```
Angular Store → GET /api/products?lang=es|en  → ProductMapper → ProductUI local
Next.js Store → GET /api/products?lang=es|en  → ProductMapper → Product local
```

- El backend resuelve `translations[lang]` y devuelve `name`/`description` en el idioma pedido.
- Los storefronts renderizan `image` (URL pública de R2/CDN).
- `precioTexto`, `url`, `quantity` se **derivan client-side**; nunca vienen del backend.

## 4. Flujo: editar / reemplazar imagen

```
1. Admin abre Producto → Editar → selecciona nueva imagen
2. POST /api/admin/uploads/presigned (mismo productId) → nueva key versionada
   products/{id}/{uuid}.{ext}
3. PUT {uploadUrl} directo al storage
4. PATCH /api/products/:id { imageKey } → valida, actualiza Mongo y borra la
   imagen anterior DESPUÉS del éxito de Mongo
5. La URL pública lleva ?v={updatedAt} para refrescar la cache del CDN
```

## 5. Flujo: eliminar producto

```
1. Admin elimina producto (confirmación en Dashboard)
2. DELETE /api/products/:id
3. Express borra el documento; borra la carpeta products/{id}/ en R2 (best-effort)
4. orphan-cleanup.ts respalda la limpieza si algo falló
```

## 6. Migración de datos históricos (F7)

Los 184 productos y sus imágenes locales (idénticos en Angular y Next `public/`)
se migran **después** de validar la tubería nueva:

1. `scripts/migrate-images.ts` sube cada asset a `products/{id}/{uuid}.{ext}`.
2. Actualiza `image`, `imageKey` (y `translations` desde las claves i18n existentes) en MongoDB.
3. Verificación de URLs en ambos storefronts.
   Ver `docs/PRODUCT-IMAGES-MIGRATION.md`.

## 7. Referencias

- `docs/API-CONTRACT.md` — contrato de endpoints.
- `docs/STORAGE-ARCHITECTURE.md` — estructura de keys y limpieza.
- `docs/ADR-013-presigned-uploads.md` — por qué presigned URLs.
