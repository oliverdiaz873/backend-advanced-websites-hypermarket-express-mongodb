# System Modeling - Hypermarket Ecommerce Backend

## 1. System Overview

### Nombre del sistema
Hypermarket Ecommerce Backend

### Descripción general
Backend REST API para un hipermercado online. Gestión de catálogo, usuarios, carrito, órdenes e inventario.

### Contexto actual
Backend desarrollado con Node.js + Express + TypeScript. Arquitectura Feature-Based. Migración JS → TS completada. Próxima migración de almacenamiento en memoria hacia MongoDB + Mongoose.

### Objetivo del sistema
Proporcionar una plataforma escalable para operaciones ecommerce.

### Actores principales
- **Customer**
- **Admin**

## 2. Business Domain

### 2.1 Business Context
Un hipermercado necesita gestionar:
- catálogo de productos
- categorías
- marcas
- inventario
- clientes
- direcciones
- carrito de compras
- pedidos

### 2.2 Actors

#### Customer
**Responsabilidades:**
- Crear cuenta
- Autenticarse
- Explorar productos
- Buscar productos
- Gestionar carrito
- Crear órdenes
- Consultar historial

#### Admin
**Responsabilidades:**
- Gestionar usuarios
- Gestionar catálogo
- Administrar inventario
- Gestionar ofertas

### 2.3 Business Flow

```
Customer
    |
    v
Browse Products
    |
    v
Add To Cart
    |
    v
Checkout
    |
    v
Create Order
    |
    v
Order Processing
```

### 2.4 Current Backend Mapping

| Business Concept | Backend Module |
|---|---|---|
| Products | `products` |
| Categories | `categories` |
| Brands | `brands` |
| Offers | `offers` |
| Authentication | `auth` |
| Users | `users` |
| Addresses | `addresses` |
| Cart | `cart` |
| Orders | `orders` |
| Search | `search` |
| Inventory | `inventory` |

## 3. Entity Modeling

### 3.1 User

#### Purpose
Representa una cuenta en el sistema. Identifica a una persona (Customer o Admin) que interactúa con la plataforma.

#### Attributes
- `id` — identificador único
- `name` — nombre completo
- `email` — correo electrónico (único)
- `password` — contraseña hasheada
- `role` — `customer` | `admin`
- `createdAt` — fecha de registro
- `updatedAt` — última actualización

#### Current Backend Mapping
- `modules/users/` — CRUD completo
- `modules/auth/` — register, login, getMe
- `shared/middleware/auth.middleware.ts` — JWT verification
- Tipo: `User` en `src/types/index.ts`

#### Relationships
- User → **Orders**: 1:N
- User → **Cart**: 1:1
- User → **Address**: 1:N (opcional)

#### Business Rules
- Email debe ser único en el sistema.
- Password debe almacenarse hasheada (bcrypt).
- Solo Admin puede crear/modificar/eliminar usuarios.
- Un usuario no puede eliminarse si tiene órdenes activas.
- Customer solo puede ver/editar su propio perfil.

### 3.2 Address

#### Purpose
Representa una dirección física asociada a un usuario para procesos de envío y entrega de pedidos.

#### Attributes
- `id` — identificador único
- `label` — nombre identificador de la dirección (Casa, Trabajo)
- `street` — calle y número
- `city` — ciudad
- `state` — estado/provincia
- `zipCode` — código postal
- `country` — país
- `reference` — punto de referencia (opcional)
- `isDefault` — indica la dirección principal del usuario

#### Current Backend Mapping
- `modules/addresses/` — GET all, GET by id, GET by user
- Nueva entidad del dominio para funcionalidades de envío

#### Relationships
- Address → **User**: N:1 — Un usuario puede tener múltiples direcciones.
- Address → **Order**: relación histórica — Una orden conserva la dirección utilizada al momento de la compra.

#### Business Rules
- Un usuario puede tener cero o más direcciones.
- Una dirección debe contener información mínima de ubicación.
- Un usuario solo puede tener una dirección principal (`isDefault`).
- Una dirección utilizada en una orden debe conservarse como histórico.

### 3.3 Category

#### Purpose
Representa una clasificación de productos dentro del hipermercado. Organiza el catálogo en secciones lógicas para facilitar la navegación y búsqueda.

#### Attributes
- `id` — identificador único
- `name` — nombre visible (ej: "Bebidas", "Electrodomésticos")
- `slug` — identificador URL (ej: "bebidas")
- `subcategories` — lista de subcategorías embebidas con `name` y `slug`

> **Nota de diseño:** Subcategory no es una entidad independiente del dominio actual. Se modela como documento embebido dentro de Category porque pertenece exclusivamente a una categoría, no necesita operaciones propias y se consulta junto con la categoría.

#### Current Backend Mapping
- `modules/categories/` — GET all, GET by id
- Datos: 8 categorías con subcategorías
- Tipo: `Category` y `Subcategory` en `src/types/index.ts`

