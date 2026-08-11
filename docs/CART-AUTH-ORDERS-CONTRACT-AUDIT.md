# Cart / Auth / Orders — Contract Audit (transversal)

> **Estado**: auditoría read-only completada · Decisiones **aprobadas** · Checkpoint
> listo de **F5 CLOSED → E1 Auth**.
>
> **Naturaleza**: documento de auditoría/trabajo, **sin commit** (untracked, misma
> política que `F5-FINAL-AUDIT.md`, `F5-CONTRACT-AUDIT.md` y `API-INTEGRATION.md`).
> Esta auditoría fue **100% read-only**: no se modificó ningún código.
>
> **Frontera del checkpoint**: la aprobación de este documento **no autoriza** la
> implementación de E1/E2/E3. Solo materializa la auditoría y habilita la revisión
> del plan. El primer código a tocar, cuando se apruebe, será **E1 Auth** — no Cart
> ni Orders.

---

## 1. Fuentes

- Backend: `backend-advanced-websites-hypermarket-express-mongodb`
- Angular: `pre-advanced-websites-hypermarket-angular`
- Next.js: `pre-advanced-websites-hypermarket-next`
- Docs: `docs/API-CONTRACT.md` (§§10–15), `docs/ECOMMERCE-DATA-FLOW.md`,
  `docs/FRONTEND-COMPATIBILITY.md`, `docs/PRODUCTION-RATE-LIMITS.md`.

---

## 2. Contrato real del backend

### Auth
- `POST /auth/register` → crea siempre `role: "customer"` (auditado `REGISTER`).
- `POST /auth/login` → `{ token, user }`; JWT HS con payload `{ id, email, role }`,
  `expiresIn = JWT_EXPIRES_IN` (por defecto `1d`). Sin refresh, sin revocación, sin logout.
- `GET /auth/me` → `{ id, name, email, role, createdAt, updatedAt }`.
- `authMiddleware`: stateless (`jwt.verify`), sin DB lookup; `authorizeRole(...)` existe.
- Rate limits: login `10/15min/IP`, register `10/60s/IP`, global `300/15min/IP`.
  429 sin `Retry-After` ni headers `X-RateLimit-*`.

### Cart
- `/api/cart` CRUD completo, protegido por `authMiddleware` (cualquier rol autenticado).
- Persistencia Mongo **por usuario** (índice único `{ userId }`); persiste solo
  `{ productId, quantity }`. Precio **re-leído** de `product.price` en cada lectura.
- `POST /api/cart/items` incrementa; `PATCH /items/:productId` fija **absoluto**.
- Subtotal y `totalItems` calculados en **servidor** (`Σ price × quantity`).
- **Ofertas no entran al carrito** (usa `product.price` únicamente).

### Orders
- `POST /orders { addressId }` desde el carrito del **servidor**. Snapshot
  `{ productId, name, price, image, quantity }` re-leído de la colección de productos.
- Reserva de stock **atómica** (`reservedStock`, guard `$expr`) con compensación
  best-effort; `clearCart` después de las reservas.
- Máquina de estados: customer `pending → cancelled` y `confirmed → cancelled`;
  admin `pending → confirmed|cancelled → processing → shipped → completed`.
  Escritura CAS sobre `{ _id, status: expected }`.
- `GET /orders` (lista sin paginar), `GET /orders/:id`, `PATCH /orders/:id/status`
  — siempre owner-scoped. Admin pipeline (paginado, filtros, búsqueda) aparte.
- `paymentStatus` **dormido**: inicia `pending` y nada puede cambiarlo (sin
  endpoint/initiator/provider). No hay idempotencia, no hay `total`/shipping/tax,
  no hay `orderNumber`, no hay unit labels en el snapshot.

### Addresses
- CRUD auth-gated; regla única `isDefault`; primera dirección auto-default;
  snapshot `shippingAddress` en la orden (`order.service.ts:124`).

### Divergencias docs ↔ código
- Vocabulario `decreaseStock/restoreStock` (docs) vs **reserva** (`reservedStock`,
  `releaseReservation/completeReservation`) en código.
- Transiciones admin documentadas omiten `confirmed` y `shipped`.
- `POST /auth/login` erróneo devuelve **401**, no el `400` de `API-USAGE.md`.
- `name` es requerido en el schema de usuario pero no se valida en el middleware de
  `register` (superficie como mensaje de mongoose, no `Missing required fields`).
- Carrito: el doc §15 declara rol `customer`; el código admite **cualquier** rol
  autenticado.

---

## 3. Comportamiento actual de Angular

