# API Usage

**Stack**: Node.js + Express + TypeScript · Migración JS→TS completada ✅

Base URL: `http://localhost:3000`

All responses follow a consistent format:

- **Success:** `{ "success": true, "data": [...] }`
- **Error:** `{ "success": false, "message": "...", "statusCode": 400 }`

---

## Products

### GET /api/products

List all products.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "coca_cola",
      "sku": "BEB-001",
      "name": "Coca Cola",
      "price": 80,
      "image": "products/bebidas/coca-cola.avif",
      "categoryId": "bebidas",
      "category": { "name": "Bebidas", "slug": "bebidas" },
      "unit": "l",
      "unitQuantity": 1,
      "status": "active",
      "isAvailable": true
    }
  ]
}
```

**Errors:** None

---

### GET /api/products/:id

Get a product by ID.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | Product ID (e.g., `coca_cola`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "coca_cola",
    "sku": "BEB-001",
    "name": "Coca Cola",
    "price": 80,
    "image": "products/bebidas/coca-cola.avif",
    "categoryId": "bebidas",
    "category": { "name": "Bebidas", "slug": "bebidas" },
    "unit": "l",
    "unitQuantity": 1,
    "status": "active",
    "isAvailable": true
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | Product not found |

---

## Admin Products

> Boundary editorial del Dashboard (`/api/admin/products`). Requiere rol `admin`.
> Devuelve `translations` (solo `en`), `imageKey` e `imageThumbnailKey`, que la
> API pública nunca emite. Incluye drafts e inactivos.

### GET /api/admin/products

Lista paginada de productos incluyendo drafts e inactivos.

**Query params:** `page`, `limit`, `q`, `category`, `brand`, `status`
(`active | inactive`), `isAvailable` (`true`), `sortBy`, `sortOrder`.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "coca_cola",
      "sku": "BEB-001",
      "name": "Coca Cola",
      "price": 80,
      "image": "https://cdn.hipermercadosuperior.com/products/coca_cola/a1b2.webp?v=...",
      "imageKey": "products/coca_cola/9c2d-4a7b.webp",
      "imageThumbnailKey": "products/coca_cola/thumb-9c2d.webp",
      "translations": { "en": { "name": "Coca Cola", "description": "... " } },
      "categoryId": "bebidas",
      "category": { "name": "Bebidas", "slug": "bebidas" },
      "status": "inactive",
      "isAvailable": false
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 184, "pages": 4 }
}
```

### GET /api/admin/products/:id

Detalle administrativo de un producto (404 si no existe).

**Response:** `{ success: true, data: AdminProduct }` (mismo shape que un `data`
de la lista).

### PATCH /api/admin/products/:id

Edición editorial del Dashboard. El `PATCH de `translations` acepta solo `en`
con merge no destructivo; `translations.es` se rechaza con `400` (el ES editorial
vive en los campos raíz `name`/`description`).

**Body:**
```json
{
  "name": "Café Premium",
  "price": 150,
  "isAvailable": true,
  "translations": {
    "en": { "name": "Premium Coffee", "description": "Premium ground coffee." }
  }
}
```

**Response:** `200 { success: true, data: AdminProduct }`.

**Errors:**
| Status | Message |
|--------|---------|
| 400 | Validation error (e.g., `translations` with `es` or unknown language) |
| 401 | Unauthorized |
| 403 | Forbidden (non-admin) |
| 404 | Product not found |

---

## Categories

### GET /api/categories

List all categories with subcategories.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "coca_cola",
      "sku": "BEB-001",
      "name": "Coca Cola",
      "price": 80,
      "image": "products/bebidas/coca-cola.avif",
      "categoryId": "bebidas",
      "category": { "name": "Bebidas", "slug": "bebidas" },
      "unit": "l",
      "unitQuantity": 1,
      "status": "active",
      "isAvailable": true
    }
  ]
}
```

**Errors:** None

---

### GET /api/categories/:id

