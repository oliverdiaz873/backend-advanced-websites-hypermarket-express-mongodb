# Hypermarket API Contract

Documento que define la comunicación entre:
- **Angular frontend**
- **Next.js frontend**
- **Express backend**

---

## 1. API General

| Propiedad | Valor |
|-----------|-------|
| **Base URL (dev)** | `http://localhost:3000/api` |
| **Base URL (prod)** | `https://api.hipermercadosuperior.com/api` |
| **Formato** | JSON |
| **Autenticación** | JWT (futuro) |

---

## 2. Convenciones

### Naming

La API utiliza nombres en **inglés** para todos los campos.

```json
{
  "price": 80,
  "image": "products/arroz.jpg",
  "category": "despensa"
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
      "name": "Arroz Superior",
      "price": 80,
      "image": "products/arroz-superior.jpg",
      "category": "despensa",
      "unit": "kg",
      "unitQuantity": 1,
      "priceLabel": "Precio: $80 / kg"
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
| 404 | Not Found |
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
      "name": "string",
      "price": "number",
      "image": "string",
      "category": "string",
      "unit": "string | null",
      "unitQuantity": "number | null",
      "priceLabel": "string"
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
    "name": "Arroz Superior",
    "price": 80,
    "image": "products/arroz-superior.jpg",
    "category": "despensa",
    "unit": "kg",
    "unitQuantity": 1,
    "priceLabel": "Precio: $80 / kg"
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
      "name": "Manzanas verdes",
      "price": 45,
      "oldPrice": "RD$ 56.25",
      "discountPercentage": 20,
      "image": "products/manzanas-verdes.jpg",
      "category": "frutas-y-verduras",
      "unit": "lb",
      "priceLabel": "Precio: $45 / lb"
    }
  ]
}
```

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
      "name": "Arroz Superior",
      "price": 80,
      "image": "products/arroz-superior.jpg"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

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

## 10. Versioning (futuro)

```
/api/v1/products
/api/v2/products
```