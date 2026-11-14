# API REST — CineStock

Documento de referencia de la API REST del backend de **CineStock**, sistema de gestión de préstamos de equipamiento audiovisual de la Escuela de Artes Audiovisuales "Lumière".

- **Implementación:** Node.js + Express (`backend/`)
- **URL base local:** `http://localhost:3000/api`
- **Formato de intercambio:** JSON (`Content-Type: application/json`)
- **Autenticación:** sesión con cookie `connect.sid` (`express-session`)
- **Persistencia:** archivos JSON en `backend/src/data/`

---

## 1. Convenciones generales

### 1.1 Autenticación y sesión

La API usa sesiones del lado del servidor. El login crea la sesión y el navegador recibe la cookie `connect.sid`, que se envía automáticamente en las peticiones siguientes (el frontend se sirve desde el mismo origen que la API).

| Característica | Valor |
|---|---|
| Cookie | `connect.sid` |
| Duración | 8 horas |
| `httpOnly` | `true` |
| `sameSite` | `lax` |
| `secure` | `true` en producción (`NODE_ENV=production`) |

Roles del sistema:

| Rol | Descripción |
|---|---|
| `alumno` | Consulta el catálogo, crea y cancela sus propias reservas. |
| `panolero` | Gestiona reservas, entregas, devoluciones, reparaciones, notificaciones e inventario. |
| `director` | Consulta estadísticas, reportes y el estado del inventario. |

### 1.2 Códigos de estado HTTP

| Código | Significado en esta API |
|---|---|
| `200 OK` | Operación exitosa. |
| `201 Created` | Reserva creada correctamente. |
| `400 Bad Request` | Datos inválidos, regla de negocio incumplida o recurso inexistente en operaciones de escritura. |
| `401 Unauthorized` | No hay sesión activa o las credenciales son incorrectas. |
| `403 Forbidden` | El usuario está autenticado pero no tiene el rol o la propiedad requerida. |
| `404 Not Found` | Ruta o recurso inexistente en consultas. |
| `500 Internal Server Error` | Error no controlado del servidor. |

### 1.3 Formato de error

Todas las respuestas de error tienen la forma:

```json
{
  "error": "Descripción del error."
}
```

Errores generales:

| Situación | Respuesta |
|---|---|
| Ruta `/api/*` inexistente | `404 { "error": "Endpoint no encontrado." }` |
| Error no controlado | `500 { "error": "Error interno del servidor." }` |
| Sin sesión (`requireAuth`) | `401 { "error": "No autenticado. Inicie sesion primero." }` |
| Rol incorrecto (`requireRole`) | `403 { "error": "No tiene permisos para esta operacion." }` |

### 1.4 Fechas e identificadores

- Las fechas se expresan como texto ISO `YYYY-MM-DD` (por ejemplo `2026-11-20`).
- Los identificadores son cadenas con prefijo: usuarios `u-001`, equipos `g-001`, reservas `co-001`.
- Las reservas nuevas se generan con `nextId('co-', ...)`, que toma el mayor número existente y le suma uno (por ejemplo `co-021`).

---

