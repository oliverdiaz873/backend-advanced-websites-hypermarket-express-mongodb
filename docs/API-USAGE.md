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
      "name": "Coca Cola",
      "price": 80,
      "image": "products/bebidas/coca-cola.avif",
      "category": "bebidas"
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
    "name": "Coca Cola",
    "price": 80,
    "image": "products/bebidas/coca-cola.avif",
    "category": "bebidas"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
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
      "id": "alimentos",
      "name": "Alimentos",
      "subcategories": [
        { "name": "Frutas y Verduras", "slug": "frutas-y-verduras" }
      ]
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

List all discounted products.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "manzanas_verdes",
      "name": "Manzanas verdes por libras",
      "price": 45,
      "oldPrice": "RD$ 56.25",
      "discountPercentage": 20,
      "image": "products/frutas-y-verduras/manzana-verde.avif",
      "category": "frutas-y-verduras"
    }
  ]
}
```

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
      "name": "Coca Cola",
      "price": 80,
      "image": "products/bebidas/coca-cola.avif",
      "category": "bebidas"
    }
  ]
}
```

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
|--------|---------|
| 404 | User not found |

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

Create an order from the current cart. The cart must exist and contain at least one item. After successful creation, the cart is automatically cleared.

**Request body:** None (items are taken from the cart)

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
| 400 | Cart is empty |
| 404 | Cart not found |
| 404 | Product not found |

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

Update the status of an order. Only valid transitions are allowed.

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

---

## Pagination (Future)

Pagination is not implemented yet. Future support will use:

```
GET /api/products?page=1&limit=20
```

When MongoDB is implemented, pagination will use `skip` and `limit` for efficient database queries.