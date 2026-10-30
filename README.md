# CineStock

Sistema de gestion de prestamos de equipamiento audiovisual para la Escuela de Artes Audiovisuales "Lumiere".

**Caso de estudio:** 8  
**Equipo:** Grupo 4 "CineStock"

## Integrantes

1. CRUZ, Lisandro
2. LEGAL, Fernando Hernan
3. MARTINEZ, Jose
4. SIARES, Enzo Gonzalo
5. GODOY, Pablo
6. LAURO, Oriana Melina

## Pantallas

| Pantalla | Ruta | Rol | Descripcion |
|---|---|---|---|
| Login | `/index.html` | Publico | Autenticacion por matricula y contrasena |
| Alumno | `/pages/alumno.html` | Alumno | Catalogo, filtros, carrito y confirmacion de reserva |
| Confirmacion | `/pages/confirmacion.html` | Alumno | Remito digital de la reserva |
| Historial | `/pages/historial.html` | Alumno | Reservas activas, finalizadas, cancelacion y notificaciones |
| Panolero | `/pages/panolero.html` | Panolero | Reservas, entregas, devoluciones, reparaciones, notificaciones e inventario |
| Director | `/pages/director.html` | Director | Estadisticas, inventario, equipos mas demandados, fuera de servicio y mora |

## Stack

- Backend: Node.js + Express
- Sesiones: `express-session` con cookie `connect.sid` (8 horas, `httpOnly`)
- Persistencia: archivos JSON en `src/data/`
- Frontend: HTML, CSS y JavaScript vanilla (navegacion multipagina)
- Tests: Jest + Supertest

## Requisitos

- Node.js 18 o superior
- npm

## Instalacion y ejecucion

```sh
npm install
npm start
```

El servidor queda disponible en `http://localhost:3000`.

Modo desarrollo con reinicio automatico:

```sh
npm run dev
```

Tests:

```sh
npm test
```

## Usuarios de prueba

| Rol | Matricula | Contrasena |
|---|---|---|
| Alumno | `2025-1001` | `cine123` |
| Alumno | `2024-1002` | `cine123` |
| Alumno | `2023-1003` | `cine123` |
| Alumno | `2025-1004` | `cine123` |
| Panolero | `ADMIN-001` | `panol2026` |
| Panolero | `ADMIN-002` | `panol2026` |
| Director | `DIR-001` | `director2026` |
| Director | `DIR-002` | `director2026` |

## Estructura del proyecto

```text
.
├── server.js                 # Punto de entrada
├── src/
│   ├── app.js                # Configuracion de Express, sesion, estaticos y rutas
│   ├── data/                 # Datos persistentes (users, gear, checkouts)
│   ├── middleware/           # requireAuth y requireRole
│   ├── routes/               # auth, gear, users, checkout, admin, director
│   ├── services/             # Reglas de negocio y acceso a datos
│   └── utils/                # fileStore, fechas e IDs
├── public/                   # Frontend servido por Express
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── pages/
└── tests/
    └── api.test.js
```

## Arquitectura

El frontend consume una API REST mediante `public/js/api.js`. Los datos de dominio se obtienen siempre del servidor; `localStorage` se usa unicamente para el carrito del alumno.

La persistencia se realiza en `src/data/*.json` mediante `src/utils/fileStore.js`, que mantiene cache en memoria y escrituras atomicas. Para tests o entornos temporales se puede definir `CINESTOCK_DATA_DIR`.

## API REST

| Metodo | Ruta | Rol | Descripcion |
|---|---|---|---|
| `GET` | `/api/health` | Publico | Estado del servidor |
| `POST` | `/api/auth/login` | Publico | Iniciar sesion |
| `POST` | `/api/auth/logout` | Autenticado | Cerrar sesion |
| `GET` | `/api/auth/me` | Autenticado | Usuario actual |
| `GET` | `/api/gear` | Autenticado | Catalogo con filtros y fechas ocupadas |
| `GET` | `/api/gear/:id` | Autenticado | Detalle de un equipo |
| `GET` | `/api/users` | Panolero / Director | Listado de usuarios |
| `GET` | `/api/users/:id` | Autenticado | Usuario propio o cualquiera para staff |
| `GET` | `/api/checkouts` | Autenticado | Reservas propias o todas para staff |
| `GET` | `/api/checkouts/:id` | Autenticado | Detalle de reserva |
| `POST` | `/api/checkouts` | Alumno | Crear reserva |
| `DELETE` | `/api/checkouts/:id` | Alumno | Cancelar reserva propia |
| `GET` | `/api/admin/checkouts` | Panolero | Reservas, con filtros `desde` y `hasta` |
| `GET` | `/api/admin/checkouts/:id` | Panolero | Detalle de reserva |
| `PUT` | `/api/admin/checkouts/:id/status` | Panolero | Cambiar estado de la reserva |
| `POST` | `/api/admin/checkouts/:id/notify` | Panolero | Enviar notificacion al alumno |
| `GET` | `/api/admin/reportes/mora` | Panolero / Director | Reporte de mora |
| `GET` | `/api/director/dashboard` | Director | Dashboard consolidado |
| `GET` | `/api/director/reportes` | Director | Reporte general |

### Filtros del catalogo

`GET /api/gear` acepta:

- `busqueda`: nombre, codigo de barras o categoria
- `categoria`: `camara`, `lente`, `tripode`, `iluminacion`, `audio`
- `gama`: `premium`, `standard`
- `estado`: `disponible`, `prestado`, `mantenimiento`, `baja`
- `disponible=true`: solo equipos disponibles

## Reglas de negocio

1. Maximo 5 equipos por reserva.
2. No se puede repetir un equipo en la misma reserva.
3. No se reservan equipos en estado `prestado`, `mantenimiento` o `baja`.
4. El alumno debe cumplir el `anioMinimo` requerido por el equipo.
5. No se permiten fechas superpuestas para el mismo equipo.
6. La fecha de retiro no puede ser anterior a hoy.
7. La fecha de devolucion debe ser posterior a la fecha de retiro.
8. Solo se puede cancelar una reserva en estado `reservado` con al menos 24 horas de anticipacion.
9. Al entregar una reserva, los equipos pasan a `prestado`.
10. Al devolver o cancelar, los equipos vuelven a `disponible` si no tienen otro prestamo activo.
11. Al enviar a reparacion, los equipos pasan a `mantenimiento`.

## Estados de reserva

```text
reservado -> entregado -> devuelto_ok
                       -> devuelto_faltantes
                       -> reparacion
reservado -> cancelado
```

## Tests

`tests/api.test.js` cubre autenticacion, permisos, catalogo, creacion y cancelacion de reservas, validaciones, panel del panolero, notificaciones y dashboard del director.

```sh
npm test
```

## Notas

- No se debe volver a usar `public/data/datos.json`; los datos canonicos viven en `src/data/`.
- El servidor bloquea el acceso a la API sin sesion, salvo login y health.
- Las respuestas de usuarios nunca incluyen el campo `password`.
