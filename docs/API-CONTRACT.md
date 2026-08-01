# Hypermarket API Contract

Documento que define la comunicación entre:
- **Angular frontend**
- **Next.js frontend**
- **Express + TypeScript backend**

---

## 1. API General

| Propiedad | Valor |
|-----------|-------|
| **Base URL (dev)** | `http://localhost:3000/api` |
| **Base URL (prod)** | `https://api.hipermercadosuperior.com/api` |
| **Formato** | JSON |
| **Autenticación** | JWT |

---

## 2. Convenciones

### Naming

La API utiliza nombres en **inglés** para todos los campos.

```json
{
  "price": 80,
  "image": "products/arroz.jpg",
  "category": { "name": "Despensa", "slug": "despensa" }
}
```

### Arquitectura Interna

Cada módulo sigue el flujo:

```
Request
  ↓
Route        → Define el endpoint
  ↓
Controller   → Maneja HTTP (req, res)
  ↓
Service      → Lógica de negocio
  ↓
Repository   → Acceso a datos
  ↓
Database     → MongoDB (futuro)
```

> **Stack**: Node.js + Express + TypeScript (strict mode)
> **Estado**: Migración de JavaScript a TypeScript completada ✅

---

## 3. Response Format

Todas las respuestas exitosas:

```json
{
  "success": true,
  "data": {}
}
```

**Ejemplo GET /products:**

```json
{
  "success": true,
  "data": [
    {
      "id": "arroz-superior",
      "sku": "ARROZ-001",
      "name": "Arroz Superior",
      "price": 80,
      "image": "products/arroz-superior.jpg",
      "categoryId": "alimentos",
      "category": { "name": "Despensa", "slug": "despensa" },
      "unit": "kg",
      "unitQuantity": 1,
      "status": "active",
      "isAvailable": true
    }
  ]
}
```

---

## 4. Error Format

```json
{
  "success": false,
  "message": "Product not found",
  "statusCode": 404
}
```

| Código | Significado |
|--------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (ej. stock insuficiente, email duplicado) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

---

## 5. Products API

### GET /products

Obtiene todos los productos.

**Query params (futuro):**
- `category` → filtrar por categoría
- `page` → número de página
- `limit` → items por página
- `search` → búsqueda por término

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "sku": "string",
      "name": "string",
      "description": "string | null",
      "price": "number",
      "image": "string",
      "categoryId": "string",
      "category": { "name": "string", "slug": "string" },
      "brandId": "string | null",
      "brand": { "name": "string", "slug": "string" } | null,
      "unit": "string | null",
      "unitQuantity": "number | null",
      "status": "active | inactive",
      "isAvailable": "boolean",
      "createdAt": "string (ISO)",
      "updatedAt": "string (ISO)"
    }
  ]
}
```

### GET /products/:id

Obtiene un producto específico.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "arroz-superior",
    "sku": "ARROZ-001",
    "name": "Arroz Superior",
    "price": 80,
    "image": "products/arroz-superior.jpg",
    "categoryId": "alimentos",
    "category": { "name": "Despensa", "slug": "despensa" },
    "unit": "kg",
    "unitQuantity": 1,
    "status": "active",
    "isAvailable": true
  }
}
```

**Error:**

```json
{
  "success": false,
  "message": "Product not found",
  "statusCode": 404
}
```

### POST /products (futuro)

Crear producto.

### PUT /products/:id (futuro)

Actualizar producto.

### DELETE /products/:id (futuro)

Eliminar producto.

---

## 6. Categories API

### GET /categories

Obtiene todas las categorías con subcategorías.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "alimentos",
      "name": "Alimentos",
      "subcategories": [
        { "name": "Frutas y Verduras", "slug": "frutas-y-verduras" },
        { "name": "Despensa", "slug": "despensa" }
      ]
    }
  ]
}
```

---

## 7. Offers API

### GET /offers

Obtiene productos con descuento activo.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "manzanas_verdes",
      "name": "Manzanas verdes por libras",
      "price": 45,
      "originalPrice": 56,
      "discountPrice": 45,
      "discountPercentage": 20,
      "image": "products/frutas-y-verduras/manzana-verde.avif",
      "category": "frutas-y-verduras",
      "unit": "lb",
      "unitQuantity": 1,
      "priceLabel": "Precio: $45 / lb"
    }
  ]
}
```

> `price` es el precio final (`discountPrice`). `category` es el `categoryId` del producto. `originalPrice`, `discountPrice` y `discountPercentage` son **números**, no strings.

---

## 8. Search API

### GET /search?q=termino

Busca productos por término.