#### Relationships
- Category → **Product**: 1:N — Una categoría contiene muchos productos.
- Category → **Subcategory**: 1:N — Subcategorías embebidas.

#### Business Rules
- El nombre de categoría debe ser único.
- El slug debe ser único (usado en URLs y filtros).
- Una categoría no puede eliminarse si tiene productos asociados.
- Una categoría puede tener 0 o más subcategorías.

> **Persistence Note:** The domain model is independent from the database technology. Category can later be implemented as a MongoDB document, SQL table, or backend model.

### 3.4 Brand

#### Purpose
Representa la identidad comercial de un producto. Permite agrupar productos por marca, mejorar filtros de búsqueda y facilitar análisis comerciales.

#### Attributes
- `id` — identificador único
- `name` — nombre de la marca
- `slug` — identificador URL
- `description` — descripción breve (opcional)
- `logo` — URL del logo (opcional)
- `status` — estado de la marca (`active` | `inactive`)

#### Current Backend Mapping
- `modules/brands/` — GET all, GET by id
- Nueva entidad para mejorar el catálogo

#### Relationships
- Brand → **Product**: 1:N — Una marca puede tener múltiples productos. Un producto pertenece a una marca comercial.

#### Business Rules
- El nombre de marca debe ser único.
- Una marca no debe eliminarse si tiene productos asociados.
- Las marcas inactivas deben conservarse para mantener historial de productos y órdenes.

### 3.5 Product

#### Purpose
Representa un artículo individual disponible para la venta dentro del catálogo del hipermercado. Es la entidad principal del sistema, relacionada con catálogo, búsqueda, carrito, ofertas, inventario y órdenes.

#### Attributes
- `id` — identificador único
- `sku` — código interno del producto
- `name` — nombre del producto
- `description` — descripción detallada (opcional)
- `price` — precio actual de venta
- `image` — imagen principal
- `category` — categoría del producto
- `brand` — marca comercial
- `unit` — unidad de medida (ej: "lb", "unidad", "litro")
- `unitQuantity` — cantidad por unidad
- `status` — estado del producto (`active` | `inactive`)
- `isAvailable` — disponibilidad comercial
- `createdAt` — fecha de creación
- `updatedAt` — última actualización

#### Current Backend Mapping
- `modules/products/` — GET all, GET by id
- 186 productos actuales con name, price, image, category (string)
- Tipo: `Product` en `src/types/index.ts`
- `modules/search/` — búsqueda por nombre y categoría

#### Relationships
- Product → **Category**: N:1 — Un producto pertenece a una categoría.
- Product → **Brand**: N:1 — Un producto pertenece a una marca comercial.
- Product → **Inventory**: 1:1 — Un producto tiene un registro de inventario.
- Product → **Offer**: 1:N — Un producto puede tener múltiples ofertas en su historial.
- Product → **CartItem**: 1:N — Un producto puede estar en múltiples carritos.
- Product → **OrderItem**: Relación histórica mediante snapshot del producto al momento de la compra.

#### Business Rules
- El precio debe ser mayor que cero.
- Todo producto debe pertenecer a una categoría.
- El SKU debe ser único.
- Un producto vendido históricamente no debe eliminarse físicamente.
- Los productos inactivos deben conservar información histórica.

### 3.6 Inventory

#### Purpose
Representa la disponibilidad de productos dentro del hipermercado. Controla las existencias físicas y determina si un producto puede venderse.

#### Attributes
- `id` — identificador único
- `product` — producto al que pertenece el inventario
- `stock` — cantidad disponible actual
- `reservedStock` — cantidad reservada para órdenes pendientes
- `minStock` — nivel mínimo para alertas (opcional)
- `updatedAt` — fecha de última actualización

#### Current Backend Mapping
- `modules/inventory/` — GET all, GET by id, GET by product
- Nueva entidad para la gestión real de stock

#### Relationships
- Inventory → **Product**: 1:1 — Cada producto tiene un registro de inventario asociado.

#### Business Rules
- El stock nunca puede ser negativo.
- Un producto sin stock no debe estar disponible para venta.
- Crear una orden debe actualizar la cantidad disponible.
- Cancelar una orden puede restaurar stock según la política del negocio.
- Los registros de inventario de productos existentes no deben eliminarse.

### 3.7 Offer

#### Purpose
Representa una promoción o descuento aplicado temporalmente a un producto. Permite gestionar campañas comerciales y modificar temporalmente el precio de venta.

#### Attributes
- `id` — identificador único
- `product` — producto asociado
- `originalPrice` — precio del producto cuando se creó la oferta
- `discountPrice` — precio final con descuento
- `discountPercentage` — porcentaje de descuento (campo calculado, no almacenado)
- `startDate` — fecha de inicio
- `endDate` — fecha de finalización (opcional)
- `isActive` — indica si la oferta está vigente
- `title` — nombre de la promoción (opcional)

