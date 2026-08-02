# backend-advanced-websites-hypermarket-express-mongodb

Backend del hypermarket con Node.js + Express + TypeScript utilizando **Feature-Based Architecture**.

> Migración de JavaScript a TypeScript completada ✅

## System Architecture

Este repositorio es la **Backend API (API central)** del ecosistema **Hipermercado
Superior**. Es consumida por los tres clientes del sistema: los dos storefronts de
clientes y el panel administrativo.

```
                    Hipermercado Superior Ecosystem

        backend-advanced-websites-hypermarket-express-mongodb
                         Express REST API
                                      |
        -----------------------------------------------------------------
        |                           |                            |
        |                           |                            |
pre-advanced-websites-    pre-advanced-websites-      dashboard-websites-
hypermarket-next          hypermarket-angular         hypermarket

   Next.js Storefront         Angular Storefront      Angular Admin Dashboard
     (Customer App)            (Customer App)              (Admin App)
                                      |
                                      ▼
                                 MongoDB
```

| Repository | Type | Technology | Purpose |
|------------|------|------------|---------|
| backend-advanced-websites-hypermarket-express-mongodb | Backend API | Express + MongoDB + JWT | API central del sistema |
| pre-advanced-websites-hypermarket-next | Customer Frontend | Next.js + React | Tienda pública |
| pre-advanced-websites-hypermarket-angular | Customer Frontend | Angular | Tienda pública alternativa |
| dashboard-websites-hypermarket | Admin Frontend | Angular + Material + NgRx Signals | Panel administrativo |

### Consumed by

Esta API es consumida por:

- **Next.js storefront** — `pre-advanced-websites-hypermarket-next`
- **Angular storefront** — `pre-advanced-websites-hypermarket-angular`
- **Angular admin dashboard** — `dashboard-websites-hypermarket`

### Flujo de comunicación

```
Storefronts (Next · Angular) · Admin Dashboard
        │
        ▼
backend-advanced-websites-hypermarket-express-mongodb (Express REST API)
        │
        ▼
MongoDB
```

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
│   │   ├── error-handler.ts       # Manejo centralizado de errores
│   │   ├── logger.middleware.ts   # Registro de peticiones HTTP
│   │   └── validation.middleware.ts # Validación de campos requeridos
│   ├── errors/    # Clases de errores personalizados
│   ├── utils/     # Funciones utilitarias reutilizables
│   └── constants/ # Constantes globales (roles, códigos, mensajes)
├── config/        # Configuración centralizada (variables de entorno)
├── app.ts         # Configuración de Express (middlewares, rutas)
└── server.ts      # Inicio del servidor
```

## Responsabilidades

| Archivo/Carpeta | Responsabilidad |
|----------------|----------------|
| `app.ts` | Configuración de Express (middlewares, rutas) |
| `server.ts` | Inicio del servidor y puerto |
| `config/` | Configuración centralizada desde variables de entorno |
| `modules/` | Módulos de negocio independientes (features) |
| `modules/users/` | CRUD completo de usuarios con datos en memoria |
| `shared/middleware/` | Middlewares globales reutilizables |
| `shared/middleware/error-handler.ts` | Captura y responde errores de forma uniforme |
| `shared/middleware/logger.middleware.ts` | Registra método, URL, código de estado y tiempo de cada petición |
| `shared/middleware/validation.middleware.ts` | Valida campos obligatorios en el body de la petición |
| `shared/errors/` | Clases de errores personalizados |
| `shared/errors/not-found.error.ts` | Error 404 para recursos no encontrados |
| `shared/errors/email-already-exists.error.ts` | Error 409 para email duplicado |
| `shared/errors/invalid-data.error.ts` | Error 400 para datos invalidos |
| `shared/utils/` | Funciones utilitarias transversales |
| `shared/constants/` | Constantes globales (roles, códigos, mensajes) |

## Tecnologías

- Node.js
- Express
- TypeScript (strict mode)
- cors (Cross-Origin Resource Sharing)
- dotenv (variables de entorno)
- nodemon (desarrollo)
- tsx (ejecución TypeScript en desarrollo)

## Variables de entorno

Copiar `.env.example` a `.env` y configurar los valores:

| Variable | Descripción | Obligatorio |
|----------|-------------|-------------|
| `PORT` | Puerto del servidor | No (default: 3000) |
| `NODE_ENV` | Entorno (development, production) | No (default: development) |
| `CORS_ORIGIN` | Orígenes permitidos para CORS (separados por coma) | No (default: http://localhost:4200) |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | Sí (cuando se implemente Auth) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token JWT | No (default: 1d) |

> `MONGODB_URI` está definida en `.env.example` como preparación para la futura migración a MongoDB.

## Middlewares

### Orden de ejecución

1. **express.json()** - Parsea el body JSON de las peticiones entrantes.
2. **express.urlencoded()** - Parsea datos de formularios URL-encoded.
3. **logger** - Registra en consola cada petición con fecha, método, URL, código de estado y duración.
4. **cors** - Permite peticiones desde orígenes cruzados (Angular, Next.js).
5. **Rutas** - Enrutadores específicos de cada módulo (/api/products, /api/categories, etc.).
6. **errorHandler** - Middleware de errores que captura cualquier error no manejado y responde con formato uniforme.

### Logger
Ubicación: `src/shared/middleware/logger.middleware.ts`
- Registra timestamp ISO, método HTTP, URL, código de estado y tiempo de respuesta.
- Se ejecuta en cada petición antes de llegar a las rutas.

### CORS
Configurado con el paquete oficial `cors`.
- Soporta múltiples orígenes via `CORS_ORIGIN` separados por coma.
- Desarrollo: `http://localhost:4200` (Angular), `http://localhost:3000` (Next.js).
- En producción se restringirá al dominio del frontend.