## 2. Resumen de endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Estado del servidor. |
| `POST` | `/api/auth/login` | Público | Iniciar sesión. |
| `POST` | `/api/auth/logout` | Público / autenticado | Cerrar sesión y destruir la cookie. |
| `GET` | `/api/auth/me` | Autenticado | Usuario de la sesión actual. |
| `GET` | `/api/gear` | Autenticado | Catálogo de equipos con filtros y fechas ocupadas. |
| `GET` | `/api/gear/:id` | Autenticado | Detalle de un equipo. |
| `GET` | `/api/users` | Pañolero / Director | Listado de usuarios. |
| `GET` | `/api/users/:id` | Autenticado | Usuario propio; cualquier usuario para staff. |
| `GET` | `/api/checkouts` | Autenticado | Reservas propias (alumno) o todas (staff). |
| `GET` | `/api/checkouts/:id` | Autenticado | Detalle de una reserva. |
| `POST` | `/api/checkouts` | Alumno | Crear una reserva. |
| `DELETE` | `/api/checkouts/:id` | Alumno | Cancelar una reserva propia. |
| `GET` | `/api/admin/checkouts` | Pañolero | Reservas con filtros por rango de fechas. |
| `GET` | `/api/admin/checkouts/:id` | Pañolero | Detalle de una reserva (datos crudos). |
| `PUT` | `/api/admin/checkouts/:id/status` | Pañolero | Cambiar el estado de una reserva. |
| `POST` | `/api/admin/checkouts/:id/notify` | Pañolero | Enviar una notificación al alumno. |
| `GET` | `/api/admin/reportes/mora` | Pañolero / Director | Reporte de reservas en mora. |
| `GET` | `/api/director/dashboard` | Director | Dashboard consolidado. |
| `GET` | `/api/director/reportes` | Director | Reporte general. |

---

## 3. Estado y autenticación

### 3.1 `GET /api/health`

Verifica que el servidor esté operativo. No requiere sesión.

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
{
  "status": "ok"
}
```

---

### 3.2 `POST /api/auth/login`

Inicia sesión validando matrícula y contraseña. Crea la sesión y devuelve el usuario sin el campo `password`.

**Cuerpo:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `matricula` | string | Sí | Matrícula del usuario. Se aplica `trim()`. |
| `password` | string | Sí | Contraseña en texto plano (modelo de datos actual). |

**Ejemplo:**

```json
{
  "matricula": "2025-1001",
  "password": "cine123"
}
```

**Respuesta `200`:**

```json
{
  "user": {
    "id": "u-001",
    "matricula": "2025-1001",
    "nombre": "Juan Perez",
    "rol": "alumno",
    "anio": 2,
    "carrera": "Cine"
  },
  "message": "Inicio de sesion exitoso."
}
```

**Errores:**

| Código | Condición | Mensaje |
|---|---|---|
| `400` | Falta `matricula` o `password` | `Matricula y contrasena son requeridas.` |
| `401` | Matrícula inexistente o contraseña incorrecta | `Matricula o contrasena incorrecta.` |

---

### 3.3 `POST /api/auth/logout`

Destruye la sesión y elimina la cookie `connect.sid`. No exige sesión previa: si no existe, igualmente responde con éxito.

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
{
  "message": "Sesion cerrada."
}
```

**Error:** `500 { "error": "Error al cerrar sesion." }` si falla la destrucción de la sesión.

---

### 3.4 `GET /api/auth/me`