#### Current Backend Mapping
- `modules/offers/` — GET all
- 7 ofertas actuales con `productId`, `originalPrice`, `discountPrice`, `startDate`, `isActive`
- Calcula `discountPercentage` dinámicamente

#### Relationships
- Offer → **Product**: N:1 — Una oferta pertenece a un producto.
- Product → **Offer**: 1:N — Un producto puede tener múltiples ofertas a través del tiempo.

#### Business Rules
- El precio descontado debe ser menor al precio original.
- Los precios deben manejarse como valores numéricos.
- Una oferta debe tener un período válido.
- No deben existir múltiples ofertas activas incompatibles para el mismo producto.
- Las ofertas históricas deben conservarse para análisis comercial.

### 3.8 Cart

#### Purpose
Representa la selección temporal de productos que un cliente desea comprar antes del proceso de checkout.

#### Attributes
- `id` — identificador único
- `user` — usuario propietario del carrito
- `items` — productos seleccionados
- `createdAt` — fecha de creación
- `updatedAt` — última actualización

#### Item attributes
- `product` — producto seleccionado
- `quantity` — cantidad deseada

Los datos descriptivos del producto se obtienen desde Product al consultar el carrito.

#### Current Backend Mapping
- `modules/cart/` — GET /, POST items, PATCH items, DELETE items, DELETE /
- Items almacenan actualmente `productId` y `quantity`
- `CartResponse` resuelve información del producto
- Rutas protegidas por `authMiddleware`

#### Relationships
- Cart → **User**: 1:1 — Un usuario tiene un carrito activo.
- Cart → **Product**: N:M — Un carrito contiene múltiples productos mediante CartItems.
- Cart → **Order**: 1:N histórico — Un carrito puede generar múltiples órdenes a través del proceso de checkout.

#### Business Rules
- Un usuario solo puede tener un carrito activo.
- La cantidad debe ser mayor que cero.
- Al crear una orden, el carrito debe vaciarse.
- El precio mostrado debe obtenerse desde el producto actual.
- Productos no disponibles no deben poder agregarse al carrito.

### 3.9 Order

#### Purpose
Representa una compra realizada por un cliente. Es un documento histórico que registra los productos, precios, dirección y estado de la transacción al momento de la compra.

#### Attributes
- `id` — identificador único
- `user` — usuario que realizó la compra
- `items` — productos comprados (snapshot completo)
- `address` — dirección de envío al momento de la compra (snapshot)
- `totalItems` — cantidad total de artículos
- `subtotal` — suma total de precios
- `status` — estado actual de la orden
- `paymentStatus` — estado del pago
- `createdAt` — fecha de creación
- `updatedAt` — última actualización

#### Item attributes (snapshot histórico)
- `product` — producto comprado
- `name` — nombre al momento de la compra
- `price` — precio pagado
- `image` — imagen al momento de la compra
- `quantity` — cantidad comprada

#### Status machine
```
pending → processing → completed
    ↓          ↓
cancelled   cancelled
```

#### Current Backend Mapping
- `modules/orders/` — POST /, GET /, GET /:id, PATCH /:id/status
- Items guardan snapshot (name, price, image, quantity)
- `shared/constants/order-status.ts` — estados y transiciones permitidas
- Rutas protegidas por `authMiddleware`

#### Relationships
- Order → **User**: N:1 — Un usuario puede tener múltiples órdenes.
- Order → **Cart**: N:1 histórica — Una orden proviene de un carrito en un momento dado.
- Order → **Product**: N:M — Mediante OrderItems con snapshot histórico.

#### Business Rules
- Una orden no puede modificarse después de completada.
- Los precios deben conservarse como snapshot (histórico).
- Solo se permiten transiciones de estado válidas.
- No se puede eliminar una orden con productos entregados.
- El stock debe descontarse al crear la orden y restaurarse al cancelarla.

## 4. Entity Relationships

### 4.1 Relationship Overview
Las entidades del sistema se relacionan en tres grupos funcionales: **catálogo** (Category, Brand, Product, Inventory, Offer), **usuarios** (User, Address) y **comercio** (Cart, Order). Las entidades de catálogo alimentan las operaciones decommerce, mientras que User actúa como eje entre su información personal y sus transacciones.

### 4.2 User Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| User → Address | 1:N | Un usuario puede tener múltiples direcciones de envío. |
| User → Cart | 1:1 | Un usuario tiene exactamente un carrito activo. |
| User → Order | 1:N | Un usuario puede generar múltiples órdenes a lo largo del tiempo. |

### 4.3 Address Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Address → User | N:1 | Una dirección pertenece a un único usuario. |
| Address → Order | N:1 (snapshot) | Una dirección puede usarse en múltiples órdenes, pero cada orden conserva su propia copia. |