### Validación
Ubicación: `src/shared/middleware/validation.middleware.ts`
- Middleware `validateRequiredFields(fields)` que verifica que los campos especificados existan en `req.body`.
- Retorna 400 Bad Request si faltan campos.

### Error Handler
Ubicación: `src/shared/middleware/error-handler.ts`
- Captura errores lanzados en rutas y middlewares.
- Compatible con `NotFoundError` (statusCode 404).
- Responde siempre con `{ success: false, message, statusCode }`.

## Autenticación

El módulo `auth/` maneja registro, inicio de sesión y verificación de tokens JWT.

### Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | /api/auth/register | Registrar nuevo usuario | No |
| POST | /api/auth/login | Iniciar sesión y obtener token | No |
| GET | /api/auth/me | Obtener usuario actual | Sí (Bearer Token) |

### JWT

- Las contraseñas se hashean con `bcryptjs` antes de almacenarse.
- El token JWT incluye `id`, `email` y `role`.
- El middleware `auth.middleware` verifica tokens en rutas protegidas.
- Seed users: `oliver@email.com`, `maria@email.com`, `carlos@email.com` — todas con password `123456`.
- Configurar `JWT_SECRET` en `.env` (actual: `hypermarket_dev_secret_2026`).

## Users API

### Endpoints

| Metodo | Ruta | Descripcion | Validaciones |
|--------|------|-------------|-------------|
| GET | /api/users | Listar todos los usuarios | - |
| GET | /api/users/:id | Obtener usuario por ID | - |
| POST | /api/users | Crear nuevo usuario | name, email, password obligatorios; email unico; password mayor a 6 caracteres |
| PATCH | /api/users/:id | Actualizar usuario parcialmente | Solo name, email, password; email unico; password mayor a 6 caracteres |
| DELETE | /api/users/:id | Eliminar usuario | - |

## Frontend Integration

Esta API está diseñada para ser consumida por múltiples frontends sin depender de ninguna tecnología específica.

```
        backend-advanced-websites-hypermarket-express-mongodb

                                  |
        --------------------------------------------------------
        |                         |                            |
        ▼                         ▼                            ▼

pre-advanced-websites-   pre-advanced-websites-      dashboard-websites-
hypermarket-next         hypermarket-angular         hypermarket

Customer Storefront      Customer Storefront        Admin Dashboard
```

### CORS
Configura `CORS_ORIGIN` en `.env` con los orígenes permitidos separados por coma:
```
CORS_ORIGIN=http://localhost:4200,http://localhost:3000,https://midominio.com
```

### Formato de respuestas
Todas las respuestas siguen un contrato uniforme:
- Éxito: `{ "success": true, "data": [...] }`
- Error: `{ "success": false, "message": "...", "statusCode": 400 }`

### Documentación detallada
Ver [`docs/API-USAGE.md`](docs/API-USAGE.md) para la documentación completa de endpoints, parámetros, ejemplos de respuesta y errores.

## Arquitectura

Este proyecto utiliza **Feature-Based Architecture**: cada funcionalidad del negocio (products, users, cart, orders, auth) vive en su propio módulo dentro de `src/modules/`. El código compartido entre módulos se encuentra en `src/shared/`.

## Testing

Infraestructura de testing profesional con **Jest + ts-jest + MongoDB Memory Server**.

### Stack

| Herramienta | Uso |
|-------------|-----|
| `jest` | Runner de tests (multi-proyecto: unit e integration) |
| `ts-jest` | Transpilación de TypeScript para Jest |
| `supertest` | Tests de endpoints HTTP (API) |
| `mongodb-memory-server` | MongoDB en memoria aislado (nunca toca la BD local ni de desarrollo) |

### Scripts

| Comando | Descripción |
|---------|-------------|
| `npm test` | Ejecuta todos los tests |
| `npm run test:unit` | Solo tests unitarios (`tests/unit/**`) |
| `npm run test:integration` | Solo tests de integración (`tests/integration/**`) con MongoDB en memoria |
| `npm run test:watch` | Modo watch |
| `npm run test:coverage` | Ejecuta tests con cobertura (reporte en `coverage/`) |

### Estructura

```
tests/
├── setup/          # Configuración global: MongoMemoryServer, conexión/limpieza BD
│   ├── global-setup.ts      # Arranca MongoMemoryServer y carga .env.test
│   ├── global-teardown.ts   # Detiene MongoMemoryServer
│   ├── unit.setup.ts        # Setup liviano (sin Mongo/Mongoose)
│   └── integration.setup.ts # Conecta, limpia colecciones y desconecta
├── unit/           # Tests unitarios (services, controllers, middleware, utils, repositories-mocks)
├── integration/    # Tests de integración (repositories, auth, products, orders, ...)
├── helpers/        # Helpers reutilizables
├── fixtures/       # Datos estáticos
├── factories/      # Factories de datos
└── utils/          # Utilidades de test
```

### Entorno de testing

- Se utiliza `.env.test` (aislado del entorno de desarrollo).
- `MONGODB_URI` se sobreescribe automáticamente con la URI de `MongoMemoryServer`.
- Cada worker de Jest usa una base única (`test_${JEST_WORKER_ID}`) dentro del memory server, por lo que los tests de integración en paralelo no se pisan entre sí.
- Cada suite de integración inicia con la base limpia (limpieza en `afterEach`).
- Configuración: `jest.config.ts` (multi-proyecto, `testEnvironment: node`, `detectOpenHandles`) y `tsconfig.test.json`.