Devuelve el usuario almacenado en la sesión actual.

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
{
  "user": {
    "id": "u-001",
    "matricula": "2025-1001",
    "nombre": "Juan Perez",
    "rol": "alumno",
    "anio": 2,
    "carrera": "Cine"
  }
}
```

**Error:** `401 { "error": "No autenticado." }` si no hay sesión.

---

## 4. Catálogo de equipos

### 4.1 `GET /api/gear`

Devuelve el catálogo de equipos. Requiere sesión (cualquier rol).

Cada elemento incluye los datos del equipo más el campo `ocupiedDates` con las fechas en las que está comprometido. *(El nombre del campo se conserva tal como lo expone la implementación.)*

**Parámetros de consulta (query):**

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `busqueda` | string | No | Busca, sin distinguir mayúsculas, en `nombre`, `codigoBarras` y `categoria`. |
| `categoria` | string | No | Filtra por categoría exacta: `camara`, `lente`, `tripode`, `iluminacion`, `audio`. |
| `gama` | string | No | Filtra por gama exacta: `premium`, `standard`. |
| `estado` | string | No | Filtra por estado exacto: `disponible`, `prestado`, `mantenimiento`, `baja`. |
| `disponible` | string | No | Si vale exactamente `true`, devuelve solo equipos en estado `disponible`. |

Los filtros se combinan con **AND**.

**Ejemplo:**

```http
GET /api/gear?categoria=camara&gama=premium&disponible=true
```

**Respuesta `200`:** array de equipos.

```json
[
  {
    "id": "g-001",
    "codigoBarras": "CAM-001",
    "nombre": "Camara Canon EOS 80D",
    "categoria": "camara",
    "gama": "standard",
    "estado": "disponible",
    "anioMinimo": 2,
    "especificaciones": {
      "sensor": "APS-C",
      "megapixeles": 24.2
    },
    "imagen": "/assets/equipos/g-001.webp",
    "ocupiedDates": [
      {
        "fechaRetiro": "2026-09-10",
        "fechaDevolucion": "2026-09-12",
        "checkoutId": "co-001"
      }
    ]
  }
]
```

**Detalle de `ocupiedDates`:**

- Se calcula por equipo a partir de las reservas en estado `reservado`, `entregado` o `reparacion`.
- Solo incluye reservas cuya `fechaDevolucion` sea mayor o igual a la fecha actual.
- Cada elemento contiene `fechaRetiro`, `fechaDevolucion` y `checkoutId`.

**Errores:** `401` sin sesión.

---

### 4.2 `GET /api/gear/:id`

Devuelve el detalle de un equipo, incluyendo `ocupiedDates`. Requiere sesión.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador del equipo (`g-001`, `g-002`, ...). |

**Respuesta `200`:** objeto del equipo con la misma estructura que en el listado.

**Errores:**

| Código | Condición | Mensaje |
|---|---|---|
| `401` | Sin sesión | `No autenticado. Inicie sesion primero.` |
| `404` | Equipo inexistente | `Equipo no encontrado.` |

---

## 5. Usuarios

### 5.1 `GET /api/users`

Lista todos los usuarios. Requiere rol `panolero` o `director`. Nunca devuelve el campo `password`.

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
[
  {
    "id": "u-001",
    "matricula": "2025-1001",
    "nombre": "Juan Perez",
    "rol": "alumno",
    "anio": 2,
    "carrera": "Cine"
  }
]
```

**Errores:** `401` sin sesión; `403` si el rol no es `panolero` ni `director`.

---

### 5.2 `GET /api/users/:id`

Devuelve un usuario. Un alumno solo puede consultar su propio registro; `panolero` y `director` pueden consultar cualquiera.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador del usuario (`u-001`, ...). |

**Respuesta `200`:**

```json
{
  "id": "u-001",
  "matricula": "2025-1001",
  "nombre": "Juan Perez",
  "rol": "alumno",
  "anio": 2,
  "carrera": "Cine"
}
```

**Errores:**

| Código | Condición | Mensaje |
|---|---|---|
| `401` | Sin sesión | `No autenticado. Inicie sesion primero.` |
| `403` | Alumno consultando a otro usuario | `No tiene permisos para ver este usuario.` |
| `404` | Usuario inexistente | `Usuario no encontrado.` |

---

## 6. Reservas (alumno)

> Una reserva se identifica con `co-XXX` y contiene los IDs de los equipos en `items`.

### 6.1 `GET /api/checkouts`

Devuelve las reservas visibles para el usuario de la sesión:

- **Alumno:** solo sus reservas, ordenadas por `createdAt` descendente.
- **Pañolero / Director:** todas las reservas.

