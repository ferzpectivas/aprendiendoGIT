# Relevamiento funcional del sistema — CineStock

**Proyecto:** CineStock — Sistema de préstamo audiovisual  
**Institución:** Escuela de Artes Audiovisuales "Lumière"  
**Caso de estudio:** 8  
**Stack:** Node.js + Express, sesiones con `express-session`, frontend HTML/CSS/JavaScript vanilla y persistencia en archivos JSON (`backend/src/data/gear.json`, `backend/src/data/checkouts.json`, `backend/src/data/users.json`).

---

## 1. Identificación de roles

El sistema contempla tres roles de negocio. Todos deben autenticarse con matrícula y contraseña antes de acceder a las funcionalidades protegidas.

| Rol          | Quién es                                                  | Responsabilidad principal                                                                                                                                                                                     | Credenciales de ejemplo    |
| :----------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------- |
| **Alumno**   | Estudiante de la escuela (carreras de cine o fotografía). | Autogestionar sus reservas de equipamiento: consultar el catálogo, armar el carrito, confirmar reservas, obtener el remito, consultar su historial y cancelar reservas con anticipación.                      | `2025-1001` / `cine123`    |
| **Pañolero** | Administrador del depósito o "pañol".                     | Gestionar las reservas entrantes, entregar equipos, registrar devoluciones (en condiciones o con faltantes), enviar equipos a reparación, notificar al alumno y consultar el estado del inventario y la mora. | `ADMIN-001` / `panol2026`  |
| **Director** | Director de la carrera.                                   | Controlar la ocupación y el estado del inventario, analizar la demanda de equipos, detectar equipos fuera de servicio y generar informes y reportes de mora.                                                  | `DIR-001` / `director2026` |

Además, existe un **visitante no autenticado**, que no es un rol de negocio: solo puede acceder a la pantalla de login y al endpoint de estado del servidor. Cualquier otra operación requiere sesión iniciada.

**Ejemplos concretos del proyecto:**

- `backend/src/data/users.json` contiene cuatro alumnos (`u-001` a `u-004`), dos pañoleros (`u-005`, `u-006`) y dos directores (`u-007`, `u-008`).
- El rol se guarda en el campo `rol` de cada usuario y se usa en `backend/src/middleware/roles.js` para autorizar o rechazar operaciones.
- La sesión se crea en `POST /api/auth/login` y se conserva en la cookie `connect.sid` durante 8 horas.

---

## 2. Casos de uso

### 2.1. Alumno

|   ID   | Caso de uso                    | Objetivo                                                            | Resultado esperado                                                                                     |
| :----: | :----------------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| CU-A1  | Iniciar sesión                 | Validar la identidad del alumno y abrir una sesión.                 | El sistema devuelve el usuario sin contraseña y redirige al catálogo.                                  |
| CU-A2  | Consultar el catálogo          | Conocer los equipos disponibles y su estado actual.                 | Se muestran las tarjetas de equipos con nombre, código, gama, estado y año mínimo.                     |
| CU-A3  | Buscar y filtrar equipos       | Encontrar un equipo por nombre, código de barras o categoría.       | El catálogo se actualiza según el texto, la categoría o la disponibilidad elegida.                     |
| CU-A4  | Agregar equipos al carrito     | Preparar una solicitud de préstamo.                                 | El equipo se suma al carrito si cumple las reglas (máximo 5, sin duplicados, estado y año mínimo).     |
| CU-A5  | Quitar equipos del carrito     | Corregir o reducir la solicitud antes de confirmar.                 | El equipo se elimina del carrito y el contador se actualiza.                                           |
| CU-A6  | Confirmar una reserva          | Asegurar equipos para un rango de fechas de retiro y devolución.    | Se crea una reserva en estado `reservado` y se muestra el remito digital.                              |
| CU-A7  | Consultar el remito digital    | Obtener el comprobante de la reserva con el detalle de los equipos. | Se muestra el remito con número de reserva, alumno, matrícula, fechas y equipos.                       |
| CU-A8  | Descargar o imprimir el remito | Conservar una copia del comprobante.                                | Se abre el diálogo de impresión del navegador con el remito formateado.                                |
| CU-A9  | Consultar el historial         | Ver reservas activas y finalizadas.                                 | Se listan las reservas del alumno separadas en activas y finalizadas, con su estado.                   |
| CU-A10 | Cancelar una reserva           | Liberar los equipos si el rodaje se suspende.                       | La reserva pasa a `cancelado` si está en estado `reservado` y faltan al menos 24 horas para el retiro. |
| CU-A11 | Ver notificaciones             | Enterarse de faltantes o mensajes del pañolero.                     | Las notificaciones aparecen destacadas en la tarjeta de la reserva dentro del historial.               |

