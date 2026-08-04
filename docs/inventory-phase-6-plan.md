# Phase 6 — Inventory Management (Plan)

> Plan de arquitectura congelado. Antes de tocar el módulo de inventario o el de
> movimientos, lee este documento y las decisiones de la Phase 5
> (`docs/product-crud-decisions.md`).

## Estado actual

- `inventory` es una colección independiente de `products` (relación 1:1 por `productId`).
- Phase 5 cerrada: CRUD de productos funcionando, build/lint/tests verdes.
- El módulo `inventory` actual tiene: modelo (stock, reservedStock, minStock, availableStock
  virtual), repositorio, service y rutas admin (GET /, GET /:id, GET /product/:productId,
  GET /low-stock, PATCH /:id). No tiene historial, paginación, ni datos del producto en la respuesta.

## Decisiones

1. `POST /inventory/:id/adjust` modela la acción de negocio "ajustar inventario"
   (`operation: increase | decrease | set`). Reemplaza al `PATCH /:id` genérico.
2. `reason` controlado desde Phase 6 (enum `AdjustmentReason`), requerido y auditado.
3. `createdBy` se llena desde el día uno con `req.user.id` (auth ya existe); nullable solo por robustez.
4. Módulo hermano `inventory-movements` para el historial.
5. DataTable compartido se extiende con `badge` reutilizable.
6. `inventory` y `products` permanecen separados: el listado enriquece con un snapshot
   compacto del producto resuelto en lectura (batch `findByIds`), sin duplicar datos.

## Enums (naming consistente backend/dashboard)

| Backend `src/modules/inventory/constants/` | Dashboard `features/inventory/constants/` |
|---|---|
| `inventory-adjustment-reasons.ts` → `AdjustmentReason` | `inventory.constants.ts` exporta `AdjustmentReason` |
| `inventory-movement-types.ts` → `InventoryMovementType` | idem |
| `inventory-status.ts` → `InventoryStatus` | idem |
| `inventory-sort-fields.ts` → `InventorySortField` | idem |

`AdjustmentReason`:
```
initial_stock | manual_correction | damaged_products | supplier_adjustment | inventory_count
```

`InventoryMovementType`:
```
increase | decrease | set | min_stock_change
```

`InventoryStatus` (mutuamente excluyentes, derivado):
```
out-of-stock  (availableStock <= 0)  → rojo   "Agotado"
low-stock     (minStock set && stock <= minStock, excluye out-of-stock) → ámbar "Bajo"
ok            resto                   → verde  "En stock"
```

## Modelo `inventory_movement`

```
{
  _id,
  inventoryId (ref Inventory),
  productId (ref Product),
  type: InventoryMovementType,
  quantity: number,          // delta absoluto (solo para increase/decrease/set)
  previousStock: number,
  newStock: number,
  reason: AdjustmentReason,
  createdBy?: string,        // req.user.id
  createdAt: Date
}
```

Índices (migración `0003`): `{ inventoryId: 1, createdAt: -1 }`, `{ productId: 1, createdAt: -1 }`, `{ type: 1 }`.

## API REST (solo admin)

```
GET    /inventory?page&limit&q&status=all|low|out&sortBy&sortOrder
       → paginado { data, pagination }; cada fila enriquecida con product snapshot
         { id, productId, product: { name, sku, image, unit }, stock, reservedStock,
           availableStock, minStock, status, updatedAt }
GET    /inventory/low-stock                      → lista (compat)
GET    /inventory/out-of-stock                   → lista (nuevo)
GET    /inventory/:id                            → single
GET    /inventory/product/:productId             → single (compat)
POST   /inventory/:id/adjust   { operation, quantity, reason }   → 200 record actualizado
PATCH  /inventory/:id/min-stock { minStock, reason }             → 200 record
GET    /inventory/:id/movements?page&limit                       → historial del registro
GET    /inventory-movements?page&limit&productId&type            → historial global (admin)
```

