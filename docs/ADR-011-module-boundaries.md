# ADR: Límites de datos y arquitectura transversal de estadísticas

- **Estado**: Aceptado
- **Fecha**: Fase 11.1
- **Decisión durante**: Revisión de arquitectura · Production Readiness Audit

## Contexto

El backend es un repositorio único con arquitectura basada en features: cada
módulo vive bajo `src/modules/<feature>/`. A medida que crece, se quiere evitar
el acoplamiento entre módulos: que un módulo importe modelos, servicios o rutas
de otro y genere dependencias circulares.

Por otro lado, el dashboard necesita métricas transversales (ingresos por
pedidos, ticket promedio, productos top, histórico de inventario), que por
definición cruzan datos de Orders, Products, Inventory y Users.

## Decisión

1. **Cada módulo es autocontenido, salvo dependencias permitidas.** Un módulo
   puede importar:
   - `src/shared/**` (middleware, logger, plugins, envelopes).
   - `src/config/**` y `src/types/**`.
   - **No** componentes (rutas, servicios, controladores) de otros módulos de
     negocio, ni sus modelos salvo por la vía del punto 2.

2. **`stats` es transversal y de solo lectura.** El módulo
   `src/modules/stats/` puede **leer** los modelos de datos de otros módulos
   (Orders, Products, Inventory, Users) únicamente para **agregar** métricas.
   Reglas de obligado cumplimiento:
   - **No** escribe ni muta estado de otros módulos (no `save`, `update`,
     `delete` ni `findOneAndUpdate`).
   - **No** reutiliza la lógica de negocio de otros módulos (servicios);
     solo los modelos y consultas de agregación.
   - **No** genera ciclos: `stats` depende de los modelos de sus dominio, pero
     ningún otro módulo depende de `stats`.

3. **El dashboard consume únicamente la API de `/api/admin/stats`.** Ni el
   frontend ni otros módulos agregan métricas contra los endpoints de negocio,
   para no duplicar consultas ni abrir innecesariamente el catálogo del backend.

## Opciones consideradas

| Opción | Valoración |
| --- | --- |
| Hermetismo total (stats con esquema propio) | Imposible sin los datos reales; duplicaría consistencia y esfuerzo. |
| Réplica de datos en una colección de analítica | Complejo de sincronizar; no aporta valor ahora. |
| Lectura transversal acotada (elegida) | Mínimo acoplamiento (solo modelos agregando), sin escrituras ni lógica de negocio reutilizada. |

## Consecuencias

- Las estadísticas son tan actuales como los datos fuente (tiempo real, sin ETL).
- Un cambio de esquema en un modelo de negocio repercute en los agregadores de
  `stats`; se mitiga centralizando esas consultas y revisándolas al migrar
  esquemas.
- Cada feature sigue evolucionando de forma aislada, salvo el contrato de
  modelos que consume `stats`.

## Alcance de esta revisión

- Se documenta el ADR y se valida el patrón transversal de `stats`.
- **No se refactoriza `stats` ahora**: su lectura transversal y sus
  agregaciones de solo lectura cumplen la regla. Se refactorizará únicamente
  si se detectase un caso concreto de escritura cruzada o dependencia circular
  (sin casos detectados en esta revisión).