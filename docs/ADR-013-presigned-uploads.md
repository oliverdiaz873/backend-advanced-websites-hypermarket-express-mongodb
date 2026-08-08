# ADR: Presigned URLs para la subida de imágenes

- **Estado**: Aceptado
- **Fecha**: F0.0
- **Decisión durante**: Integración real de ecommerce · Plan maestro (F0)

## Contexto

El Dashboard debe subir imágenes al object storage (R2). Hay dos estrategias
posibles:

- **A. Multipart vía backend**: el Dashboard envía `FormData` a Express y el
  backend procesa el binario y lo reenvía al storage.
- **B. Presigned URLs**: el backend firma una URL de subida; el Dashboard hace
  PUT directo al storage; el binario nunca pasa por Express.

Para un ecommerce profesional, B evita saturar el proceso de API con binarios,
reduce latencia, descarga la memoria del backend y mantiene el control de
autorización y metadata en el servidor (el presign solo se emite con JWT + rol
admin).

## Decisión

1. **Se adopta el patrón de presigned URLs (B).** El flujo:
   `create product → POST /api/admin/uploads/presigned (productId) → PUT directo
   a R2 → PATCH /api/products/:id { imageKey } → activación explícita`.
2. **El backend conserva el control total** de autorización (JWT + `admin`),
   validación (MIME, tamaño), generación de claves y metadata. Cada presign
   emite una key **definitiva y versionada** `products/{productId}/{uuid}.{ext}`
   (sin *move/copy* posterior). El presign **no genera** el `productId`: lo recibe
   del cliente (el producto ya fue creado como draft).
3. El endpoint de presign recibe **rate limit**.
4. `pending/` existe solo como red de seguridad para uploads abandonados, no como
   parte del flujo normal. La limpieza de huérfanos usa `scripts/orphan-cleanup.ts`
   (ver `STORAGE-ARCHITECTURE.md` §7).

## Opciones consideradas

| Opción | Valoración |
| --- | --- |
| Multipart vía backend (A) | Más simple, pero el API procesa binarios, mayor consumo de memoria/tiempo y cuello de botella para catálogos grandes. |
| **Presigned URLs (B, elegido)** | Estándar en ecommerce grande (S3/R2/Google Cloud); el backend firma, no transfiere. |
| Híbrido (multipart + presigned según entorno) | Complejidad extra sin valor ahora; se alcanza con la misma interfaz de storage. |

## Consecuencias

- El Dashboard necesita flujo de tres pasos (presign → PUT → PATCH de confirmación),
  ligeramente más complejo que un único POST multipart.
- `uploadUrl` expira en 10 min; si el usuario tarda, debe refrescar el presign.
- R2 no valida el objeto en el PUT: validación client-side + verificación
  best-effort (HEAD/magic bytes) al confirmar con `PATCH`.

## Referencias

- `docs/ECOMMERCE-DATA-FLOW.md` — flujo extremo a extremo.
- `docs/API-CONTRACT.md` §5 — contrato del endpoint de presign.
- `docs/STORAGE-ARCHITECTURE.md` — estructura de keys y limpieza.