**Query params:**
- `q` → término de búsqueda (requerido)
- `category` → filtrar por categoría (opcional)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "arroz-superior",
      "sku": "ARROZ-001",
      "name": "Arroz Superior",
      "price": 80,
      "image": "products/arroz-superior.jpg",
      "categoryId": "alimentos",
      "category": { "name": "Despensa", "slug": "despensa" }
    }
  ]
}
```

> Devuelve la misma estructura que `GET /products` (ver sección 5).

---

## 9. Pagination (futuro)

```json
GET /products?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 184,
    "pages": 10
  }
}
```

---

## 10. Orders API

Todos los endpoints de órdenes requieren autenticación (Bearer token).

### POST /orders

Crea una orden a partir del carrito actual. La dirección se guarda como **snapshot** (`shippingAddress`), no como referencia, para preservar la historia de la compra.

**Request body:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| addressId | string | Sí | ID de la dirección del usuario |

**Comportamiento:**
1. Obtener carrito
2. Validar dirección (snapshot → `shippingAddress`)
3. Obtener productos actuales
4. Validar stock (`availableStock >= quantity` por ítem)
5. Crear la orden con snapshot de precio/nombre/imagen/cantidad
6. `decreaseStock()` atómico por producto
7. Vaciar carrito

> Si falla una operación de inventario a mitad del ciclo, se compensa con `restoreStock()` (best-effort, Mongo standalone sin transacciones).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "items": [{ "productId": "string", "name": "string", "price": "number", "image": "string", "quantity": "number" }],
    "shippingAddress": {
      "label": "string",
      "street": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string",
      "reference": "string"
    },
    "totalItems": "number",
    "subtotal": "number",
    "status": "pending",
    "paymentStatus": "pending",
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

### PATCH /orders/:id/status

Actualiza el estado de la orden **del propio usuario** (customer). Transición válida para el customer:
- `pending` → `cancelled` (cualquier otra transición responde `400`)

Al transicionar a `cancelled` se restaura el stock de todos los ítems (`restoreStock`).

### Admin Orders API (`/admin/orders`)

Requiere rol `admin` (Bearer token).

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/orders` | Todas las órdenes, ordenadas por `createdAt` desc |
| GET | `/admin/orders/:id` | Detalle de una orden (404 si no existe) |
| PATCH | `/admin/orders/:id/status` | Cambia el estado de una orden |

**Transiciones válidas para admin:**
- `pending` → `processing` | `cancelled`
- `processing` → `completed` | `cancelled`

Al transicionar a `cancelled` se restaura el stock de todos los ítems (`restoreStock`).

**PATCH request body:** `{ "status": "processing" }`

---

## 11. Addresses API

Todos los endpoints de direcciones requieren autenticación (Bearer token) y están scoped al usuario autenticado.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/addresses` | Direcciones del usuario autenticado |
| GET | `/addresses/:id` | Dirección por ID (owner o admin) |
| GET | `/addresses/user/:userId` | Direcciones de un usuario (admin o el propio usuario; si no, `403`) |
| POST | `/addresses` | Crea dirección (`label, street, city, state, zipCode, country` requeridos) |
| PATCH | `/addresses/:id` | Actualiza dirección (owner). `isDefault: true` desactiva la anterior |
| DELETE | `/addresses/:id` | Elimina dirección (owner) |

Regla: **una sola `isDefault` por usuario**. La primera dirección de un usuario es default automáticamente.

---

## 12. Inventory API

API **privada** (solo admin). La disponibilidad pública del producto se resuelve mediante la **Product API**; el inventario interno no se expone a clientes.

| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| GET | `/inventory` | admin | Todos los registros |
| GET | `/inventory/:id` | admin | Registro por ID |
| GET | `/inventory/product/:productId` | admin | Registro por producto |
| GET | `/inventory/low-stock` | admin | Stock bajo (`stock <= minStock`) |
| PATCH | `/inventory/:id` | admin | Ajusta `stock` y/o `minStock` |

Todos los registros incluyen **`availableStock = stock - reservedStock`** (campo virtual calculado, nunca persistido).

`GET /inventory/product/:productId` responde `404 { success: false, message: "Inventory not found", statusCode: 404 }` si el producto no tiene registro de inventario.

---

## 13. Contact API

| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| POST | `/contact` | pública | Envía mensaje de contacto |

**Request body:** `{ name, email, message }` + `phone?`

El mensaje se guarda con `status: "pending" | "read" | "answered"` (default `pending`).

### Admin Contact API (`/admin/contact`)

Requiere rol `admin` (Bearer token).

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/admin/contact` | Todos los mensajes, ordenados por `createdAt` desc |
| GET | `/admin/contact/:id` | Detalle de un mensaje (404 si no existe) |
| PATCH | `/admin/contact/:id` | Cambia el `status` del mensaje |
| DELETE | `/admin/contact/:id` | Elimina el mensaje (204) |

**Transiciones de status válidas:** `pending` → `read` | `answered`, `read` → `answered` (cualquier otra responde `400`).

**PATCH request body:** `{ "status": "read" }`

**Rate limit:** el endpoint público está limitado a **10 peticiones por minuto por IP**. Al exceder el límite responde `429`.

| Status | Mensaje |
|--------|---------|
| 429 | Too many messages, please try again later |

---

## 14. Versioning (futuro)

```
/api/v1/products
/api/v2/products
```