### 2.2. Pañolero

|   ID   | Caso de uso                             | Objetivo                                                                   | Resultado esperado                                                                                      |
| :----: | :-------------------------------------- | :------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| CU-P1  | Iniciar sesión                          | Acceder al panel de administración del depósito.                           | Se abre el panel del pañolero con las pestañas de reservas, faltantes e inventario.                     |
| CU-P2  | Ver las reservas entrantes              | Organizar las entregas del día.                                            | Se muestra una tabla con todas las reservas, el alumno, los equipos y las fechas.                       |
| CU-P3  | Filtrar reservas por estado             | Concentrarse en las reservas pendientes, entregadas o devueltas.           | La tabla muestra únicamente las reservas del estado seleccionado.                                       |
| CU-P4  | Entregar una reserva                    | Registrar que el alumno retiró los equipos.                                | La reserva pasa de `reservado` a `entregado` y los equipos pasan a `prestado`.                          |
| CU-P5  | Registrar una devolución en condiciones | Confirmar que todos los equipos volvieron en orden.                        | La reserva pasa a `devuelto_ok` y los equipos vuelven a `disponible` si no tienen otro préstamo activo. |
| CU-P6  | Registrar una devolución con faltantes  | Dejar constancia de piezas o accesorios faltantes.                         | La reserva pasa a `devuelto_faltantes` con una observación y queda listada en la pestaña "Faltantes".   |
| CU-P7  | Enviar equipos a reparación             | Sacar de circulación equipos dañados.                                      | La reserva pasa a `reparacion` y los equipos quedan en estado `mantenimiento`.                          |
| CU-P8  | Enviar una notificación al alumno       | Avisar por el sistema que debe devolver un elemento olvidado.              | El mensaje se agrega a la reserva y el alumno lo ve en su historial.                                    |
| CU-P9  | Consultar faltantes                     | Hacer seguimiento de devoluciones incompletas.                             | Se listan las reservas con estado `devuelto_faltantes` y su observación.                                |
| CU-P10 | Consultar el estado del inventario      | Conocer el estado técnico de cada cámara, lente, trípode, luz o micrófono. | Se muestra una tabla unificada con código, nombre, categoría, gama y estado de cada equipo.             |
| CU-P11 | Consultar el reporte de mora            | Detectar equipos no devueltos a tiempo.                                    | Se obtiene una lista de reservas vencidas con días de atraso, alumno y equipos.                         |

### 2.3. Director

|  ID   | Caso de uso                                     | Objetivo                                                                                | Resultado esperado                                                                                    |
| :---: | :---------------------------------------------- | :-------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------- |
| CU-D1 | Iniciar sesión                                  | Acceder al tablero de control de la carrera.                                            | Se abre el dashboard del director.                                                                    |
| CU-D2 | Ver el dashboard consolidado                    | Tener una visión general del sistema en una sola pantalla.                              | Se muestran estadísticas de inventario, reservas activas, mora y demanda.                             |
| CU-D3 | Ver el resumen del inventario                   | Conocer cuántos equipos están disponibles, prestados, en mantenimiento o dados de baja. | Se muestran tarjetas con los totales por estado.                                                      |
| CU-D4 | Ver los equipos más demandados                  | Identificar qué cámaras, lentes o equipos se solicitan más.                             | Se lista el top de equipos con la cantidad de veces reservados.                                       |
| CU-D5 | Ver los equipos fuera de servicio               | Detectar equipos rotos o dados de baja.                                                 | Se lista cada equipo en estado `mantenimiento` o `baja` con su categoría.                             |
| CU-D6 | Ver las reservas vencidas                       | Controlar la mora de la administración.                                                 | Se muestra el reporte de reservas con fecha de devolución vencida.                                    |
| CU-D7 | Descargar informes                              | Obtener documentos imprimibles para la gestión académica.                               | Se genera un PDF con el informe de equipos demandados, equipos fuera de servicio o reservas vencidas. |
| CU-D8 | Ver el inventario general con demanda histórica | Analizar el uso de cada equipo a lo largo del tiempo.                                   | Se muestra la tabla completa del inventario con el estado actual y las veces que fue reservado.       |

