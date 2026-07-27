# backend-advanced-websites-hypermarket-express-mongodb

Backend del hypermarket con Node.js + Express utilizando **Feature-Based Architecture**.

## Arquitectura

```
src/
├── modules/       # Módulos de negocio (features)
│   ├── products/  # Gestión de productos
│   ├── categories/# Gestión de categorías
│   ├── offers/    # Gestión de ofertas
│   ├── search/    # Búsqueda de productos
│   ├── users/     # Gestión de usuarios
│   ├── cart/      # Carrito de compras
│   ├── orders/    # Pedidos
│   └── auth/      # Autenticación
├── shared/        # Código transversal reutilizable
│   ├── middleware/ # Middlewares globales (logger, cors, validación, errores)
│   │   ├── error-handler.js       # Manejo centralizado de errores
│   │   ├── logger.middleware.js   # Registro de peticiones HTTP
│   │   └── validation.middleware.js # Validación de campos requeridos
│   ├── errors/    # Clases de errores personalizados
│   ├── utils/     # Funciones utilitarias reutilizables
│   └── constants/ # Constantes globales (roles, códigos, mensajes)
├── config/        # Configuración centralizada (variables de entorno)
├── app.js         # Configuración de Express (middlewares, rutas)
└── server.js      # Inicio del servidor
```

## Responsabilidades

| Archivo/Carpeta | Responsabilidad |
|----------------|----------------|
| `app.js` | Configuración de Express (middlewares, rutas) |
| `server.js` | Inicio del servidor y puerto |
| `config/` | Configuración centralizada desde variables de entorno |
| `modules/` | Módulos de negocio independientes (features) |
| `shared/middleware/` | Middlewares globales reutilizables |
| `shared/middleware/error-handler.js` | Captura y responde errores de forma uniforme |
| `shared/middleware/logger.middleware.js` | Registra método, URL, código de estado y tiempo de cada petición |
| `shared/middleware/validation.middleware.js` | Valida campos obligatorios en el body de la petición |
| `shared/errors/` | Clases de errores personalizados |
| `shared/utils/` | Funciones utilitarias transversales |
| `shared/constants/` | Constantes globales (roles, códigos, mensajes) |

## Tecnologías

- Node.js
- Express
- cors (Cross-Origin Resource Sharing)
- dotenv (variables de entorno)
- nodemon (desarrollo)

## Middlewares

### Orden de ejecución

1. **express.json()** - Parsea el body JSON de las peticiones entrantes.
2. **express.urlencoded()** - Parsea datos de formularios URL-encoded.
3. **logger** - Registra en consola cada petición con fecha, método, URL, código de estado y duración.
4. **cors** - Permite peticiones desde orígenes cruzados (Angular, Next.js).
5. **Rutas** - Enrutadores específicos de cada módulo (/api/products, /api/categories, etc.).
6. **errorHandler** - Middleware de errores que captura cualquier error no manejado y responde con formato uniforme.

### Logger
Ubicación: `src/shared/middleware/logger.middleware.js`
- Registra timestamp ISO, método HTTP, URL, código de estado y tiempo de respuesta.
- Se ejecuta en cada petición antes de llegar a las rutas.

### CORS
Configurado con el paquete oficial `cors`.
- En desarrollo: permite `http://localhost:4200` (Angular).
- Origen configurable via variable de entorno `CORS_ORIGIN`.
- En producción se restringirá al dominio del frontend.

### Validación
Ubicación: `src/shared/middleware/validation.middleware.js`
- Middleware `validateRequiredFields(fields)` que verifica que los campos especificados existan en `req.body`.
- Retorna 400 Bad Request si faltan campos.

### Error Handler
Ubicación: `src/shared/middleware/error-handler.js`
- Captura errores lanzados en rutas y middlewares.
- Compatible con `NotFoundError` (statusCode 404).
- Responde siempre con `{ success: false, message, statusCode }`.

## Arquitectura

Este proyecto utiliza **Feature-Based Architecture**: cada funcionalidad del negocio (products, users, cart, orders, auth) vive en su propio módulo dentro de `src/modules/`. El código compartido entre módulos se encuentra en `src/shared/`. Es