# Rate Limiting en Producción (Fase 11.1)

Documenta el comportamiento de los límites de peticiones de la API, los valores
por defecto y las limitaciones del mecanismo actual.

## Límite general

Se aplica un `Rate Limit` global (todas las rutas bajo `/api/*`) definido en
`src/shared/middleware/general-rate-limit.ts`.

| Parámetro | Default | Configurable vía |
| --- | --- | --- |
| Ventana (`windowMs`) | 15 minutos (`900_000 ms`) | `RATE_LIMIT_WINDOW_MS` |
| Máximo de peticiones por ventana (`max`) | 300 | `RATE_LIMIT_MAX_REQUESTS` |

La clave del bucket es la IP del cliente (`req.ip`). Como la app monta
`app.set("trust proxy", 1)`, cuando se despliegue detrás de un proxy (p. ej.
nginx, Render, Railway) el valor de `req.ip` será la IP real del cliente.

### Respuesta al exceder el límite

```
HTTP 429
{
  "success": false,
  "message": "Too many requests, please try again later",
  "statusCode": 429,
  "code": "RATE_LIMITED",
  "requestId": "<uuid>"
}
```

Incluye el `requestId` (generado por `request-id.middleware.ts`) para poder
correlacionar el evento con los logs del servidor.

## Comportamiento por entorno

- **Development / Production**: el límite está activo.
- **Test**: se desactiva automáticamente (`isGeneralRateLimitEnabled` devuelve
  `false` para `NODE_ENV === "test"`) para no entorpecer los tests de integración.

## Limitaciones conocidas

1. **En memoria, por proceso**: el `Map` de buckets vive dentro del proceso de
   Node. Si la app corre con más de un worker o réplica, el contador es por
   instancia, no global. Para N réplicas, el límite efectivo es `N × max`.
   Opciones futuras si se escala horizontalmente: usar Redis (clave
   `rate-limit:<ip>` con `INCR`/`EXPIRE`) o el middleware `express-rate-limit`
   con store externo.
2. **Sin límite diferenciado por ruta**: hoy hay un único límite global. Los
   endpoints de autenticación (login/register) son los más expuestos a fuerza
   bruta; si se requiere, un siguiente paso es añadir un límite estricto solo
   para `/api/auth/login` (p. ej. 10 peticiones / 15 min por IP).
3. **Limpieza de buckets**: la purga de buckets expirados se hace con un
   `setInterval` de 60s (`.unref()`, no bloquea la salida del proceso).

## Cómo ajustar en producción

Editar el entorno (no el código):

```bash
RATE_LIMIT_WINDOW_MS=600000    # 10 minutos
RATE_LIMIT_MAX_REQUESTS=200    # 200 peticiones por ventana
```

> Regla práctica: ajusta `max` según el tráfico esperado por usuario/IP y
> monitoriza los `429` en los logs antes de subir el límite.