---

## 3. Relación con las pantallas

### 3.1. Resumen de pantallas

| Pantalla              | Ruta                       | Rol      | Propósito                                                                    |
| :-------------------- | :------------------------- | :------- | :--------------------------------------------------------------------------- |
| Login                 | `/index.html`              | Público  | Autenticación por matrícula y contraseña.                                    |
| Panel del alumno      | `/pages/alumno.html`       | Alumno   | Catálogo, filtros, carrito y confirmación de reserva.                        |
| Confirmación / remito | `/pages/confirmacion.html` | Alumno   | Remito digital de la reserva recién creada.                                  |
| Historial             | `/pages/historial.html`    | Alumno   | Reservas activas, finalizadas, cancelación y notificaciones.                 |
| Panel del pañolero    | `/pages/panolero.html`     | Pañolero | Reservas, entregas, devoluciones, reparaciones, notificaciones e inventario. |
| Tablero del director  | `/pages/director.html`     | Director | Estadísticas, informes, equipos fuera de servicio y mora.                    |

### 3.2. Mapa de acciones, pantallas y elementos de interfaz

#### Alumno

| Caso de uso               | Pantalla                                             | Elementos de interfaz                                                                                                                        |
| :------------------------ | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| CU-A1 Iniciar sesión      | `/index.html`                                        | Formulario `#login-form`, campos `#usuario` y `#password`, botón "Ingresar" y bloque de error `#login-error`.                                |
| CU-A2 Consultar catálogo  | `/pages/alumno.html`                                 | Contenedor `#catalogo-equipos`, tarjetas `.card-equipo`, badges de gama y estado.                                                            |
| CU-A3 Buscar y filtrar    | `/pages/alumno.html`                                 | Input `#filtro-busqueda`, select `#filtro-categoria` y select `#filtro-disponible`.                                                          |
| CU-A4 Agregar al carrito  | `/pages/alumno.html`                                 | Botón "+ Agregar al Carrito" de cada tarjeta, lista `#cart-list` y contador `#cart-count`.                                                   |
| CU-A5 Quitar del carrito  | `/pages/alumno.html`                                 | Botón "Quitar del Carrito" de la tarjeta y botón "X" de cada ítem del carrito.                                                               |
| CU-A6 Confirmar reserva   | `/pages/alumno.html`                                 | Formulario `#reserva-form`, campos `#fecha-retiro` y `#fecha-devolucion`, botón "Aceptar Reserva" y modal de confirmación de `UI.confirmar`. |
| CU-A7 Consultar remito    | `/pages/confirmacion.html`                           | Contenedor `#confirmacion-contenido`, sección `.remito` generada por `Remito.construirHTML`.                                                 |
| CU-A8 Descargar remito    | `/pages/confirmacion.html` y `/pages/historial.html` | Botón "Descargar PDF" y botón "Ver remito" del historial, que usan `Remito.imprimir` e `Impresion.imprimirDocumento`.                        |
| CU-A9 Consultar historial | `/pages/historial.html`                              | Contenedor `#historial-contenido`, secciones "Reservas Activas" y "Reservas Finalizadas", tarjetas `.reserva-card` y badges de estado.       |
| CU-A10 Cancelar reserva   | `/pages/historial.html`                              | Botón "Cancelar Reserva" de cada reserva en estado `reservado`, con confirmación mediante `UI.confirmar`.                                    |
| CU-A11 Ver notificaciones | `/pages/historial.html`                              | Bloque destacado "Notificaciones" dentro de la tarjeta de la reserva, generado a partir del campo `notificaciones`.                          |