Las reservas se devuelven **enriquecidas** con el usuario y el detalle de los equipos.

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
[
  {
    "id": "co-007",
    "userId": "u-001",
    "items": ["g-001", "g-006"],
    "fechaRetiro": "2026-10-30",
    "fechaDevolucion": "2026-11-03",
    "estado": "reparacion",
    "notas": "",
    "notificaciones": [
      "El equipo se entrega con estuche."
    ],
    "createdAt": "2026-10-30T02:17:47.487Z",
    "updatedAt": "2026-10-30T02:23:29.229Z",
    "usuario": {
      "id": "u-001",
      "matricula": "2025-1001",
      "nombre": "Juan Perez",
      "rol": "alumno",
      "anio": 2,
      "carrera": "Cine"
    },
    "equipos": [
      {
        "id": "g-001",
        "nombre": "Camara Canon EOS 80D",
        "codigoBarras": "CAM-001",
        "estado": "disponible"
      },
      {
        "id": "g-006",
        "nombre": "Lente Canon EF 50mm f/1.8 STM",
        "codigoBarras": "LEN-001",
        "estado": "disponible"
      }
    ]
  }
]
```

**Errores:** `401` sin sesión.

---

### 6.2 `GET /api/checkouts/:id`

Devuelve el detalle enriquecido de una reserva.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador de la reserva (`co-001`, ...). |

**Respuesta `200`:** objeto de reserva con la estructura del punto 6.1.

**Errores:**

| Código | Condición | Mensaje |
|---|---|---|
| `401` | Sin sesión | `No autenticado. Inicie sesion primero.` |
| `403` | Alumno consultando una reserva ajena | `No tiene permisos para ver esta reserva.` |
| `404` | Reserva inexistente | `Reserva no encontrada.` |

---

### 6.3 `POST /api/checkouts`

Crea una reserva para el alumno autenticado. Solo el rol `alumno` puede usarlo.

**Cuerpo:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `items` | string[] | Sí | IDs de equipos. Entre 1 y 5, sin duplicados. |
| `fechaRetiro` | string `YYYY-MM-DD` | Sí | Fecha de retiro. No puede ser anterior a hoy. |
| `fechaDevolucion` | string `YYYY-MM-DD` | Sí | Fecha de devolución. Debe ser posterior a `fechaRetiro`. |

**Ejemplo:**

```json
{
  "items": ["g-005", "g-007"],
  "fechaRetiro": "2026-11-20",
  "fechaDevolucion": "2026-11-22"
}
```

**Respuesta `201`:** reserva creada y enriquecida, con `estado: "reservado"`, `notas: ""` y `notificaciones: []`.

```json
{
  "id": "co-021",
  "userId": "u-001",
  "items": ["g-005", "g-007"],
  "fechaRetiro": "2026-11-20",
  "fechaDevolucion": "2026-11-22",
  "estado": "reservado",
  "notas": "",
  "notificaciones": [],
  "createdAt": "2026-11-14T18:00:00.000Z",
  "updatedAt": "2026-11-14T18:00:00.000Z",
  "usuario": { "...": "..." },
  "equipos": ["..."]
}
```

**Validaciones (se aplican en este orden):**

1. `items` debe ser un array no vacío y con un máximo de **5** equipos.
2. No se permite repetir un equipo en la misma reserva.
3. Cada equipo debe existir.
4. El equipo no puede estar en estado `prestado`, `mantenimiento` ni `baja`.
5. El alumno debe cumplir el `anioMinimo` del equipo (`user.anio >= gear.anioMinimo`).
6. `fechaRetiro` y `fechaDevolucion` son obligatorias.
7. `fechaRetiro` no puede ser anterior a la fecha actual.
8. `fechaDevolucion` debe ser posterior a `fechaRetiro`.
9. No puede haber superposición de fechas con otra reserva activa (`reservado` o `entregado`) del mismo equipo. La comparación es inclusiva: `inicioA <= finB && finA >= inicioB`.

**Errores `400` (mensajes posibles):**

| Mensaje | Causa |
|---|---|
| `Formato de items invalido.` | `items` no es un array. |
| `Debe seleccionar al menos un equipo.` | Array vacío. |
| `Maximo 5 equipos por reserva.` | Más de 5 elementos. |
| `No se puede repetir un equipo en la misma reserva.` | IDs duplicados. |
| `Equipo g-XXX no encontrado.` | ID inexistente. |
| `El equipo "..." esta dado de baja.` | Estado `baja`. |
| `El equipo "..." esta en mantenimiento.` | Estado `mantenimiento`. |
| `El equipo "..." ya esta prestado actualmente.` | Estado `prestado`. |
| `El equipo "... premium" requiere ser alumno de N anio o superior.` | No cumple `anioMinimo`. |
| `Debe indicar fecha de retiro y devolucion.` | Faltan fechas. |
| `La fecha de retiro no puede ser anterior a hoy.` | Fecha pasada. |
| `La fecha de devolucion debe ser posterior a la de retiro.` | Rango inválido. |
| `El equipo ya esta reservado para las fechas seleccionadas.` | Superposición. |

**Otros errores:** `401` sin sesión; `403` si el rol no es `alumno`.

---

### 6.4 `DELETE /api/checkouts/:id`

Cancela una reserva propia. Solo el rol `alumno` puede usarlo.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador de la reserva. |

**Condiciones:**

- La reserva debe pertenecer al alumno autenticado.
- La reserva debe estar en estado `reservado`.
- Deben faltar al menos **24 horas** para el inicio de la `fechaRetiro` (se interpreta como `fechaRetiro` a las `00:00` locales).

**Respuesta `200`:** reserva enriquecida con `estado: "cancelado"`.

**Errores `400`:**

| Mensaje | Causa |
|---|---|
| `Reserva no encontrada.` | ID inexistente. |
| `No puede cancelar una reserva que no le pertenece.` | Reserva de otro alumno. |
| `Solo se pueden cancelar reservas en estado "reservado".` | Estado distinto de `reservado`. |
| `Solo se puede cancelar con al menos 24 horas de anticipacion.` | Falta menos de 24 h. |

**Otros errores:** `401` sin sesión; `403` si el rol no es `alumno`.

> **Sobre el inventario:** esta operación solo cambia el estado de la reserva a `cancelado`. Como la reserva estaba en estado `reservado`, los equipos todavía no habían pasado a `prestado`, por lo que no es necesario modificar `gear.json`.

---

## 7. Panel del pañolero

Todas las rutas bajo `/api/admin` requieren sesión (`401` sin sesión). Salvo el reporte de mora, requieren rol `panolero` (`403` en caso contrario).

> Estas rutas devuelven la reserva **sin enriquecer** (sin `usuario` ni `equipos`), a diferencia de `/api/checkouts`.

### 7.1 `GET /api/admin/checkouts`

Lista reservas, opcionalmente filtradas por rango de fechas.

**Parámetros de consulta:**

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `desde` | string `YYYY-MM-DD` | No | Incluye reservas con `fechaRetiro >= desde`. |
| `hasta` | string `YYYY-MM-DD` | No | Incluye reservas con `fechaDevolucion <= hasta`. |

Los resultados se ordenan por `fechaRetiro` ascendente. Si no se envían parámetros, devuelve todas las reservas.

**Ejemplo:**

```http
GET /api/admin/checkouts?desde=2026-11-01&hasta=2026-11-30
```

**Respuesta `200`:**

```json
[
  {
    "id": "co-007",
    "userId": "u-001",
    "items": ["g-001", "g-006"],
    "fechaRetiro": "2026-10-30",
    "fechaDevolucion": "2026-11-03",
    "estado": "reparacion",
    "notas": "",
    "notificaciones": [],
    "createdAt": "2026-10-30T02:17:47.487Z",
    "updatedAt": "2026-10-30T02:23:29.229Z"
  }
]
```

**Errores:** `401` sin sesión; `403` si el rol no es `panolero`.

---

### 7.2 `GET /api/admin/checkouts/:id`

Devuelve una reserva por ID, sin enriquecer.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador de la reserva. |

**Respuesta `200`:** objeto de reserva.

**Errores:**

| Código | Condición | Mensaje |
|---|---|---|
| `401` | Sin sesión | `No autenticado. Inicie sesion primero.` |
| `403` | Rol incorrecto | `No tiene permisos para esta operacion.` |
| `404` | Reserva inexistente | `Reserva no encontrada.` |

---

### 7.3 `PUT /api/admin/checkouts/:id/status`

Cambia el estado de una reserva y sincroniza el estado del inventario.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador de la reserva. |

**Cuerpo:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `estado` | string | Sí | Estado destino. |
| `notas` | string | No | Si se envía y es truthy, reemplaza las notas de la reserva. |

**Estados destino válidos:** `entregado`, `devuelto_ok`, `devuelto_faltantes`, `reparacion`, `cancelado`.

**Transiciones permitidas:**

```text
reservado -> entregado | cancelado
entregado -> devuelto_ok | devuelto_faltantes | reparacion
```

**Ejemplo:**

```json
{
  "estado": "reparacion",
  "notas": "Lente con hongo."
}
```

**Respuesta `200`:** reserva actualizada (sin enriquecer).

**Efectos sobre el inventario (`gear.json`):**

| Estado destino | Efecto en cada equipo de la reserva |
|---|---|
| `entregado` | Pasa a `prestado`. |
| `reparacion` | Pasa a `mantenimiento`. |
| `devuelto_ok`, `devuelto_faltantes`, `cancelado` | Vuelve a `disponible` si no tiene otra reserva `entregado` y no está en `baja` ni `mantenimiento`. |

**Errores `400`:**

| Mensaje | Causa |
|---|---|
| `Reserva no encontrada.` | ID inexistente. |
| `Estado invalido. Validos: entregado, devuelto_ok, devuelto_faltantes, reparacion, cancelado` | Estado fuera del conjunto válido. |
| `No se puede cambiar de "X" a "Y".` | Transición no permitida. |

**Otros errores:** `401` sin sesión; `403` si el rol no es `panolero`.

---

### 7.4 `POST /api/admin/checkouts/:id/notify`

Agrega una notificación de texto a la reserva, visible para el alumno en su historial.

**Parámetros de ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador de la reserva. |

**Cuerpo:**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `mensaje` | string | Sí | Texto no vacío. Se aplica `trim()`; los espacios solamente se rechazan. |

**Ejemplo:**

```json
{
  "mensaje": "Falta devolver el cable HDMI."
}
```

**Respuesta `200`:** reserva actualizada (sin enriquecer), con el mensaje agregado al final de `notificaciones`.

**Errores `400`:**

| Mensaje | Causa |
|---|---|
| `Reserva no encontrada.` | ID inexistente. |
| `Mensaje requerido.` | Mensaje ausente, no string o vacío tras `trim()`. |

**Otros errores:** `401` sin sesión; `403` si el rol no es `panolero`.

---

### 7.5 `GET /api/admin/reportes/mora`

Devuelve las reservas vencidas. Accesible para `panolero` y `director`.

**Criterio:** reservas en estado `entregado` o `devuelto_faltantes` cuya `fechaDevolucion` sea anterior a la fecha actual. Se ordenan por `diasVencido` descendente.

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
[
  {
    "id": "co-002",
    "userId": "u-002",
    "items": ["Camara Sony Alpha a7 III", "Lente Sony FE 24-70mm f/2.8 GM"],
    "fechaRetiro": "2026-09-05",
    "fechaDevolucion": "2026-09-07",
    "diasVencido": 68,
    "estado": "devuelto_faltantes"
  }
]
```