### 4.4 Category Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Category → Product | 1:N | Una categoría agrupa muchos productos. |
| Category → Subcategory | 1:N | Las subcategorías pertenecen exclusivamente a una categoría. |

### 4.5 Product Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Product → Category | N:1 | Un producto pertenece a una categoría. |
| Product → Brand | N:1 | Un producto tiene una marca comercial. |
| Product → Inventory | 1:1 | Un producto tiene exactamente un registro de inventario. |
| Product → Offer | 1:N | Un producto puede tener múltiples ofertas en su historial. |
| Product → CartItem | 1:N | Un producto puede estar en múltiples carritos (como referencia). |
| Product → OrderItem | 1:N | Un producto puede estar en múltiples órdenes (como snapshot histórico). |

### 4.6 Brand Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Brand → Product | 1:N | Una marca puede identificar muchos productos. |

### 4.7 Inventory Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Inventory → Product | 1:1 | Cada inventario corresponde a un único producto. |

### 4.8 Offer Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Offer → Product | N:1 | Una oferta aplica a un único producto. |
| Product → Offer | 1:N | Un producto puede tener múltiples ofertas a través del tiempo. |

### 4.9 Cart Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Cart → User | 1:1 | Un carrito pertenece a un único usuario. |
| Cart → Product | N:M | Un carrito contiene múltiples productos mediante CartItems (referencia dinámica). |
| Cart → Order | 1:N (conceptual) | Un carrito puede generar múltiples órdenes a través del tiempo (se vacía tras cada checkout). |

### 4.10 Order Relationships
| Entidad | Cardinalidad | Descripción |
|---|---|---|
| Order → User | N:1 | Una orden pertenece a un usuario. |
| Order → Cart | N:1 (histórica) | Una orden proviene de un carrito en un momento dado. |
| Order → Product | N:M | Una orden contiene productos mediante OrderItems con snapshot histórico. |
| Order → Address | N:1 (snapshot) | Una orden conserva la dirección utilizada al momento de la compra. |

### 4.11 Relationship Matrix

| Entity A | Relationship | Entity B | Cardinality | Description |
|---|---|---|---|---|
| User | tiene | Address | 1:N | Un usuario puede tener múltiples direcciones |
| User | posee | Cart | 1:1 | Un usuario tiene un carrito activo |
| User | crea | Order | 1:N | Un usuario genera múltiples órdenes |
| Address | pertenece a | User | N:1 | Una dirección pertenece a un usuario |
| Address | usada en | Order | N:1 (snapshot) | Dirección copiada al crear orden |
| Category | contiene | Product | 1:N | Una categoría agrupa productos |
| Category | tiene | Subcategory | 1:N | Subcategorías embebidas |
| Product | pertenece a | Category | N:1 | Un producto se clasifica en una categoría |
| Product | tiene | Brand | N:1 | Un producto tiene una marca |
| Product | tiene | Inventory | 1:1 | Un producto tiene stock |
| Product | recibe | Offer | 1:N | Un producto puede tener ofertas |
| Product | aparece en | Cart | N:M | Productos referenciados en carritos |
| Product | aparece en | Order | N:M | Productos como snapshot en órdenes |
| Brand | identifica | Product | 1:N | Una marca agrupa productos |
| Inventory | registra | Product | 1:1 | Stock de un producto |
| Offer | aplica a | Product | N:1 | Oferta sobre un producto |
| Cart | pertenece a | User | 1:1 | Carrito activo del usuario |
| Cart | contiene | Product | N:M | Items con referencia dinámica |
| Cart | genera | Order | 1:N | Checkouts sucesivos |
| Order | pertenece a | User | N:1 | Órdenes de un usuario |
| Order | contiene | Product | N:M | Items con snapshot histórico |
| Order | registra | Address | N:1 (snapshot) | Dirección al momento de compra |

### 4.12 Dependency Analysis

**Entidades independientes:**
- **User** — puede existir sin direcciones, carrito u órdenes
- **Category** — existe independientemente de los productos
- **Brand** — existe independientemente de los productos
- **Product** — aunque depende conceptualmente de Category y Brand para estar completo, puede existir como entidad propia

**Entidades dependientes:**
- **Address** → depende de User
- **Inventory** → depende de Product
- **Offer** → depende de Product
- **Cart** → depende de User + Product
- **Order** → depende de User + Product + Address

### 4.13 Historical Data Considerations

En ecommerce es crítico distinguir entre **datos actuales** y **datos históricos**:

| Tipo | Entidades | Comportamiento |
|---|---|---|
| **Datos actuales** | Product, Inventory, Offer activa, Cart | Reflejan el estado presente; pueden modificarse |
| **Datos históricos** | Order, OrderItem, Address (snapshot), Price (snapshot) | Representan eventos pasados; no deben modificarse |