#### Pañolero

| Caso de uso                              | Pantalla                                                                                                  | Elementos de interfaz                                                                                        |
| :--------------------------------------- | :-------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| CU-P1 Iniciar sesión                     | `/index.html`                                                                                             | Formulario `#login-form` con matrícula y contraseña.                                                         |
| CU-P2 Ver reservas entrantes             | `/pages/panolero.html`                                                                                    | Pestaña "Reservas", tabla `#reservas-tabla` con ID, alumno, equipos, fechas, estado y acciones.              |
| CU-P3 Filtrar por estado                 | `/pages/panolero.html`                                                                                    | Select `#filtro-estado` con las opciones de todos los estados.                                               |
| CU-P4 Entregar reserva                   | `/pages/panolero.html`                                                                                    | Botón "Entregar" de las reservas en estado `reservado`, con modal de confirmación.                           |
| CU-P5 Registrar devolución OK            | `/pages/panolero.html`                                                                                    | Botón "Dev. OK" de las reservas en estado `entregado`.                                                       |
| CU-P6 Registrar devolución con faltantes | `/pages/panolero.html`                                                                                    | Botón "Dev. Faltantes", modal `#modal-notas` y campo `#modal-notas-texto` para la observación.               |
| CU-P7 Enviar a reparación                | `/pages/panolero.html`                                                                                    | Botón "A reparación" de las reservas en estado `entregado`, con confirmación.                                |
| CU-P8 Enviar notificación                | `/pages/panolero.html`                                                                                    | Botón "Notificar", modal `#modal-notificacion` y campo `#modal-notificacion-texto`.                          |
| CU-P9 Consultar faltantes                | `/pages/panolero.html`                                                                                    | Pestaña "Faltantes" y tabla `#faltantes-tabla` con la observación visible mediante tooltip.                  |
| CU-P10 Consultar inventario              | `/pages/panolero.html`                                                                                    | Pestaña "Estado del Inventario" y tabla `#inventario-panolero` con código, nombre, categoría, gama y estado. |
| CU-P11 Consultar mora                    | *No tiene pantalla propia en el panel del pañolero; se consume por API (`GET /api/admin/reportes/mora`).* | Endpoint accesible para pañolero y director.                                                                 |

#### Director

| Caso de uso                         | Pantalla               | Elementos de interfaz                                                                                                         |
| :---------------------------------- | :--------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| CU-D1 Iniciar sesión                | `/index.html`          | Formulario `#login-form` con matrícula y contraseña.                                                                          |
| CU-D2 Ver dashboard                 | `/pages/director.html` | Pestañas "Informes" y "Estado del Inventario", tarjetas de estadísticas y tablas de reportes.                                 |
| CU-D3 Ver resumen del inventario    | `/pages/director.html` | Pestaña "Estado del Inventario", contenedor `#stats-inventario` con tarjetas de disponibles, prestados, mantenimiento y baja. |
| CU-D4 Ver equipos más demandados    | `/pages/director.html` | Tabla `#demandados-tabla` y selector de reporte `#reporte-select` con la opción "Equipos Más Demandados".                     |
| CU-D5 Ver equipos fuera de servicio | `/pages/director.html` | Tabla `#fuera-servicio-tabla` y opción "Equipos Fuera de Servicio" del selector de reportes.                                  |
| CU-D6 Ver reservas vencidas         | `/pages/director.html` | Bloque `#reporte-mora` y contenedor `#mora-contenido`.                                                                        |
| CU-D7 Descargar informes            | `/pages/director.html` | Botón `#btn-descargar-reporte` y selector `#reporte-select`; genera el PDF con `Impresion.imprimirDocumento`.                 |
| CU-D8 Ver inventario general        | `/pages/director.html` | Pestaña "Estado del Inventario", tabla `#inventario-tabla` con estado y cantidad de reservas históricas.                      |

---

## 4. Requerimientos para el backend

El frontend no accede directamente a los archivos JSON: toda la lógica de negocio y la persistencia pasan por una API REST implementada con Express. Los endpoints actuales viven en `backend/src/routes/` y se montan en `backend/src/app.js`.

