# Protección de Datos en Producción (Fase 8A)

Este documento describe la estrategia de protección de datos esencial para el entorno de producción del backend del Hipermercado Superior.

## Entornos y separación de credenciales

| Variable | Uso | Entorno |
| --- | --- | --- |
| `MONGODB_URI` | Conexión de la API Express (lectura/escritura normal) | Producción |
| `MONGODB_BACKUP_URI` | Conexión exclusiva para backups/restores (mongodump/mongorestore) | Solo scripts de mantenimiento |
| `BACKUP_DIR` | Carpeta local donde se guardan los respaldos (`backups/`) | Solo scripts de mantenimiento |

### Regla: la API nunca usa `MONGODB_BACKUP_URI`

El servidor Express (`src/config/index.ts`) lee únicamente `MONGODB_URI`. `MONGODB_BACKUP_URI` solo se consume desde los scripts `scripts/backup.ts` y `scripts/restore.ts`. Esto garantiza que un fallo o filtración en la capa web nunca exponga la credencial de backup.

### Usuarios de mínimo privilegio

Crea usuarios de MongoDB separados:

- **API**: permisos de lectura/escritura solo sobre la base de datos de la aplicación.
- **Backup**: solo el rol de backup (`backup`) o permisos de lectura sobre las bases de datos a respaldar.
- **Restore**: solo el rol de restore (`restore`) o permisos de escritura sobre las bases de datos destino.

Nunca uses el usuario `root` de Atlas en la API.

## Backups

Se usa **MongoDB Database Tools** (`mongodump` / `mongorestore`) con archivo único comprimido (`--archive --gzip`).

### Requisitos

- Instalar MongoDB Database Tools en la máquina: https://www.mongodb.com/try/download/database-tools
- El script valida la instalación (`mongodump --version`) y, si falta, muestra un mensaje claro y termina.

### Crear un backup

```bash
npm run backup
```

Genera un archivo `backups/hypermarket-<fecha-hora>.archive.gz` usando `MONGODB_BACKUP_URI` (o `MONGODB_URI` como respaldo).

### Restaurar un backup

```bash
npm run restore -- <archivo.archive.gz>
```

El archivo puede ser un nombre relativo dentro de `backups/` o una ruta absoluta. **Advertencia:** la restauración reemplaza los datos actuales del destino.

### Frecuencia recomendada

- Automatizar con una tarea programada (cron/Task Scheduler) diaria.
- Guardar los respaldos fuera de la máquina (S3, blob storage, etc.) para tolerancia ante fallos del host.

## Migraciones de esquema

Las migraciones se aplican con `npm run migrate` (hacia arriba) y `npm run migrate:down` (hacia abajo).

- Las migraciones viven en `src/database/migrations/` (formato `NNNN-nombre.ts`).
- El runner registra las aplicadas en la colección `schema_migrations`.
- Diseñadas para funcionar sin transacciones multi-documento (compatible con Atlas M0 free tier).

Migraciones existentes:

| Migración | Descripción |
| --- | --- |
| `0001-create-indexes` | Índices de producción: productos (categoryId, brandId, sku único, name text), órdenes (userId+createdAt, status), inventario (productId único), auditlogs (resource+resourceId, createdAt), usuarios (email único). |
| `0002-add-soft-delete-fields` | Añade `isDeleted: false` y `deletedAt: null` a productos, categorías, marcas, ofertas, usuarios y órdenes. |

> Nota: `0002` prepara los campos para el soft-delete. La migración de los endpoints `DELETE` al soft-delete se realizará en una subfase posterior (8A.1, post-dashboard).

## Soft-delete (infraestructura)

El plugin `src/shared/plugins/soft-delete.plugin.ts` proporciona:

- Campos `isDeleted` (booleano, índice) y `deletedAt` (fecha).
- Filtrado automático en `find`, `findOne`, `findOneAndUpdate`, `countDocuments`, `deleteOne` y `deleteMany`.
- Métodos de documento: `softDelete()` y `restore()`.
- Statics: `findActive()`, `findIncludingDeleted()`, `findDeleted()`, `countActive()`, `countIncludingDeleted()`, `deletePermanently(id)`.

Aún no está aplicado a ningún modelo del catálogo; su aplicación es parte de la subfase 8A.1.

## Auditoría de cambios (interna)

El módulo `src/modules/audit/` registra eventos de creación, actualización y eliminación en la colección `auditlogs`.

- Campos: `{ userId?, action, resource, resourceId?, success, createdAt }`.
- Acciones (`AuditAction`): `CREATE_PRODUCT`, `UPDATE_PRODUCT`, `DELETE_PRODUCT`, `CREATE_CATEGORY`, `UPDATE_CATEGORY`, `DELETE_CATEGORY`, `CREATE_BRAND`, `UPDATE_BRAND`, `DELETE_BRAND`, `CREATE_OFFER`, `UPDATE_OFFER`, `DELETE_OFFER`, `CREATE_USER`, `UPDATE_USER`, `DELETE_USER`.
- Registra tanto operaciones exitosas (`success: true`) como fallidas (`success: false`), y nunca lanza errores a la capa de negocio.
- **No expone rutas HTTP**: la lectura de logs queda para uso interno/administración futura (dashboard).

## Buenas prácticas

- El `.env` (con credenciales) está en `.gitignore`; nunca se sube al repositorio.
- La carpeta `backups/` está en `.gitignore`.
- Antes de desplegar una migración a producción, ejecútala primero en staging y verifica los índices.
- Mantén `MONGODB_BACKUP_URI` fuera de la API; úsala solo en tareas de mantenimiento.