Get a category by ID.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | Category ID (e.g., `alimentos`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "alimentos",
    "name": "Alimentos",
    "subcategories": [...]
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | Category not found |

---

## Offers

### GET /api/offers

List all discounted products that are publicly visible
(`status: "active"` AND `isAvailable: true`). `?lang=es|en` localizes `name`
with root-language fallback (no `translations` exposed). `image` is the public
URL with cache-bust (`?v=`). `priceLabel` and price formatting are the
consumer's responsibility (Angular/Next.js) and are NOT emitted.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| lang | string | No | `es` or `en` (localizes `name`) |

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
      "image": "https://cdn.hipermercadosuperior.com/products/manzanas_verdes/a1b2.webp?v=2026-08-08T10:00:00.000Z",
      "categoryId": "frutas-y-verduras",
      "unit": "lb",
      "unitQuantity": 1
    }
  ]
}
```

> `price` es el precio final (`discountPrice`). `categoryId` es el id de la
> categoría del producto. `image` puede ser `null` si el producto no tiene una
> imagen resoluble.

**Errors:** None

---

## Search

### GET /api/search?q=:query

Search products by name.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| q | string | Yes | Search term |
| category | string | No | Filter by category slug |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "coca_cola",
      "sku": "BEB-001",
      "name": "Coca Cola",
      "price": 80,
      "image": "products/bebidas/coca-cola.avif",
      "categoryId": "bebidas",
      "category": { "name": "Bebidas", "slug": "bebidas" },
      "unit": "l",
      "unitQuantity": 1,
      "status": "active",
      "isAvailable": true
    }
  ]
}
```

> Devuelve la misma estructura que `GET /api/products`.

**Errors:**
| Status | Message |
|--------|---------|
| 400 | Search term is required |

---

## Users

### GET /api/users

List all users.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Oliver Diaz",
      "email": "oliver@email.com",
      "role": "admin",
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  ]
}
```

**Errors:** None

---

### GET /api/users/:id

Get a user by ID.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | User UUID |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Oliver Diaz",
    "email": "oliver@email.com",
    "role": "admin",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | User not found |

---

### POST /api/users

Create a new user.

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User full name |
| email | string | Yes | User email (unique) |
| password | string | Yes | Password (min 6 characters) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Oliver Diaz",
    "email": "oliver@email.com",
    "role": "customer",
    "createdAt": "2026-07-27T00:00:00.000Z",
    "updatedAt": "2026-07-27T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 400 | Missing required fields: name, email, password |
| 400 | Password must be at least 6 characters |
| 409 | Email already exists |

---

### PATCH /api/users/:id

Update a user partially.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | User UUID |

**Request body:** (at least one required)
| Field | Type | Description |
|-------|------|-------------|
| name | string | New name |
| email | string | New email (unique) |
| password | string | New password (min 6 characters) |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Name",
    "email": "updated@email.com",
    "role": "customer",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-07-27T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | User not found |
| 400 | Password must be at least 6 characters |
| 409 | Email already exists |

---

### DELETE /api/users/:id

Delete a user.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | User UUID |

**Response:**
```json
{
  "success": true,
  "data": null
}
```

**Errors:**
| Status | Message |
|--------|--------|
| 404 | User not found |
| 400 | Cannot delete user with active orders |

---

## Addresses

All address endpoints require authentication via Bearer token and are scoped to the authenticated user. A non-admin user can only read/manage their own addresses.

### GET /api/addresses

List the authenticated user's addresses.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer \<token\> |

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "label": "Casa",
      "street": "Av. Central 123",
      "city": "Santo Domingo",
      "state": "Distrito Nacional",
      "zipCode": "10101",
      "country": "República Dominicana",
      "reference": "Casa azul",
      "isDefault": true,
      "createdAt": "2026-07-28T00:00:00.000Z",
      "updatedAt": "2026-07-28T00:00:00.000Z"
    }
  ]
}
```

**Errors:** None

---

### GET /api/addresses/:id

Get an address by ID. Only the owner (or an admin) can access it.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | Address UUID |

**Errors:**
| Status | Message |
|--------|--------|
| 404 | Address not found |

---

### GET /api/addresses/user/:userId

Get all addresses of a given user. Allowed only for admins or for the same authenticated user.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| userId | string | User UUID |

**Errors:**
| Status | Message |
|--------|--------|
| 403 | Forbidden: insufficient permissions |

---

### POST /api/addresses

Create an address. The first address of a user becomes `isDefault: true`.

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| label | string | Yes | Address label (e.g., `Casa`) |
| street | string | Yes | Street |
| city | string | Yes | City |
| state | string | Yes | State |
| zipCode | string | Yes | ZIP code |
| country | string | Yes | Country |
| reference | string | No | Landmark/reference |
| isDefault | boolean | No | Set as the user's default address |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "label": "Casa",
    "street": "Av. Central 123",
    "city": "Santo Domingo",
    "state": "Distrito Nacional",
    "zipCode": "10101",
    "country": "República Dominicana",
    "isDefault": true,
    "createdAt": "2026-07-28T00:00:00.000Z",
    "updatedAt": "2026-07-28T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|--------|