### 4.1. Códigos de respuesta utilizados

| Código                      | Significado                                    |
| :-------------------------- | :--------------------------------------------- |
| `200 OK`                    | Operación exitosa.                             |
| `201 Created`               | Reserva creada correctamente.                  |
| `400 Bad Request`           | Datos inválidos o regla de negocio incumplida. |
| `401 Unauthorized`          | No hay sesión iniciada.                        |
| `403 Forbidden`             | El rol autenticado no tiene permisos.          |
| `404 Not Found`             | Recurso inexistente o endpoint desconocido.    |
| `500 Internal Server Error` | Error interno del servidor.                    |

### 4.2. Endpoints de autenticación y estado

| Método | Ruta               | Rol         | Operación                                                | Datos necesarios                                             |
| :----: | :----------------- | :---------- | :------------------------------------------------------- | :----------------------------------------------------------- |
| `GET`  | `/api/health`      | Público     | Consulta el estado del servidor.                         | Ninguno.                                                     |
| `POST` | `/api/auth/login`  | Público     | Valida matrícula y contraseña, y crea la sesión.         | Body: `{ "matricula": "2025-1001", "password": "cine123" }`. |
| `POST` | `/api/auth/logout` | Autenticado | Destruye la sesión y limpia la cookie.                   | Ninguno.                                                     |
| `GET`  | `/api/auth/me`     | Autenticado | Devuelve el usuario de la sesión actual, sin contraseña. | Ninguno.                                                     |

### 4.3. Endpoints de equipamiento

| Método | Ruta            | Rol         | Operación                                        | Datos necesarios                                                              |
| :----: | :-------------- | :---------- | :----------------------------------------------- | :---------------------------------------------------------------------------- |
| `GET`  | `/api/gear`     | Autenticado | Lista el catálogo con filtros y fechas ocupadas. | Query opcional: `busqueda`, `categoria`, `gama`, `estado`, `disponible=true`. |
| `GET`  | `/api/gear/:id` | Autenticado | Devuelve el detalle de un equipo.                | Parámetro de ruta: `id` (por ejemplo `g-001`).                                |

**Filtros del catálogo:**

- `busqueda`: nombre, código de barras o categoría.
- `categoria`: `camara`, `lente`, `tripode`, `iluminacion` o `audio`.
- `gama`: `premium` o `standard`.
- `estado`: `disponible`, `prestado`, `mantenimiento` o `baja`.
- `disponible=true`: solo equipos en estado `disponible`.

Cada equipo devuelto incluye el campo `ocupiedDates` con los rangos de fechas ya reservados.

### 4.4. Endpoints de usuarios

| Método | Ruta             | Rol                 | Operación                                                        | Datos necesarios                               |
| :----: | :--------------- | :------------------ | :--------------------------------------------------------------- | :--------------------------------------------- |
| `GET`  | `/api/users`     | Pañolero / Director | Lista todos los usuarios sin contraseña.                         | Ninguno.                                       |
| `GET`  | `/api/users/:id` | Autenticado         | Devuelve un usuario propio; el staff puede consultar cualquiera. | Parámetro de ruta: `id` (por ejemplo `u-001`). |

### 4.5. Endpoints de reservas del alumno

|  Método  | Ruta                 | Rol         | Operación                                                                 | Datos necesarios                                                                                       |
| :------: | :------------------- | :---------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
|  `GET`   | `/api/checkouts`     | Autenticado | Lista las reservas: el alumno ve solo las propias; el staff ve todas.     | Ninguno.                                                                                               |
|  `GET`   | `/api/checkouts/:id` | Autenticado | Devuelve el detalle de una reserva; el alumno solo puede ver las propias. | Parámetro de ruta: `id` (por ejemplo `co-001`).                                                        |
|  `POST`  | `/api/checkouts`     | Alumno      | Crea una nueva reserva y la deja en estado `reservado`.                   | Body: `{ "items": ["g-005", "g-007"], "fechaRetiro": "2026-11-20", "fechaDevolucion": "2026-11-22" }`. |
| `DELETE` | `/api/checkouts/:id` | Alumno      | Cancela una reserva propia.                                               | Parámetro de ruta: `id`.                                                                               |

