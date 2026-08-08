# ADR: Política de versionado de API

- **Estado**: Aceptado
- **Fecha**: F0.0
- **Decisión durante**: Integración real de ecommerce · Plan maestro (F0)

## Contexto

El pedido original contemplaba endpoints versionados (`GET /api/v1/products`).
El backend actual monta las rutas directamente en `/api/*` y tres consumidores
(Dashboard, Angular Store, Next.js) dependen de esa convención. Introducir
`/api/v1` ahora exigiría renombrar los 16 módulos y actualizar los tres
consumidores de forma coordinada, sin un beneficio inmediato (aún no hay
contratos legacy que preservar).

## Decisión

1. **Se mantiene `/api` sin versionado por ahora.**
2. El contrato vive en `docs/API-CONTRACT.md` como documento de referencia.
3. Se introducirá un prefijo versionado (`/api/v1`) **solo si se produce un
   cambio de contrato rompedor** y exista al menos un consumidor que necesite
   convivencia de versiones.

## Opciones consideradas

| Opción | Valoración |
| --- | --- |
| Versionado desde ya (`/api/v1/*`) | Coste de migración coordinada en 3 consumidores sin beneficio inmediato; riesgo de tocar todo el backend sin necesidad. |
| **Mantener `/api` (elegido)** | Cero riesgo; el contrato se documenta y la evolución futura queda cubierta por el ADR. |

## Consecuencias

- Cualquier cambio futuro que rompa el contrato debe activar la evaluación de
  versionado antes de desplegar.
- La documentación (`API-CONTRACT.md`) es la fuente de verdad del contrato
  vigente.
