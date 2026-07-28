# API Usage

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

## Pagination (Future)

Pagination is not implemented yet. Future support will use:

```
GET /api/products?page=1&limit=20
```

When MongoDB is implemented, pagination will use `skip` and `limit` for efficient database queries.