**Detalle:**

| Campo | Descripción |
|---|---|
| `items` | Nombres de los equipos (no IDs). Si un equipo no existe, se devuelve el ID. |
| `diasVencido` | Diferencia en días entre hoy y `fechaDevolucion`, redondeada hacia abajo. |

**Errores:** `401` sin sesión; `403` si el rol no es `panolero` ni `director`.

---

## 8. Panel del director

Todas las rutas bajo `/api/director` requieren sesión y rol `director` (`401` sin sesión, `403` para otros roles).

### 8.1 `GET /api/director/dashboard`

Devuelve el dashboard consolidado con estadísticas de inventario, demanda y mora.

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
{
  "stats": {
    "total": 20,
    "disponibles": 13,
    "prestados": 5,
    "mantenimiento": 1,
    "baja": 1,
    "enUso": 3,
    "enMora": 1
  },
  "mostDemanded": [
    {
      "id": "g-001",
      "nombre": "Camara Canon EOS 80D",
      "categoria": "camara",
      "estado": "disponible",
      "vecesReservado": 4
    }
  ],
  "demandaPorEquipo": {
    "g-001": 4,
    "g-006": 3
  },
  "mora": [],
  "porCategoria": {
    "camara": {
      "total": 5,
      "disponibles": 4,
      "prestados": 0,
      "mantenimiento": 1,
      "baja": 0
    }
  },
  "equiposFueraServicio": [
    {
      "id": "g-003",
      "codigoBarras": "CAM-003",
      "nombre": "Blackmagic Pocket Cinema Camera 4K",
      "categoria": "camara",
      "estado": "mantenimiento"
    }
  ]
}
```

**Detalle de campos:**

| Campo | Descripción |
|---|---|
| `stats.total` | Cantidad total de equipos. |
| `stats.disponibles` / `prestados` / `mantenimiento` / `baja` | Conteo de equipos por estado. |
| `stats.enUso` | Cantidad de reservas en estado `reservado` o `entregado` cuya fecha actual cae dentro del rango de retiro/devolución. |
| `stats.enMora` | Cantidad de reservas `entregado` o `devuelto_faltantes` con `fechaDevolucion` vencida. |
| `mostDemanded` | Top 10 de equipos por cantidad de reservas no canceladas. |
| `demandaPorEquipo` | Objeto `id de equipo -> cantidad de reservas no canceladas`. |
| `mora` | Mismo contenido que `GET /api/admin/reportes/mora`. |
| `porCategoria` | Totales y conteo por estado para cada categoría presente. |
| `equiposFueraServicio` | Equipos en estado `mantenimiento` o `baja`. |

**Errores:** `401` sin sesión; `403` si el rol no es `director`.

---

### 8.2 `GET /api/director/reportes`

Genera un reporte general. Incluye los mismos datos del dashboard, más totales de reservas y una lista completa de demanda (sin límite de 10).

**Parámetros:** ninguno.

**Respuesta `200`:**

```json
{
  "generatedAt": "2026-11-14T18:00:00.000Z",
  "stats": { "...": "..." },
  "mostDemanded": ["... todas las reservas no canceladas ..."],
  "demandaPorEquipo": { "g-001": 4 },
  "porCategoria": { "...": "..." },
  "equiposFueraServicio": ["..."],
  "mora": ["..."],
  "totalReservas": 23,
  "reservasActivas": 4
}
```

**Campos adicionales respecto del dashboard:**

| Campo | Descripción |
|---|---|
| `generatedAt` | Fecha y hora ISO de generación del reporte. |
| `mostDemanded` | Todos los equipos con demanda, ordenados de mayor a menor. |
| `totalReservas` | Cantidad total de reservas registradas (incluye canceladas y finalizadas). |
| `reservasActivas` | Cantidad de reservas en estado `reservado` o `entregado`. |

**Errores:** `401` sin sesión; `403` si el rol no es `director`.

---

## 9. Modelos de datos

### 9.1 Usuario

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador (`u-001`). |
| `matricula` | string | Matrícula usada para el login. |
| `password` | string | Contraseña. **Nunca se devuelve en las respuestas.** |
| `nombre` | string | Nombre completo. |
| `rol` | string | `alumno`, `panolero` o `director`. |
| `anio` | number | Año de cursada del alumno (se usa para `anioMinimo`). |
| `carrera` | string | Carrera del alumno. |

### 9.2 Equipo

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador (`g-001`). |
| `codigoBarras` | string | Código de inventario (`CAM-001`, `LEN-001`, ...). |
| `nombre` | string | Nombre del equipo. |
| `categoria` | string | `camara`, `lente`, `tripode`, `iluminacion`, `audio`. |
| `gama` | string | `premium` o `standard`. |
| `estado` | string | `disponible`, `prestado`, `mantenimiento`, `baja`. |
| `anioMinimo` | number | Año mínimo de cursada requerido. |
| `especificaciones` | object | Especificaciones técnicas variables según el equipo. |
| `imagen` | string | Ruta relativa de la imagen. |
| `ocupiedDates` | array | Solo en respuestas de catálogo: reservas activas con `fechaRetiro`, `fechaDevolucion` y `checkoutId`. |

### 9.3 Reserva

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string | Identificador (`co-001`). |
| `userId` | string | ID del alumno que reservó. |
| `items` | string[] | IDs de equipos (1 a 5, sin duplicados). |
| `fechaRetiro` | string | Fecha de retiro `YYYY-MM-DD`. |
| `fechaDevolucion` | string | Fecha de devolución `YYYY-MM-DD`. |
| `estado` | string | `reservado`, `entregado`, `devuelto_ok`, `devuelto_faltantes`, `reparacion`, `cancelado`. |
| `notas` | string | Notas internas del pañolero. |
| `notificaciones` | string[] | Mensajes enviados al alumno. |
| `createdAt` | string | Fecha ISO de creación. |
| `updatedAt` | string | Fecha ISO de última modificación. |
| `usuario` | object | Solo en respuestas enriquecidas: usuario sin `password`. |
| `equipos` | array | Solo en respuestas enriquecidas: `id`, `nombre`, `codigoBarras`, `estado`. |

---

## 10. Flujo de estados de una reserva

```text
                 +--> devuelto_ok
                 |