**Reglas de snapshot:**
- **Order items**: conservan `name`, `price`, `image`, `quantity` al momento de la compra
- **Product prices**: el precio pagado queda congelado en el OrderItem, aunque el producto cambie después
- **Address**: la dirección de envío se copia a la orden; cambios futuros del usuario no afectan órdenes existentes
- **Cart**: usa referencias dinámicas al producto (no snapshot), porque refleja la intención actual de compra

### 4.14 Business Flow

```
Customer
    |
    v
Browse Products (con filtros por categoría, marca, búsqueda)
    |
    v
Check Availability (Inventory > 0)
    |
    v
Add To Cart (referencia dinámica al producto)
    |
    v
Checkout (validar carrito, direcciones, disponibilidad)
    |
    v
Snapshot Data (precios, dirección — congelar históricos)
    |
    v
Create Order (con items, totales, estado inicial)
    |
    v
Update Inventory (descontar stock, reservar si aplica)
    |
    v
Process Order (transiciones de estado: pending → processing → completed)
```

### 4.15 Model Independence

El modelo del sistema representa el dominio del negocio independientemente de la tecnología utilizada para implementarlo.

Primero se define:
- Qué entidades existen.
- Qué atributos poseen.
- Cómo se relacionan.
- Qué reglas de negocio existen.

Estas decisiones pertenecen al dominio del sistema y no dependen de una base de datos específica.

**Ejemplo:**

Modelo conceptual:
```
Producto
  → nombre
  → precio
  → categoría
```

Puede implementarse como:

- **MongoDB:** `{ "name": "Coca-Cola", "price": 50, "category": "Bebidas" }`
- **PostgreSQL:** `products (id, name, price, category_id)`

La tecnología cambia, pero el modelo del negocio permanece.

Las secciones 1 a 4 constituyen el **modelo conceptual del dominio**, independiente de la base de datos. La sección 5 representa una **implementación física orientada a MongoDB**, pero el mismo modelo podría implementarse en otras tecnologías de almacenamiento sin modificar las definiciones del negocio.

## 5. MongoDB Data Modeling

### 5.1 Database Overview
Conversión del modelo conceptual del dominio a un diseño físico para MongoDB. Cada decisión se justifica según patrones de lectura/escritura, ciclo de vida de los datos y escalabilidad del hipermercado.

### 5.2 Collection Inventory

| Collection | Type | Purpose |
|---|---|---|
| `users` | Root collection | Cuentas de usuario |
| `addresses` | Root collection | Direcciones de envío |
| `categories` | Root collection | Clasificación de productos |
| `brands` | Root collection | Marcas comerciales |
| `products` | Root collection | Catálogo de productos |
| `inventory` | Root collection | Stock de productos |
| `offers` | Root collection | Promociones y descuentos |
| `carts` | Root collection | Carritos activos |
| `orders` | Root collection | Órdenes de compra |

### 5.3 User + Address Modeling Decision

**Decision: Reference**

**Reason:** Addresses are modeled as an independent collection because they have their own lifecycle, can grow independently from users, and are frequently accessed during checkout. User documents remain small while address management remains scalable.

**Model:**

```json
// users collection
{
  "_id": ObjectId,
  "name": "Oliver Diaz",
  "email": "oliver@email.com",
  "password": "hashed",
  "role": "customer"
}

// addresses collection
{
  "_id": ObjectId,
  "userId": ObjectId,
  "label": "Casa",
  "street": "Calle 1",
  "city": "Santo Domingo",
  "state": "Santo Domingo",
  "country": "Dominican Republic",
  "zipCode": "10101",
  "isDefault": true
}
```

**Indexes:**
- `users.email` → unique
- `addresses.userId` → index
- `addresses.userId + isDefault` → compound index

**Note:** Orders store address snapshots to preserve historical information.

### 5.4 Category + Subcategory Modeling Decision

**Decision: Embedding**

**Reason:** Subcategories are tightly coupled with categories, do not have an independent lifecycle, and are always accessed together with their parent category. Embedding provides simpler queries and keeps the category model aligned with the business domain.

**Model:**

```json
{
  "_id": ObjectId,
  "name": "Bebidas",
  "slug": "bebidas",
  "subcategories": [
    { "name": "Refrescos", "slug": "refrescos" },
    { "name": "Jugos", "slug": "jugos" }
  ]
}
```

**Indexes:**
- `categories.slug` → unique
- `categories.name` → unique

### 5.5 Product + Category + Brand Modeling Decision

**Decision: Partial Embedding with Reference IDs**

**Reason:** Products are read-heavy entities. Category and Brand information is displayed frequently during catalog browsing, filtering and search operations. The product document stores both reference identifiers and duplicated descriptive data to optimize read performance while maintaining relationship traceability.

**Model:**