- Carrito **local**: señales + `localStorage 'carrito'`
  (`features/cart/services/cart.service.ts:32,52-55`). Ítem con
  `unitPrice/oldPrice/isOffer/discountPercentage/unitLabel/unidad/unitQuantity`.
- Subtotal y total **cliente** (`Σ unitPrice × quantity`).
- **Cero auth**: sin interceptor de Authorization (solo `apiLangInterceptor`), sin
  guards, sin rutas login/register/account.
- Checkout: botón pay **disabled**
  (`cart-summary.component.html:16` — "Checkout will be available in the next phase").
  Único seam de integración.

---

## 4. Comportamiento actual de Next.js

- Carrito **local**: React Context + `localStorage 'carrito'`
  (`features/cart/CartContext.tsx:42,64-96`). Ítem con `precio/oldPrice/discountPercentage`.
- Subtotal y total **cliente** (`Σ precio × cantidad`).
- **Cero auth** (`docs/features/auth.md` declara que no hay sistema de auth);
  `proxy.ts` es solo enrutado `next-intl` de locale.
- **SSR**: un JWT en `localStorage` es invisible a Server Components/RSC
  (`api-client.ts` sin credentials) → necesaria cookie httpOnly o proxy.
- Checkout: botón pay **disabled** (`CartSummary.tsx:43-46`).

---

## 5. Matriz de compatibilidad

| Dominio | Backend real | Angular | Next.js | Estado |
| --- | --- | --- | --- | --- |
| Cart | persistente por usuario, server-priced, auth-gated | anónimo local | anónimo local | gap estructural |
| Auth | JWT customer-ready; único cliente real = dashboard admin | cero infra | cero infra (SSR) | prerequisito duro |
| Orders | server-authoritative, reserva + compensación, admin pipeline | cero (pay disabled) | cero (pay disabled) | incompleto como checkout |

---

## 6. Hallazgos

### P0
1. **Los storefronts no pueden acceder al rail customer del backend** (carrito,
   órdenes, direcciones, `/me`) por ausencia total de infraestructura de auth en
   Angular y Next.js; las rutas exigen Bearer JWT. **Es un gap de integración, no
   un defecto del backend.**
2. **Concurrent double-POST crea órdenes duplicadas** — sin idempotencia ni lock de
   carrito: mismo usuario + doble tap ⇒ dos órdenes de un solo carrito.
3. **Ofertas silenciosamente dropeadas en el pricing de la orden** — los carritos
   locales precifican ofertas a `discountPrice`; `POST /orders` carga
   `product.price` ⇒ salto de precio garantizado al activar checkout.
4. **Zero payment** — `paymentStatus` nunca sale de `pending`; no hay endpoint ni
   provider; nada marca `paid/failed/refunded`.

### P1
- SSR no ve un JWT de `localStorage` (cookie httpOnly o proxy obligatorio).
- Next fuera de CORS + colisión de puerto 3000 con el backend.
- Migración local→server sin flujo guest/merge.
- 429 sin manejo ni `Retry-After` en los storefronts.
- Race read-modify-write en el carrito server (pérdida de incrementos).
- Modelo de totales incompleto (solo `subtotal`).
- Sin número de orden legible (`orderNumber`) para la confirmación.
- `400 "Cart is empty"` post-orden ambiguo (no distingue "ya ordenaste").
- Sin snapshot de oferta en `OrderItem` (historial no puede reproducir el descuento).
- Auth sin revocación/refresh/logout (sesión dura 1d); secret compartido con HMAC
  de presign uploads.

### P2
- Ghost items en el carrito server (se ocultan de la respuesta pero persisten).
- Semántica PATCH absoluto vs delta local (traducción necesaria).
- Faltan `unit/unitQuantity/discount` en el cart response (la UI no puede
  reproducirse sin lookup o extensión de contrato).
- Divergencias docs↔código (§2).
- Rate-limit in-memory por proceso (no multi-instancia).
- Ciclo de vida de dirección (borrar default no promueve otra; PATCH no limpia
  `isDefault`).
- `GET /orders` sin paginación ni filtro.
- Política de password débil (min 6).

### P3
- Docs stale (NG/NX), misma clave `'carrito'` en ambos repos.
- Moneda hardcodeada (`$`/`RD$`, en-US).
- `statusHistory.by` = userId crudo.
- Revenue/averageOrderValue subtotal-based; `totalOrders` cuenta canceladas.
- RBAC plano (allow-list).

---

## 7. Decisiones aprobadas

**7.1 — Token: cookie httpOnly.** Correcto para el SSR de Angular y Next.js. El
cambio de backend se limita a cookie/CORS/credentials y al soporte de sesión
necesario.