reservado --> entregado --> devuelto_faltantes
                 |
                 +--> reparacion

reservado --> cancelado
```

- `reservado`: reserva creada por el alumno.
- `entregado`: el pañolero entrega los equipos; pasan a `prestado`.
- `devuelto_ok`: devolución completa; los equipos vuelven a `disponible`.
- `devuelto_faltantes`: devolución con faltantes; los equipos vuelven a `disponible` salvo que sigan entregados o estén fuera de servicio.
- `reparacion`: los equipos pasan a `mantenimiento`.
- `cancelado`: el alumno cancela con al menos 24 h de anticipación, o el pañolero cancela una reserva en estado `reservado` mediante el cambio de estado.

---

## 11. Ejemplos de uso con `curl`

```sh
# Login y almacenamiento de la cookie de sesión
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"matricula":"2025-1001","password":"cine123"}'

# Consultar el catálogo filtrando cámaras disponibles
curl -b cookies.txt "http://localhost:3000/api/gear?categoria=camara&disponible=true"

# Crear una reserva
curl -b cookies.txt -X POST http://localhost:3000/api/checkouts \
  -H "Content-Type: application/json" \
  -d '{"items":["g-005","g-007"],"fechaRetiro":"2026-11-20","fechaDevolucion":"2026-11-22"}'

# Cancelar una reserva
curl -b cookies.txt -X DELETE http://localhost:3000/api/checkouts/co-021

# Ver el dashboard como director
curl -c cookies-dir.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"matricula":"DIR-001","password":"director2026"}'
curl -b cookies-dir.txt http://localhost:3000/api/director/dashboard
```

---

## 12. Notas de implementación

- Toda ruta bajo `/api` distinta de las definidas responde `404` con `{ "error": "Endpoint no encontrado." }`.
- El middleware de errores responde `500` con `{ "error": "Error interno del servidor." }` y registra el error en consola.
- La sesión se mantiene en memoria del servidor (`express-session` con `MemoryStore`); al reiniciar el proceso se pierden las sesiones activas.
- La persistencia se realiza sobre `backend/src/data/*.json`. Se puede cambiar el directorio con la variable de entorno `CINESTOCK_DATA_DIR`.
- En producción (`NODE_ENV=production`) la cookie de sesión se marca `secure`, por lo que requiere HTTPS. El servidor configura `trust proxy` para funcionar detrás del proxy de Render.
- El frontend consume esta API desde `frontend/js/api.js`; `localStorage` se usa únicamente para el carrito del alumno.