### 4.6. Endpoints del pañolero

| Método | Ruta                              | Rol                 | Operación                                                   | Datos necesarios                                          |
| :----: | :-------------------------------- | :------------------ | :---------------------------------------------------------- | :-------------------------------------------------------- |
| `GET`  | `/api/admin/checkouts`            | Pañolero            | Lista todas las reservas, con filtros por rango de fechas.  | Query opcional: `desde`, `hasta` en formato `YYYY-MM-DD`. |
| `GET`  | `/api/admin/checkouts/:id`        | Pañolero            | Devuelve el detalle de una reserva.                         | Parámetro de ruta: `id`.                                  |
| `PUT`  | `/api/admin/checkouts/:id/status` | Pañolero            | Cambia el estado de una reserva y sincroniza el inventario. | Body: `{ "estado": "entregado", "notas": "opcional" }`.   |
| `POST` | `/api/admin/checkouts/:id/notify` | Pañolero            | Agrega una notificación visible para el alumno.             | Body: `{ "mensaje": "Falta devolver el cable HDMI." }`.   |
| `GET`  | `/api/admin/reportes/mora`        | Pañolero / Director | Devuelve las reservas vencidas y los días de atraso.        | Ninguno.                                                  |

**Estados válidos para `PUT /api/admin/checkouts/:id/status`:** `entregado`, `devuelto_ok`, `devuelto_faltantes`, `reparacion` y `cancelado`. Las transiciones permitidas se explican en la sección 5.

### 4.7. Endpoints del director

| Método | Ruta                      | Rol      | Operación                                                                                               | Datos necesarios |
| :----: | :------------------------ | :------- | :------------------------------------------------------------------------------------------------------ | :--------------- |
| `GET`  | `/api/director/dashboard` | Director | Devuelve el dashboard consolidado: estadísticas, demanda, mora, categorías y equipos fuera de servicio. | Ninguno.         |
| `GET`  | `/api/director/reportes`  | Director | Devuelve el reporte general con totales de reservas y equipos.                                          | Ninguno.         |

### 4.8. Resumen de la comunicación

```text
Frontend (HTML/CSS/JS)
        │  fetch con credenciales de sesión
        ▼
API REST (Express)
        │  validaciones y reglas de negocio
        ▼
Servicios (backend/src/services/)
        │  lectura y escritura
        ▼
Archivos JSON (backend/src/data/)
```

La sesión se transporta mediante la cookie `connect.sid`, configurada como `httpOnly`, `sameSite: lax` y con una duración de 8 horas.

---

## 5. Reglas de negocio

A continuación se detallan las reglas implementadas en el sistema, con la condición que deben cumplir, el resultado esperado y un ejemplo concreto del proyecto.

### R1. Máximo de 5 equipos por reserva

- **Condición:** el carrito debe contener entre 1 y 5 equipos.
- **Si se cumple:** la reserva puede continuar con las demás validaciones.
- **Si no se cumple:** el backend responde `400` con el mensaje `"Maximo 5 equipos por reserva."` o `"Debe seleccionar al menos un equipo."`.
- **Ejemplo:** una solicitud con `g-001`, `g-004`, `g-005`, `g-006`, `g-007` y `g-010` (6 ítems) es rechazada. El test `rechaza mas de 5 equipos` de `tests/api.test.js` lo verifica.

### R2. No se puede repetir un equipo en la misma reserva

- **Condición:** todos los IDs del array `items` deben ser distintos.
- **Si se cumple:** la reserva continúa.
- **Si no se cumple:** el backend responde `400` con `"No se puede repetir un equipo en la misma reserva."`.
- **Ejemplo:** `items: ["g-005", "g-005"]` es rechazado.

### R3. Solo se reservan equipos en estado disponible

- **Condición:** el equipo no debe estar en estado `baja`, `mantenimiento` ni `prestado`.
- **Si se cumple:** el equipo puede agregarse a la reserva.
- **Si no se cumple:** se devuelve un error específico:
  - `baja`: `"El equipo ... esta dado de baja."`
  - `mantenimiento`: `"El equipo ... esta en mantenimiento."`
  - `prestado`: `"El equipo ... ya esta prestado actualmente."`
