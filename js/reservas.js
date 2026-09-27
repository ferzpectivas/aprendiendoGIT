/**
 * ================================================================
 * MODULO DE GESTION DE RESERVAS (reservas.js)
 * ================================================================
 * Este módulo maneja todas las operaciones sobre reservas:
 * crear, cancelar, listar, y cambiar estados.
 *
 * ESTADOS DE UNA RESERVA:
 *   - "reservado": El alumno hizo la reserva, aún no retiró el equipo
 *   - "entregado": El pañolero entregó el equipo al alumno
 *   - "devuelto_ok": El alumno devolvió el equipo en buenas condiciones
 *   - "devuelto_faltantes": El alumno devolvió el equipo con piezas faltantes
 *
 * REGLAS DE CANCELACIÓN:
 *   - Solo se puede cancelar si el estado es "reservado"
 *   - Debe faltar al menos 24 horas para la fecha de retiro
 *
 * ESTRUCTURA DE UNA RESERVA:
 *   {
 *     id: "co-XXX",
 *     userId: "u-XXX",          ← referencia al usuario
 *     items: ["g-001", "g-006"], ← IDs de equipos (referencias)
 *     fechaRetiro: "2026-09-10",
 *     fechaDevolucion: "2026-09-12",
 *     estado: "reservado",
 *     notas: "",
 *     createdAt: "2026-09-01T10:00:00Z"
 *   }
 */

