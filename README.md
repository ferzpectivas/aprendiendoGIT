# CineStock

Sistema de gestión de préstamos de equipamiento audiovisual para la Escuela de Artes Audiovisuales "Lumière".

**Caso de estudio:** 8
**Equipo:** Grupo 4 "CineStock"

## Integrantes

1. CRUZ, Lisandro
2. LEGAL, Fernando Hernán
3. MARTÍNEZ, José
4. SIARES, Enzo Gonzalo
5. GODOY, Pablo
6. LAURO, Oriana Melina

## Pantallas

| Pantalla | Ruta | Rol | Descripción |
|---|---|---|---|
| Login | `/index.html` | Público | Autenticación por matrícula y contraseña |
| Alumno | `/pages/alumno.html` | Alumno | Catálogo, filtros, carrito y confirmación de reserva |
| Confirmación | `/pages/confirmacion.html` | Alumno | Remito digital de la reserva |
| Historial | `/pages/historial.html` | Alumno | Reservas activas, finalizadas, cancelación y notificaciones |
| Pañolero | `/pages/panolero.html` | Pañolero | Reservas, entregas, devoluciones, reparaciones, notificaciones e inventario |
| Director | `/pages/director.html` | Director | Estadísticas e informes, con el estado del inventario en una pestaña separada |

## Stack

- Backend: Node.js + Express
- Sesiones: `express-session` con cookie `connect.sid` (8 horas, `httpOnly`)
- Persistencia: archivos JSON en `backend/src/data/`
- Frontend: HTML, CSS y JavaScript vanilla (navegación multipágina)
- Tests: Jest + Supertest
- Despliegue: Render (servicio único)

## Estructura del repositorio

```text
.
├── backend/
│   ├── index.js              # Punto de entrada del servidor
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js            # Configuración de Express, sesión, estáticos y rutas
│   │   ├── data/             # Datos persistentes (users, gear, checkouts)
│   │   ├── middleware/       # requireAuth y requireRole
│   │   ├── routes/           # auth, gear, users, checkout, admin, director
│   │   ├── services/         # Reglas de negocio y acceso a datos
│   │   └── utils/            # fileStore, fechas e IDs
│   └── tests/
│       └── api.test.js
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── assets/
├── documentacion/
│   ├── anotaciones.md
│   ├── relevamiento/
│   ├── entregas/
│   └── diagramas/
├── render.yaml
└── README.md
```

El backend sirve el contenido de `frontend/` en el mismo origen que la API. De esta forma se mantienen las sesiones con cookies y no se necesita configurar CORS.

## Requisitos

- Node.js 18 o superior
- npm

## Instalación y ejecución local

```sh
cd backend
npm install
npm start
```

El servidor queda disponible en `http://localhost:3000`.

Modo desarrollo con reinicio automático:

```sh
cd backend
npm run dev
```

### Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y ajustar los valores si es necesario:

```sh
cp backend/.env.example backend/.env
```

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `SESSION_SECRET` | Secreto para firmar la sesión | Valor de desarrollo incluido en el código |
| `CINESTOCK_DATA_DIR` | Directorio alternativo de los JSON | `backend/src/data/` |

## Tests

```sh
cd backend
npm test
```

`backend/tests/api.test.js` cubre autenticación, permisos, catálogo, creación y cancelación de reservas, validaciones, panel del pañolero, notificaciones y dashboard del director.

## Sistema publicado