- **Ejemplo:** `g-003` (Blackmagic Pocket 4K) está en `mantenimiento` y no puede reservarse. `g-008` (Lente Sony 24-70) está en `prestado` y tampoco.

### R4. Año mínimo del alumno

- **Condición:** el año del alumno (`user.anio`) debe ser mayor o igual al `anioMinimo` del equipo.
- **Si se cumple:** el alumno puede reservar el equipo.
- **Si no se cumple:** el backend responde `400` indicando que el equipo requiere ser alumno de ese año o superior. Si el equipo es de gama `premium`, el mensaje lo aclara.
- **Ejemplo:** `g-002` (Sony Alpha A7 III) es `premium` y requiere `anioMinimo: 3`. El alumno `2025-1001` (Juan Pérez, 2.º año) no puede reservarlo; `2024-1002` (María García, 3.º año) sí puede. `g-005` (Sony A6400) requiere 1.º año, por lo que `2025-1004` (Ana Martínez, 1.º año) sí puede reservarlo.

### R5. No se permiten fechas superpuestas para el mismo equipo

- **Condición:** el rango `[fechaRetiro, fechaDevolucion]` no debe superponerse con otra reserva activa (`reservado` o `entregado`) que incluya el mismo equipo.
- **Si se cumple:** la reserva se crea.
- **Si no se cumple:** el backend responde `400` con `"El equipo ya esta reservado para las fechas seleccionadas."`.
- **Ejemplo:** si `g-005` ya está reservado del `2026-09-10` al `2026-09-12`, una nueva reserva del `2026-09-11` al `2026-09-13` es rechazada. La comparación se hace con `overlaps(startA, endA, startB, endB)` en `backend/src/utils/dateUtils.js`.

### R6. Fechas válidas

- **Condición:** la fecha de retiro no puede ser anterior a hoy y la fecha de devolución debe ser posterior a la de retiro.
- **Si se cumple:** la reserva continúa.
- **Si no se cumple:** el backend responde `400` con:
  - `"La fecha de retiro no puede ser anterior a hoy."`
  - `"La fecha de devolucion debe ser posterior a la de retiro."`
- **Ejemplo:** una reserva con retiro el `2026-09-10` y devolución el `2026-09-10` es rechazada; con devolución el `2026-09-12` es aceptada.

### R7. Cancelación con anticipación

- **Condición:** solo se puede cancelar una reserva propia en estado `reservado` y con al menos 24 horas de anticipación respecto de la fecha de retiro.
- **Si se cumple:** la reserva pasa a `cancelado`.
- **Si no se cumple:** el backend responde `400` con:
  - `"Solo se pueden cancelar reservas en estado 'reservado'."`
  - `"Solo se puede cancelar con al menos 24 horas de anticipacion."`
  - `"No puede cancelar una reserva que no le pertenece."`
- **Ejemplo:** el test `permite cancelar una reserva con mas de 24 horas` crea una reserva con retiro a 40 días y la cancela correctamente; el test `no permite cancelar una reserva con menos de 24 horas` usa un retiro para hoy y recibe `400`.

### R8. Transiciones de estado y sincronización del inventario

- **Condición:** solo se permiten las transiciones definidas en `TRANSITIONS` (`backend/src/services/checkoutService.js`):

```text
reservado → entregado
reservado → cancelado
entregado → devuelto_ok
entregado → devuelto_faltantes
entregado → reparacion
```

- **Si se cumple:** se actualiza la reserva y se sincroniza el estado de los equipos:
  - `entregado`: los equipos pasan a `prestado`.
  - `reparacion`: los equipos pasan a `mantenimiento`.
  - `devuelto_ok`, `devuelto_faltantes` o `cancelado`: los equipos vuelven a `disponible` si no tienen otro préstamo activo y no están en `baja` o `mantenimiento`.
