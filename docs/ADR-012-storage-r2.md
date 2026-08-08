# ADR: Cloudflare R2 como object storage de imágenes

- **Estado**: Aceptado
- **Fecha**: F0.0
- **Decisión durante**: Integración real de ecommerce · Plan maestro (F0)

## Contexto

El Dashboard crea productos con imágenes. Hasta ahora `image` era un string URL
cualquiera y no existía infraestructura de upload. Para la transición a ecommerce
real se necesita un lugar para los archivos de imagen que sea:

1. **Externo al servidor Express** (los binarios no deben viajar por el API ni
   saturar el proceso Node).
2. **Compartido por los dos storefronts** (Angular y Next.js), con una única
   fuente de verdad de multimedia.
3. **Escalable** y compatible con una arquitectura CDN.

La alternativa "guardar en `/uploads` dentro de Express" fue descartada por
volumen, escalabilidad, respaldo y porque acopla el proceso de API con el
servicio de archivos.

## Decisión

1. **Cloudflare R2 es el object storage de producción** para imágenes de
   productos.
2. El acceso se realiza mediante la **API de S3** (`@aws-sdk/client-s3`), lo que
   hace R2 intercambiable por cualquier otro almacenamiento compatible S3.
3. Todo el almacenamiento se encapsula detrás de la interfaz
   `ObjectStorageProvider`:
   - `R2StorageProvider` → producción.
   - `LocalStorageProvider` → desarrollo y tests (mismo contrato de presign).
   El dominio de productos no conoce el proveedor concreto.
4. **MongoDB nunca almacena el binario**; guarda `image` (URL pública) e
   `imageKey` (referencia de storage).

## Opciones consideradas

| Opción | Valoración |
| --- | --- |
| `/uploads` local en Express | Simple, pero no escala, mezcla proceso de API con archivos y complica respaldo/CDN. |
| Amazon S3 + CloudFront | Válido, ecosistema amplio; coste de egress y más piezas (CloudFront) que R2. |
| Cloudinary | SDK fácil y transformaciones nativas, pero lock-in del proveedor y coste a escala. |
| **Cloudflare R2 (elegido)** | S3-compatible (bajo lock-in), **egress $0**, CDN integrado, económico y suficiente para el catálogo. |

## Consecuencias

- El backend debe implementar presign y limpieza de huérfanos (F0).
- R2 no fuerza MIME/tamaño en el objeto final: la validación es client-side +
  best-effort del backend (limitación documentada en `STORAGE-ARCHITECTURE.md`).
- Si el negocio exigiera transformaciones on-the-fly (thumbnails por CDN), R2
  requeriría un Worker de Cloudflare o generación client-side; se resolverá en
  fases posteriores.

## Referencias

- `docs/STORAGE-ARCHITECTURE.md` — estructura de keys, límites, limpieza.
- `docs/SYSTEM-MODELING.md` §6 — arquitectura de storage.