```json
// products collection
{
  "_id": ObjectId,
  "name": "Coca-Cola",
  "price": 80,
  "categoryId": ObjectId,
  "category": {
    "name": "Bebidas",
    "slug": "bebidas"
  },
  "brandId": ObjectId,
  "brand": {
    "name": "Coca-Cola",
    "slug": "coca-cola"
  }
}
```

**Rules:**
- Category and Brand remain independent entities.
- Product stores `categoryId` and `brandId` as references.
- Product embeds category and brand display information.
- Changes to category or brand names require synchronization of embedded values.

**Indexes:**
- `products.categoryId` → index (filter by category)
- `products.brandId` → index (filter by brand)
- `products.category.slug` → index (URL-based filtering)
- `products.brand.slug` → index (URL-based filtering)

### 5.6 Product + Inventory Modeling Decision

**Decision: Separate collection using references**

**Reason:** Inventory has a different lifecycle from Product. Product information is mostly static, while inventory changes frequently due to purchases, cancellations and stock adjustments. Separating inventory avoids write contention on product documents and allows future expansion to multiple warehouses.

**Model:**

```json
// products collection
{
  "_id": ObjectId,
  "name": "Coca-Cola",
  "price": 80
}

// inventory collection
{
  "_id": ObjectId,
  "productId": ObjectId,
  "stock": 150,
  "reservedStock": 5,
  "minStock": 10,
  "updatedAt": ISODate
}
```

**Rules:**
- Inventory references Product through `productId`.
- Each product has one inventory record in the current version.
- Inventory updates must not modify Product documents.
- Stock operations must be handled independently.

**Indexes:**
- `inventory.productId` → unique

### 5.7 Product + Offer Modeling Decision

**Decision: Separate collection using references**

**Reason:** Offers have an independent lifecycle from Products, require administrative management, and may accumulate historical records over time. Separating offers prevents Product documents from growing and allows efficient queries for active promotions.

**Model:**

```json
// offers collection
{
  "_id": ObjectId,
  "productId": ObjectId,
  "title": "Semana de bebidas",
  "originalPrice": 80,
  "discountPrice": 60,
  "discountPercentage": 25,
  "startDate": ISODate,
  "endDate": ISODate,
  "isActive": true
}
```

**Rules:**
- Offer references Product through `productId`.
- Product keeps its original price independently.
- Discount prices are stored inside Offer documents.
- Historical offers are preserved across time.

**Indexes:**
- `offers.productId` → index
- `offers.isActive + startDate + endDate` → compound index (active offers query)
- `offers.createdAt` → index (admin panel ordering)

### 5.8 Cart Items Modeling Decision

**Decision: Dynamic reference**

**Reason:** The cart represents a temporary intention to purchase, not a historical record. Product data is resolved dynamically from the Product collection at read time, ensuring the user always sees the current price, name, and image.

**Model:**