| 400 | Missing required fields: label, street, city, state, zipCode, country |

---

### PATCH /api/addresses/:id

Update an address. Only the owner can update it. Setting `isDefault: true` unsets the previous default.

**Request body:** (any field)
| Field | Type | Description |
|-------|------|-------------|
| label / street / city / state / zipCode / country / reference | string | Updated value |
| isDefault | boolean | Set as default |

**Errors:**
| Status | Message |
|--------|--------|
| 404 | Address not found |

---

### DELETE /api/addresses/:id

Delete an address. Only the owner can delete it.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | Address UUID |

**Response (204):** No content

**Errors:**
| Status | Message |
|--------|--------|
| 404 | Address not found |

---

## Inventory

Read endpoints are public. Admin endpoints require a Bearer token with the `admin` role.

### GET /api/inventory

List all inventory records. Each record includes `availableStock = stock - reservedStock` (computed, never persisted).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productId": "coca_cola",
      "stock": 100,
      "reservedStock": 0,
      "availableStock": 100,
      "minStock": 10,
      "updatedAt": "2026-07-28T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api/inventory/:id

Get an inventory record by ID.

**Errors:**
| Status | Message |
|--------|--------|
| 404 | Inventory record not found |

---

### GET /api/inventory/product/:productId

Get the inventory record for a product.

**Errors:**
| Status | Message |
|--------|--------|
| 404 | Inventory not found |

---

### GET /api/inventory/low-stock

List inventory records where `stock <= minStock`. **Admin only.**

**Errors:**
| Status | Message |
|--------|--------|
| 401 | Missing or invalid authorization header |
| 403 | Forbidden: insufficient permissions |

---

### PATCH /api/inventory/:id

Adjust stock levels. **Admin only.**

**Request body:** (at least one field)
| Field | Type | Description |
|-------|------|-------------|
| stock | integer ≥ 0 | Absolute stock value |
| minStock | integer ≥ 0 | Low-stock threshold |

**Errors:**
| Status | Message |
|--------|--------|
| 400 | Stock must be a non-negative integer |
| 400 | minStock must be a non-negative integer |
| 404 | Inventory record not found |
| 401 / 403 | Auth / permission errors |

---

## Contact

### POST /api/contact

Submit a contact message. Public endpoint (no auth).

**Rate limit:** 10 requests per minute per IP.

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Name (2-50 characters) |
| email | string | Yes | Valid email |
| phone | string | No | Phone (8-15 digits) |
| message | string | Yes | Message (10-500 characters) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Juan Perez",
    "email": "juan@email.com",
    "phone": "8091234567",
    "message": "Quiero saber si hacen entregas a domicilio.",
    "status": "pending",
    "createdAt": "2026-07-28T00:00:00.000Z",
    "updatedAt": "2026-07-28T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|--------|
| 400 | Missing required fields: name, email, message |
| 400 | Name must be between 2 and 50 characters |
| 400 | Invalid email format |
| 400 | Phone must be between 8 and 15 digits |
| 400 | Message must be between 10 and 500 characters |
| 429 | Too many messages, please try again later |

---

## Authentication

### POST /api/auth/register

Register a new user.

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User full name |
| email | string | Yes | User email (unique) |
| password | string | Yes | Password (min 6 characters) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Oliver Diaz",
    "email": "oliver@email.com",
    "role": "customer",
    "createdAt": "2026-07-28T00:00:00.000Z",
    "updatedAt": "2026-07-28T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 400 | Missing required fields: name, email, password |
| 400 | Password must be at least 6 characters |
| 409 | Email already exists |

---

### POST /api/auth/login

Authenticate and receive a JWT token.

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email |
| password | string | Yes | User password |

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "name": "Oliver Diaz",
      "email": "oliver@email.com",
      "role": "admin",
      "createdAt": "2026-01-15T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 400 | Invalid credentials |

---

### GET /api/auth/me

Get current authenticated user.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer \<token\> |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Oliver Diaz",
    "email": "oliver@email.com",
    "role": "admin",
    "createdAt": "2026-01-15T00:00:00.000Z",
    "updatedAt": "2026-01-15T00:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 401 | Missing or invalid authorization header |