El repositorio incluye `render.yaml` para desplegar el sistema como un único servicio web en [Render](https://render.com/).

1. Crear un Blueprint o Web Service conectado al repositorio.
2. Render detecta `render.yaml` y usa `backend/` como directorio raíz.
3. Configurar `SESSION_SECRET` (Render puede generarlo automáticamente).
4. Una vez finalizado el deploy, acceder a la URL asignada:

```text
https://<nombre-del-servicio>.onrender.com
```

> Completar esta sección con la URL definitiva después del primer despliegue.

En el plan gratuito de Render el sistema de archivos es efímero: los cambios en `backend/src/data/*.json` pueden perderse al reiniciar o redeployar el servicio. Para persistencia real se puede configurar un disco persistente y definir `CINESTOCK_DATA_DIR`.

## Usuarios de prueba

| Rol | Matrícula | Contraseña |
|---|---|---|
| Alumno | `2025-1001` | `cine123` |
| Alumno | `2024-1002` | `cine123` |
| Alumno | `2023-1003` | `cine123` |
| Alumno | `2025-1004` | `cine123` |
| Pañolero | `ADMIN-001` | `panol2026` |
| Pañolero | `ADMIN-002` | `panol2026` |
| Director | `DIR-001` | `director2026` |
| Director | `DIR-002` | `director2026` |

## Documentación

- [Índice y anotaciones](./documentacion/anotaciones.md)
- [Relevamiento funcional](./documentacion/relevamiento/relevamiento-funcional.md)
- [Caso de estudio 8](./documentacion/relevamiento/caso-de-estudio-8.pdf)
- [Entrega parcial 1](./documentacion/entregas/entrega-1/grupo4-entrega-parcial-1.pdf)
- [Aportes individuales de la entrega 1](./documentacion/entregas/entrega-1/aportes/)
- [Prototipo de reserva](./documentacion/entregas/entrega-1/prototipo/reserva.html)

## Arquitectura

El frontend consume una API REST mediante `frontend/js/api.js`. Los datos de dominio se obtienen siempre del servidor; `localStorage` se usa únicamente para el carrito del alumno.

La persistencia se realiza en `backend/src/data/*.json` mediante `backend/src/utils/fileStore.js`, que mantiene caché en memoria y escrituras atómicas. Para tests o entornos temporales se puede definir `CINESTOCK_DATA_DIR`.

## API REST

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Estado del servidor |
| `POST` | `/api/auth/login` | Público | Iniciar sesión |
| `POST` | `/api/auth/logout` | Autenticado | Cerrar sesión |
| `GET` | `/api/auth/me` | Autenticado | Usuario actual |
| `GET` | `/api/gear` | Autenticado | Catálogo con filtros y fechas ocupadas |
| `GET` | `/api/gear/:id` | Autenticado | Detalle de un equipo |
| `GET` | `/api/users` | Pañolero / Director | Listado de usuarios |
| `GET` | `/api/users/:id` | Autenticado | Usuario propio o cualquiera para staff |
| `GET` | `/api/checkouts` | Autenticado | Reservas propias o todas para staff |
| `GET` | `/api/checkouts/:id` | Autenticado | Detalle de reserva |
| `POST` | `/api/checkouts` | Alumno | Crear reserva |
| `DELETE` | `/api/checkouts/:id` | Alumno | Cancelar reserva propia |
| `GET` | `/api/admin/checkouts` | Pañolero | Reservas, con filtros `desde` y `hasta` |
| `GET` | `/api/admin/checkouts/:id` | Pañolero | Detalle de reserva |
| `PUT` | `/api/admin/checkouts/:id/status` | Pañolero | Cambiar estado de la reserva |
| `POST` | `/api/admin/checkouts/:id/notify` | Pañolero | Enviar notificación al alumno |
| `GET` | `/api/admin/reportes/mora` | Pañolero / Director | Reporte de mora |
| `GET` | `/api/director/dashboard` | Director | Dashboard consolidado |
| `GET` | `/api/director/reportes` | Director | Reporte general |

### Filtros del catálogo

`GET /api/gear` acepta:

- `busqueda`: nombre, código de barras o categoría
- `categoria`: `camara`, `lente`, `tripode`, `iluminacion`, `audio`
- `gama`: `premium`, `standard`
- `estado`: `disponible`, `prestado`, `mantenimiento`, `baja`
- `disponible=true`: solo equipos disponibles

## Reglas de negocio

1. Máximo 5 equipos por reserva.
2. No se puede repetir un equipo en la misma reserva.
3. No se reservan equipos en estado `prestado`, `mantenimiento` o `baja`.
4. El alumno debe cumplir el `anioMinimo` requerido por el equipo.
5. No se permiten fechas superpuestas para el mismo equipo.
6. La fecha de retiro no puede ser anterior a hoy.
7. La fecha de devolución debe ser posterior a la fecha de retiro.
8. Solo se puede cancelar una reserva en estado `reservado` con al menos 24 horas de anticipación.
9. Al entregar una reserva, los equipos pasan a `prestado`.
10. Al devolver o cancelar, los equipos vuelven a `disponible` si no tienen otro préstamo activo.
11. Al enviar a reparación, los equipos pasan a `mantenimiento`.

## Estados de reserva

```text
reservado -> entregado -> devuelto_ok
                       -> devuelto_faltantes
                       -> reparacion
reservado -> cancelado
```

## Notas

- Los datos canónicos viven en `backend/src/data/`.
- El servidor bloquea el acceso a la API sin sesión, salvo login y health.
- Las respuestas de usuarios nunca incluyen el campo `password`.