Reglas:
- `decrease` valida `quantity >= 1` y guard atómico `availableStock - quantity >= 0` (nunca stock negativo).
- `increase` valida `quantity >= 1`.
- `set` valida `quantity >= 0` (corrección absoluta, last-write-wins).
- `min-stock` valida `minStock >= 0`.
- El movimiento se escribe SOLO si la actualización atómica retorna documento.
- Flujo de ventas/órdenes NO genera movimientos en esta fase (decisión explícita).

## Dashboard

```
src/features/inventory/
├── inventory.routes.ts                # /inventory, /inventory/:id/movements
├── constants/inventory.constants.ts
├── models/inventory.model.ts
├── services/inventory.service.ts      # BaseApiService
├── state/inventory.store.ts           # NgRx signals (patrón products.store)
├── components/
│   ├── inventory-table/               # tabla + badges de stock
│   ├── inventory-toolbar/             # búsqueda + filtros low/out + orden
│   ├── inventory-adjust-dialog/       # select motivo (required) + cantidad + preview
│   └── inventory-movements-table/
└── pages/
    ├── inventory-page/
    └── inventory-movements-page/
```

- Toolbar: búsqueda (nombre/SKU), filtro estado (Todos/Bajo/Agotado), orden.
- Chips de resumen: total, bajo stock, agotados.
- Adjust Dialog: radio `Aumentar/Disminuir/Fijar/Cambiar mínimo`, cantidad (int),
  motivo (select requerido, default `manual_correction`), preview `anterior → nuevo`.

## Flujos

| Operación | Endpoint | Movimiento |
|---|---|---|
| Aumentar stock | `POST /:id/adjust` `{operation:increase}` | `increase` |
| Disminuir stock | `POST /:id/adjust` `{operation:decrease}` | `decrease` |
| Corrección | `POST /:id/adjust` `{operation:set}` | `set` |
| Cambio de minStock | `PATCH /:id/min-stock` | `min_stock_change` |
| Inventario inicial | `POST /products` (ya cubierto) | — |
| Venta/Cancelación | Interno (sin movimientos esta fase) | — |

## Integración con Products

| Acción en Product | Acción en Inventory |
|---|---|
| `POST /products` | Crea registro (existente) |
| `DELETE /products/:id` | Elimina registro + movimientos asociados |
| `PATCH /products/:id` | No toca stock (decisión Phase 5) |
| Lectura | Snapshot del producto resuelto en lectura (batch `findByIds`) |

## Testing

Backend:
- Unit (mocks): service `adjustInventory`/`changeMinStock` (validaciones, errores,
  movimiento solo en éxito), controller.
- Integration (supertest): endpoints nuevos, auth 401/403, ajuste → movimiento
  persistido, historial paginado, `GET /inventory` enriquecido.
- Actualizar `inventory.test.ts` (PATCH viejo → endpoints nuevos), factories/mocks.

Dashboard:
- `inventory.service.spec.ts`, `inventory.store.spec.ts`, specs de table/toolbar/dialog,
  y spec de la extensión `badge` en DataTable.

## Riesgos y mitigaciones

- Concurrencia/stock negativo → update atómico `findOneAndUpdate` con `$expr` guard.
- Doble actualización → movimiento solo tras update exitoso; `reference` opcional.
- Inconsistencia inventory↔products → snapshot en lectura, sin embebido mutable.
- Fallo parcial → movimiento tras el update; si falla, log (best-effort, igual que checkout).
- Overlap de badges → `deriveStatus()` único (out → low → ok).
- Ruptura de compat → conservar `decreaseStock`/`restoreStock` internos; migrar tests; documentar.

## Orden de implementación

1. Backend tipos + constantes.
2. Modelo `inventory_movement` + repositorio + migración `0003`.
3. Extender `inventory.repository` (findPage, findOutOfStock, atomicAdjust, setMinStock).
4. `inventory.service` (adjustInventory, changeMinStock) + `inventory-movement.service`.
5. Controller + rutas + `app.ts` (retiro de `PATCH /:id`).
6. Tests unit + integration + helpers/mocks + docs.
7. Dashboard models + service + constants.
8. Dashboard store.
9. Extensión `badge` en DataTable.
10. Dashboard componentes + páginas + rutas.
11. Dashboard tests.
12. Verificación final (build, lint, test en ambos repos).