| 401 | Invalid or expired token |

---

## Orders

All order endpoints require authentication via Bearer token.

**Headers:**
| Header | Value |
|--------|-------|
| Authorization | Bearer \<token\> |

---

### POST /api/orders

Create an order from the current cart. The cart must exist and contain at least one item. The shipping address is snapshotted into the order (`shippingAddress`), so later changes to the user's address do not alter the order history. Stock is deducted for each item (atomically) and the cart is cleared on success.

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| addressId | string | Yes | Address ID of the user (snapshot is taken) |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "4c81d682-cb03-44c1-8d2f-4cef099573cb",
    "items": [
      {
        "productId": "coca_cola",
        "name": "Coca Cola",
        "price": 80,
        "image": "products/bebidas/coca-cola.avif",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "label": "Casa",
      "street": "Av. Central 123",
      "city": "Santo Domingo",
      "state": "Distrito Nacional",
      "zipCode": "10101",
      "country": "República Dominicana",
      "reference": "Casa azul"
    },
    "totalItems": 2,
    "subtotal": 160,
    "status": "pending",
    "paymentStatus": "pending",
    "createdAt": "2026-07-28T23:08:08.120Z",
    "updatedAt": "2026-07-28T23:08:08.120Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|--------|
| 400 | Missing required fields: addressId |
| 400 | Cart is empty |
| 404 | Cart not found |
| 404 | Product not found |
| 404 | Address not found |
| 404 | Inventory record not found |
| 409 | Insufficient stock for product ... |

---

### GET /api/orders

List all orders for the authenticated user, sorted by most recent first.

**Parameters:** None

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "4c81d682-cb03-44c1-8d2f-4cef099573cb",
      "items": [
        {
          "productId": "coca_cola",
          "name": "Coca Cola",
          "price": 80,
          "image": "products/bebidas/coca-cola.avif",
          "quantity": 2
        }
      ],
      "totalItems": 2,
      "subtotal": 160,
      "status": "pending",
      "paymentStatus": "pending",
      "createdAt": "2026-07-28T23:08:08.120Z",
      "updatedAt": "2026-07-28T23:08:08.120Z"
    }
  ]
}
```

**Errors:** None

---

### GET /api/orders/:id

Get a specific order by ID. Only the owner can access their orders.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | Order UUID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "4c81d682-cb03-44c1-8d2f-4cef099573cb",
    "items": [
      {
        "productId": "coca_cola",
        "name": "Coca Cola",
        "price": 80,
        "image": "products/bebidas/coca-cola.avif",
        "quantity": 2
      }
    ],
    "totalItems": 2,
    "subtotal": 160,
    "status": "pending",
    "paymentStatus": "pending",
    "createdAt": "2026-07-28T23:08:08.120Z",
    "updatedAt": "2026-07-28T23:08:08.120Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|--------|
| 404 | Order not found |

---

### PATCH /api/orders/:id/status

Update the status of an order. Only valid transitions are allowed. When transitioning to `cancelled`, the stock of each order item is restored.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | string | Order UUID |

**Request body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | string | Yes | New status (`pending`, `processing`, `completed`, `cancelled`) |

**Valid transitions:**
- `pending` → `processing` or `cancelled`
- `processing` → `completed`
- `completed` → (none)
- `cancelled` → (none)

**Behavior:**
- `pending` → `cancelled`: stock of all items is restored via `restoreStock`.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "4c81d682-cb03-44c1-8d2f-4cef099573cb",
    "items": [
      {
        "productId": "coca_cola",
        "name": "Coca Cola",
        "price": 80,
        "image": "products/bebidas/coca-cola.avif",
        "quantity": 2
      }
    ],
    "totalItems": 2,
    "subtotal": 160,
    "status": "processing",
    "paymentStatus": "pending",
    "createdAt": "2026-07-28T23:08:08.120Z",
    "updatedAt": "2026-07-28T23:08:17.745Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|--------|
| 400 | Cannot transition from ... to ... |
| 404 | Order not found |
| 404 | Inventory record not found |

---

## Pagination (Future)

Pagination is not implemented yet. Future support will use:

```
GET /api/products?page=1&limit=20
```

When MongoDB is implemented, pagination will use `skip` and `limit` for efficient database queries.