const Reservas = {
  /**
   * crearReserva(items, fechaRetiro, fechaDevolucion)
   * Crea una nueva reserva con los equipos del carrito.
   *
   * @param {Array} items - Array de IDs de equipo (del carrito)
   * @param {string} fechaRetiro - Fecha en formato "YYYY-MM-DD"
   * @param {string} fechaDevolucion - Fecha en formato "YYYY-MM-DD"
   * @returns {Promise<Object>} La reserva creada
   * @throws {Error} Si hay problemas con las validaciones
   */
  async crearReserva(items, fechaRetiro, fechaDevolucion) {
    // Validar que haya al menos un equipo
    if (!items || items.length === 0) {
      throw new Error('Debes agregar al menos un equipo al carrito.');
    }

    // Validar que las fechas estén completas
    if (!fechaRetiro || !fechaDevolucion) {
      throw new Error('Debes seleccionar fecha de retiro y devolución.');
    }

    // Validar que la fecha de retiro sea hoy o posterior
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaRetiroDate = new Date(fechaRetiro + 'T00:00:00');
    if (fechaRetiroDate < hoy) {
      throw new Error('La fecha de retiro no puede ser en el pasado.');
    }

    // Validar que la devolución sea posterior al retiro
    const fechaDevolucionDate = new Date(fechaDevolucion + 'T00:00:00');
    if (fechaDevolucionDate <= fechaRetiroDate) {
      throw new Error('La fecha de devolución debe ser posterior a la de retiro.');
    }

    // Verificar que los equipos no estén ocupados en esas fechas
    const reservas = await this.obtenerTodasLasReservas();
    const equipos = await Datos.obtenerEquipos();

    for (const itemId of items) {
      const equipo = equipos.find(e => e.id === itemId);
      if (!equipo) continue;

      // Verificar si el equipo está ocupado en el rango de fechas
      const ocupado = reservas.some(r => {
        // Solo importan reservas con estado reservado o entregado
        if (r.estado !== 'reservado' && r.estado !== 'entregado') return false;
        // Verificar si este equipo está en esa reserva
        if (!r.items.includes(itemId)) return false;
        // Verificar si hay solapamiento de fechas
        // Solapamiento: inicio_nuevo < fin_viejo Y fin_nuevo > inicio_viejo
        return fechaRetiro < r.fechaDevolucion && fechaDevolucion > r.fechaRetiro;
      });

      if (ocupado) {
        throw new Error('El equipo "' + equipo.nombre + '" no está disponible en esas fechas.');
      }
    }

    // Obtener el usuario actual
    const usuario = Auth.getUsuarioActual();
    if (!usuario) {
      throw new Error('Debes iniciar sesión para hacer una reserva.');
    }

    // Generar un ID único para la reserva
    const nuevoId = 'co-' + String(reservas.length + 1).padStart(3, '0');

    // Crear el objeto reserva
    const nuevaReserva = {
      id: nuevoId,
      userId: usuario.id,
      items: items,
      fechaRetiro: fechaRetiro,
      fechaDevolucion: fechaDevolucion,
      estado: 'reservado',
      notas: '',
      createdAt: new Date().toISOString()
    };

    // Agregar la reserva al array y guardar
    reservas.push(nuevaReserva);
    Datos.guardarReservas(reservas);

    // Limpiar el carrito después de crear la reserva exitosamente
    Carrito.limpiarCarrito();

    return nuevaReserva;
  },

  /**
   * cancelarReserva(reservaId)
   * Cancela una reserva. Solo se puede cancelar si el estado es
   * "reservado" y faltan al menos 24 horas para el retiro.
   *
   * @param {string} reservaId - ID de la reserva a cancelar
   * @returns {Promise<Object>} { exito: true/false, mensaje: "..." }
   */
  async cancelarReserva(reservaId) {
    const reservas = await this.obtenerTodasLasReservas();
    const reserva = reservas.find(r => r.id === reservaId);

    if (!reserva) {
      return { exito: false, mensaje: 'Reserva no encontrada.' };
    }

    // Solo se puede cancelar si está en estado "reservado"
    if (reserva.estado !== 'reservado') {
      return { exito: false, mensaje: 'Solo se pueden cancelar reservas en estado "reservado".' };
    }

    // Verificar que falte al menos 24 horas para el retiro
    const fechaRetiro = new Date(reserva.fechaRetiro + 'T00:00:00');
    const ahora = new Date();
    const horasRestantes = (fechaRetiro - ahora) / (1000 * 60 * 60);

    if (horasRestantes < 24) {
      return { exito: false, mensaje: 'No se puede cancelar con menos de 24 horas de anticipación.' };
    }

    // Eliminar la reserva del array
    const reservasActualizadas = reservas.filter(r => r.id !== reservaId);
    Datos.guardarReservas(reservasActualizadas);

    return { exito: true, mensaje: 'Reserva cancelada exitosamente.' };
  },

  /**
   * cambiarEstadoReserva(reservaId, nuevoEstado, notas)
   * Cambia el estado de una reserva. Usado por el pañolero.
   *
   * @param {string} reservaId - ID de la reserva
   * @param {string} nuevoEstado - Nuevo estado ("entregado", "devuelto_ok", "devuelto_faltantes")
   * @param {string} notas - Notas adicionales (opcional)
   * @returns {Promise<Object>} { exito: true/false, mensaje: "..." }
   */
  async cambiarEstadoReserva(reservaId, nuevoEstado, notas) {
    const reservas = await this.obtenerTodasLasReservas();
    const indice = reservas.findIndex(r => r.id === reservaId);

    if (indice === -1) {
      return { exito: false, mensaje: 'Reserva no encontrada.' };
    }

    // Validar transiciones de estado válidas
    const transicionesValidas = {
      reservado: ['entregado'],
      entregado: ['devuelto_ok', 'devuelto_faltantes']
    };

    const estadoActual = reservas[indice].estado;
    if (!transicionesValidas[estadoActual] || !transicionesValidas[estadoActual].includes(nuevoEstado)) {
      return { exito: false, mensaje: 'No se puede cambiar de "' + estadoActual + ' a "' + nuevoEstado + '".' };
    }

    // Actualizar el estado y las notas
    reservas[indice].estado = nuevoEstado;
    if (notas) {
      reservas[indice].notas = notas;
    }

    Datos.guardarReservas(reservas);

    const mensajes = {
      entregado: 'Equipo entregado al alumno.',
      devuelto_ok: 'Devolución registrada: todo en orden.',
      devuelto_faltantes: 'Devolución registrada: con faltantes.'
    };

    return { exito: true, mensaje: mensajes[nuevoEstado] || 'Estado actualizado.' };
  },

  /**
   * obtenerReservasPorUsuario(usuarioId)
   * Retorna todas las reservas de un usuario específico.
   * Útil para que el alumno vea su historial.
   *
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Array>} Array de reservas del usuario
   */
  async obtenerReservasPorUsuario(usuarioId) {
    const reservas = await this.obtenerTodasLasReservas();
    return reservas.filter(r => r.userId === usuarioId);
  },

  /**
   * obtenerTodasLasReservas()
   * Retorna todas las reservas del sistema.
   *
   * @returns {Promise<Array>} Array de todas las reservas
   */
  async obtenerTodasLasReservas() {
    return await Datos.obtenerReservas();
  },

  /**
   * obtenerReservasVencidas()
   * Retorna las reservas cuya fecha de devolución ya pasó
   * y aún no fueron devueltas. Útil para el reporte de mora
   * del director.
   *
   * @returns {Promise<Array>} Array de reservas vencidas
   */
  async obtenerReservasVencidas() {
    const reservas = await this.obtenerTodasLasReservas();
    const hoy = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    return reservas.filter(r => {
      // Solo importan reservas reservadas o entregadas
      if (r.estado !== 'reservado' && r.estado !== 'entregado') return false;
      // La fecha de devolución ya pasó
      return r.fechaDevolucion < hoy;
    });
  },

  /**
   * resolverEquiposReserva(reserva)
   * Toma una reserva y resuelve los IDs de sus items a objetos
   * completos de equipo. Esto permite mostrar nombres y detalles
   * en la interfaz en lugar de solo IDs.
   *
   * @param {Object} reserva - Objeto reserva con items: ["g-001", "g-006"]
   * @returns {Promise<Array>} Array de objetos equipo resueltos
   */
  async resolverEquiposReserva(reserva) {
    const equipos = [];
    for (const itemId of reserva.items) {
      const equipo = await Datos.buscarEquipoPorId(itemId);
      if (equipo) equipos.push(equipo);
    }
    return equipos;
  },

  /**
   * contarPrestamosPorEquipo(equipoId)
   * Cuenta cuántas veces ha sido prestado un equipo (reservas con
   * estado entregado, devuelto_ok o devuelto_faltantes).
   * Útil para el dashboard del director.
   *
   * @param {string} equipoId - ID del equipo
   * @returns {Promise<number>} Cantidad de préstamos
   */
  async contarPrestamosPorEquipo(equipoId) {
    const reservas = await this.obtenerTodasLasReservas();
    return reservas.filter(r =>
      r.items.includes(equipoId) &&
      ['entregado', 'devuelto_ok', 'devuelto_faltantes'].includes(r.estado)
    ).length;
  }
};