```json
// carts collection
{
  "_id": ObjectId,
  "userId": ObjectId,
  "items": [
    { "productId": ObjectId, "quantity": 2 }
  ],
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

**Rules:**
- Cart items store only `productId` and `quantity`.
- Display data (name, price, image) is resolved from Product at read time.
- Snapshot responsibility belongs to Order, not Cart.

**Indexes:**
- `carts.userId` → unique (one active cart per user)

### 5.9 Order Items Modeling Decision

**Decision: Embedded snapshot**

**Reason:** An order is a historical document. All product data must be frozen at the moment of purchase to preserve the transaction record, even if products, prices, or images change later.

**Model:**

```json
// orders collection
{
  "_id": ObjectId,
  "userId": ObjectId,
  "items": [
    {
      "productId": ObjectId,
      "name": "Coca-Cola",
      "price": 80,
      "image": "coca.jpg",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "label": "Casa",
    "street": "Calle 1",
    "city": "Santo Domingo",
    "state": "Santo Domingo",
    "country": "Dominican Republic",
    "zipCode": "10101"
  },
  "totalItems": 2,
  "subtotal": 160,
  "status": "pending",
  "paymentStatus": "unpaid",
  "createdAt": ISODate,
  "updatedAt": ISODate
}
```

**Rules:**
- Order items embed complete product snapshots (name, price, image).
- The shipping address is an embedded snapshot, not a reference.
- Changes to products or addresses after the order do not affect existing orders.

### 5.10 Embedding vs References — Summary

| Entity Pair | Decision | Rationale |
|---|---|---|
| Category → Subcategory | **Embedding** | No independent lifecycle, always accessed together |
| Product → Category/Brand | **Partial Embedding + Reference IDs** | Read optimization + relationship traceability |
| Product → Inventory | **Reference** | High write frequency, independent lifecycle |
| Product → Offer | **Reference** | Independent lifecycle, admin management, historical records |
| Cart → Product | **Reference + Runtime Resolution** | Temporary intent, current prices required |
| Order → Product | **Snapshot Embedding** | Historical document, must preserve purchase data |
| Order → Address | **Snapshot Embedding** | Historical document, must preserve shipping address |
| User → Address | **Reference** | Independent lifecycle, checkout flow |

### 5.11 Index Strategy

#### users
| Index | Type | Business Case |
|---|---|---|
| `email` | unique | Login, registration, password recovery |

#### addresses
| Index | Type | Business Case |
|---|---|---|
| `userId` | index | Load user addresses during checkout |
| `userId + isDefault` | compound | Quick default address lookup |

#### categories
| Index | Type | Business Case |
|---|---|---|
| `slug` | unique | URL-based category navigation |
| `name` | unique | Prevent duplicate categories |

#### brands
| Index | Type | Business Case |
|---|---|---|
| `slug` | unique | URL-based brand filtering |
| `name` | unique | Prevent duplicate brands |

#### products
| Index | Type | Business Case |
|---|---|---|
| `categoryId` | index | Filter products by category |
| `brandId` | index | Filter products by brand |
| `category.slug` | index | URL-based category filtering |
| `brand.slug` | index | URL-based brand filtering |
| `name` | text index | Full-text product search |
| `sku` | unique | Internal product identification |

#### inventory
| Index | Type | Business Case |
|---|---|---|
| `productId` | unique | 1:1 relationship with Product |
| `stock` | index | Low-stock alerts and queries |

#### offers
| Index | Type | Business Case |
|---|---|---|
| `productId` | index | Offers by product lookup |
| `isActive + startDate + endDate` | compound | Active promotions query |
| `createdAt` | index | Admin panel campaign ordering |

#### carts
| Index | Type | Business Case |
|---|---|---|
| `userId` | unique | One active cart per user |

#### orders
| Index | Type | Business Case |
|---|---|---|
| `userId` | index | Customer order history |
| `status` | index | Admin panel order filtering |
| `createdAt` | index | Order listing and sorting |
| `userId + createdAt` | compound | Customer history sorted by date |

### 5.12 Data Integrity Rules

#### User
- `email` must be unique across all users.
- `password` must always be stored hashed (bcrypt).
- `role` must be one of: `customer` | `admin`.

#### Address
- Must reference a valid `userId`.
- At least `street`, `city`, and `country` are required.
- Only one address per user can have `isDefault = true`.

#### Category
- `name` and `slug` must be unique.
- Cannot delete a category that has associated products.

#### Brand
- `name` must be unique.
- Inactive brands must be preserved (historical orders may reference them).

#### Product
- `price` must be greater than zero.
- `category` is required.
- `sku` must be unique.
- `stock` is managed by the Inventory collection, not Product.
- Products with historical orders must not be physically deleted.

#### Inventory
- `stock` must never be negative.
- `reservedStock` must never exceed `stock`.
- Available stock: `availableStock = stock - reservedStock`.
- Only exists as a 1:1 relationship with Product.

#### Offer
- `discountPrice` must be less than `originalPrice`.
- `startDate` must be before or equal to `endDate`.
- Product base price remains unchanged (offer is a temporary modification).

#### Cart
- One active cart per user.
- Item `quantity` must be greater than zero.
- Cart is cleared after order creation.
- Unavailable products must not be added to cart.

#### Order
- Must belong to a valid user.
- Must contain at least one item.
- Historical prices in snapshots must never be modified.
- Status transitions must follow: `pending → processing → completed` or `pending → cancelled` or `processing → cancelled`.
- Stock must be deducted on order creation and restored on cancellation.

### 5.13 Final MongoDB Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      users                                  │
│  { _id, name, email, password, role, createdAt, updatedAt } │
└────────────────────────┬────────────────────────────────────┘
                         │ 1:N
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     addresses                               │
│  { _id, userId, label, street, city, state, country,        │
│    zipCode, isDefault }                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     categories                              │
│  { _id, name, slug, subcategories: [{ name, slug }] }      │
└────────────────────────┬────────────────────────────────────┘
                         │ 1:N
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      products                               │
│  { _id, sku, name, description, price, image, imageKey,     │
│    categoryId, category: { name, slug },                    │
│    brandId, brand: { name, slug },                          │
│    unit, unitQuantity, status, isAvailable,                 │
│    translations: { es: { name, description },               │
│                    en: { name, description } },              │
│    createdAt, updatedAt }                                   │
└───────┬──────────────────────┬──────────────────┬───────────┘
        │ 1:1                  │ N:1              │ 1:N
        ▼                      ▼                  ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   inventory   │    │    brands     │    │    offers     │
│ { _id,        │    │ { _id,        │    │ { _id,        │
│   productId,  │    │   name,       │    │   productId,  │
│   stock,      │    │   slug,       │    │   title,      │
│   reservedStock│   │   status }    │    │   originalPrice,│
│   minStock }  │    └───────────────┘    │   discountPrice,│
└───────────────┘                         │   isActive }  │
                                          └───────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       carts                                 │
│  { _id, userId, items: [{ productId, quantity }],           │
│    createdAt, updatedAt }                                   │
└────────────────────────┬────────────────────────────────────┘
                         │ 1:N (checkout history)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       orders                                │
│  { _id, userId,                                             │
│    items: [{ productId, name, price, image, quantity }],    │
│    shippingAddress: { label, street, city, state,            │
│                       country, zipCode },                   │
│    totalItems, subtotal, status, paymentStatus,             │
│    createdAt, updatedAt }                                   │
└─────────────────────────────────────────────────────────────┘
```

### 5.14 Modeling Methodology

El diseño del sistema se realizó siguiendo un proceso estructurado de modelado, compuesto por las siguientes etapas:

**1. Análisis del sistema existente**
- Revisión completa del código fuente actual (módulos, tipos, datos).
- Identificación de entidades, relaciones y reglas de negocio ya implementadas.
- Comprensión del flujo de datos entre capas (routes → controllers → services → repositories → data).

**2. Modelado conceptual del dominio**
- Descomposición del negocio en entidades con propósito y responsabilidades definidas.
- Definición de atributos sin acoplarse a decisiones de persistencia.
- Identificación de relaciones y cardinalidades (1:1, 1:N, N:M).
- Documentación de reglas de negocio.

**3. Evaluación de alternativas de diseño**
- Para cada decisión de persistencia se compararon opciones (embedding vs reference).
- Cada alternativa se evaluó según: frecuencia de lectura, frecuencia de escritura, ciclo de vida de los datos, escalabilidad y tamaño del documento.
- Las decisiones se documentaron con justificación explícita.

**4. Diagramas de arquitectura**
- Diagrama de colecciones y relaciones (sección 5.13).
- Mapa de dependencias entre entidades (sección 4.12).
- Flujo de negocio completo (sección 4.14).

**Metodología aplicada:** Domain-Driven Design (táctico) para identificación de entidades y relaciones. Patrones de modelado MongoDB (Embedding vs References) para decisiones de persistencia. Documentación progresiva (ADR-light) para cada decisión de diseño.

---

## 6. Object Storage Architecture (F0.0)

### 6.1 Contexto

Los productos requieren imágenes. **MongoDB no almacena el binario**: guarda únicamente la metadata y las URLs necesarias (ver `docs/STORAGE-ARCHITECTURE.md`). El almacenamiento de archivos es responsabilidad de un **object storage** externo (Cloudflare R2 en producción), accesible vía CDN. Los dos storefronts (Angular y Next.js) y el Dashboard consumen las mismas URLs públicas.

### 6.2 Principios

1. **MongoDB es la fuente de verdad de los datos** del catálogo (incluidas las traducciones).
2. **R2 es la fuente de verdad de los archivos multimedia**. No hay copias: ni en el servidor Express, ni en los frontends, ni en el repositorio git.
3. **El backend controla autorización y metadata**; el archivo sube directo al storage mediante **presigned URLs** (ver `ADR-013-presigned-uploads.md`).
4. **El almacenamiento está detrás de una interfaz** `ObjectStorageProvider`: `LocalStorageProvider` (desarrollo) y `R2StorageProvider` (producción). El dominio de productos no conoce el proveedor concreto (ver `ADR-012-storage-r2.md`).

### 6.3 Arquitectura de datos de imagen

| Campo | Responsabilidad |
| --- | --- |
| `image` | URL pública (CDN) que consumen Angular Store y Next.js. Nunca se construye manualmente en los frontends. |
| `imageKey` | Referencia interna de storage (`products/{id}/{uuid}.{ext}`). Solo el backend la usa para reemplazar/confirmar/eliminar objetos. |
| `imageThumbnail` | URL pública de la miniatura (opcional, generada client-side en F2). |

### 6.4 Flujo de alto nivel

```
Dashboard Angular ──Admin API (JWT)──► Express API ──► MongoDB (datos + traducciones)
                                              │ Presigned URLs
                                              ▼
                                       Cloudflare R2 ──► CDN / URLs públicas
                                              ▲
                                              │
                       Angular Store ◄─────────┴─────────► Next.js Store
```

- **Un solo contrato de API** definido por el backend (`docs/API-CONTRACT.md`).
- **Un solo R2 compartido**: Angular Store y Next.js consumen las mismas URLs; no se duplican assets ni se crean fuentes de verdad separadas.
- Cada storefront hace su propio **mapping** (API → modelo UI local) sin adaptar el backend a cada uno.

### 6.5 Referencias

- `docs/STORAGE-ARCHITECTURE.md` — estructura de keys, límites, limpieza.
- `docs/ECOMMERCE-DATA-FLOW.md` — flujo extremo a extremo del producto.
- `docs/PRODUCT-IMAGES-MIGRATION.md` — migración de los 184 assets históricos.