**7.2 — Guest cart: server-wins.** `localStorage` queda como carrito anónimo
temporal. Al autenticarse: **replay** de los ítems locales al servidor
(`POST /api/cart/items` por ítem); **el servidor prevalece** ante conflictos; limpiar
el carrito local tras una migración exitosa.

**7.3 — Offers: server-authoritative.** El backend **calcula/aplica la oferta
activa** y genera el snapshot necesario para que `precio mostrado = cart = order`
no pueda divergir. **El cliente nunca es la fuente de verdad del precio final.**
El cálculo server-side de ofertas debe producir un **snapshot inmutable** en el
Cart y en el Order (price/discount en el momento de la operación), no recalcular
`product.price` en cada lectura — para que un cambio posterior de la oferta no
altere retroactivamente una compra ya realizada ni el precio mostrado en
carrito/confirmación (ref. §9-E2).

**7.4 — Idempotencia de órdenes.** `idempotencyKey` **obligatorio** en la
operación de creación de orden, con **unicidad por usuario**. Un retry del mismo
request devuelve la **orden existente**, no crea otra.

**7.5 — Payments: stub.** Sin gateway real aún. Solamente el motor/contrato mínimo
para representar correctamente `pending → paid | failed` y `paid → refunded`, con
las transiciones válidas correspondientes.

**7.6 — Descongelamiento puntual del backend.** Autorizado **únicamente** para las
incompatibilidades genuinamente compartidas identificadas por la auditoría:
(a) cookie/httpOnly + CORS/credentials; (b) pricing de ofertas; (c) idempotencia de
órdenes; (d) payment stub. **No es una autorización general para refactorizar el
backend.**

---

## 8. Regla transversal

Cualquier cambio de backend debe demostrar que es necesario para **ambos**
storefronts y debe venir acompañado de **tests contractuales/regresión**.

---

## 9. Backlog E1 / E2 / E3

### E1 — Auth (ambos storefronts; primer código de la fase)
- Register → login → cookie httpOnly → `/auth/me` → guards → logout → manejo 401/429.
- Vue backend: cookie/CORS/credentials + soporte de sesión (7.1).
- Next: token vía cookie legible por Server Components/RSC; Angular: interceptor +
  guard de rutas.
- Cierre E1: identidad/sesión establecida en ambos storefronts con 0 P0/P1 abiertos.

### E2 — Cart server (ambos)
- Adoptar `/api/cart`: el carrito server es la autoridad.
- Merge guest→login: replay de `localStorage 'carrito'`, **server-wins**, limpiar
  local tras migración exitosa.
- Subtotal/pricing/persistencia **server**.
- **Ofertas coherentes**: snapshot inmutable en Cart y Order (7.3) — price/discount
  capturados en el momento de la operación; `precio mostrado = cart = order`.
- Cierre E2: carrito server-authoritative sin salto de precio entre vistas y orden,
  merge verificado por tests.

### E3 — Checkout / Orders (ambos)
- Addresses UI (list/crear/default) → `POST /orders { addressId, idempotencyKey }`
  → reserva de stock → confirmación (orderNumber/status) → historial → cancel.
- Vue backend: idempotencia (7.4), orderNumber, payment stub (7.5).
- Cierre E3: checkout end-to-end real en ambos storefronts, sin salto de precio,
  retry idempotente, stock 409 mapeado.

---

## 10. Fuera de alcance

Gateway de pago real · guest checkout sin cuenta · admin UI de órdenes en los
storefronts (pertenece al dashboard) · rate-limit Redis multi-instancia ·
forgot-password / email verification · warehouse/fulfillment.

---

## 11. Criterio de cierre de la fase

- 0 P0/P1 abiertos de la matriz.
- Checkout end-to-end real en **ambos** storefronts sin salto de precio
  (7.3 verificado por tests).
- Backend: suite nueva/verde (baseline tras las 4 adiciones MA pre-aprobadas) +
  builds + `check:i18n` verdes en ambos storefronts.
- Merge guest→login, retry idempotente y reserva/liberación de stock verificados
  por tests contractuales/regresión.

---

## Resultado

```
F5 CLOSED → E1 Auth
P0: 4 documentados · P1/P2/P3 documentados
6 decisiones aprobadas (7.1–7.6)
Backend descongelado puntualmente (7.6): cookie/CORS · pricing ofertas · idempotencia · payment stub
Regla: todo cambio backend = ambos storefronts + tests contractuales
Sin código tocado: auditoría 100% read-only
```

**Siguiente paso**: revisión conjunta del **plan E1 Auth** antes de modificar
cualquier código.