- **Si no se cumple:** el backend responde `400` con `"No se puede cambiar de ... a ..."`.
- **Ejemplo:** una reserva `reservado` puede pasar a `entregado`, pero no directamente a `devuelto_ok`. El test `entrega y devuelve una reserva actualizando el inventario` verifica que `g-011` pase a `prestado` al entregar y vuelva a `disponible` al devolver.

### R9. Control de acceso por rol

- **Condición:** cada endpoint protegido exige una sesión válida y, cuando corresponde, un rol específico.
- **Si se cumple:** la operación se ejecuta.
- **Si no se cumple:** el backend responde `401` si no hay sesión o `403` si el rol no tiene permisos.
- **Ejemplo:** un alumno no puede listar usuarios (`GET /api/users`) ni acceder al panel de administración (`GET /api/admin/checkouts`); ambos casos devuelven `403`. Sin sesión, `GET /api/gear` devuelve `401`.

### R10. La contraseña nunca se devuelve al cliente

- **Condición:** todas las respuestas que incluyen usuarios deben pasar por `userService.sanitize`.
- **Si se cumple:** el objeto devuelto conserva `id`, `matricula`, `nombre`, `rol`, `anio` y `carrera`, pero no `password`.
- **Si no se cumple:** sería una fuga de información; el test `devuelve el usuario autenticado sin password` verifica que `response.body.user.password` sea `undefined`.

### R11. La API exige sesión salvo login y health

- **Condición:** todos los routers de negocio usan `requireAuth`; solo `/api/health` y `/api/auth/login` son públicos.
- **Si se cumple:** el usuario autenticado accede a los recursos permitidos.
- **Si no se cumple:** el backend responde `401` con `"No autenticado. Inicie sesion primero."`.
- **Ejemplo:** el test `requiere sesion` comprueba que `GET /api/gear` sin sesión devuelva `401`.

---

## Anexo: trazabilidad con el código del proyecto

| Componente              | Archivo                                                     | Función en el relevamiento                                                      |
| :---------------------- | :---------------------------------------------------------- | :------------------------------------------------------------------------------ |
| Punto de entrada        | `backend/index.js`                                                 | Inicia el servidor Express en el puerto 3000.                                   |
| Configuración de la app | `backend/src/app.js`                                                | Sesión, estáticos, montaje de rutas y manejo de errores.                        |
| Autenticación           | `backend/src/routes/auth.js`                                        | Login, logout y usuario actual.                                                 |
| Catálogo                | `backend/src/routes/gear.js`, `backend/src/services/gearService.js`         | Consulta, filtros y fechas ocupadas.                                            |
| Usuarios                | `backend/src/routes/users.js`, `backend/src/services/userService.js`        | Listado, consulta y sanitización.                                               |
| Reservas                | `backend/src/routes/checkout.js`, `backend/src/services/checkoutService.js` | Creación, consulta y cancelación.                                               |
| Panel del pañolero      | `backend/src/routes/admin.js`                                       | Reservas, cambios de estado, notificaciones y mora.                             |
| Panel del director      | `backend/src/routes/director.js`                                    | Dashboard y reportes.                                                           |
| Validaciones            | `backend/src/services/validationService.js`                         | Reglas R1 a R6.                                                                 |
| Permisos                | `backend/src/middleware/auth.js`, `backend/src/middleware/roles.js`         | Reglas R9 y R11.                                                                |
| Persistencia            | `backend/src/utils/fileStore.js`, `backend/src/data/*.json`                 | Lectura y escritura atómica de datos.                                           |
| Pantallas               | `frontend/index.html`, `frontend/pages/*.html`                  | Interfaz de cada rol.                                                           |
| Lógica del frontend     | `frontend/js/*.js`                                            | Carrito, reservas, remito, API, autenticación y UI.                             |
| Pruebas                 | `backend/tests/api.test.js`                                 | 23 pruebas de autenticación, permisos, catálogo, reservas, pañolero y director. |

---

**Conclusión del relevamiento:** CineStock cubre el flujo completo de autogestión del alumno, la operación diaria del pañolero y el control de gestión del director. La separación entre frontend, API REST, servicios y persistencia JSON permite que las reglas de negocio se validen en el servidor y que el frontend se limite a consumir datos y mostrar la interfaz.
