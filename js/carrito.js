/**
 * ================================================================
 * MODULO DE CARRITO DE RESERVA (carrito.js)
 * ================================================================
 * Este módulo gestiona el carrito donde el alumno selecciona
 * los equipos que desea reservar. El carrito se almacena en
 * localStorage para que persista si el usuario navega entre
 * páginas o recarga la página.
 *
 * REGLAS DE NEGOCIO:
 *   - Máximo 5 equipos por reserva
 *   - No se puede agregar el mismo equipo dos veces
 *   - Los equipos en estado "mantenimiento" o "baja" no se pueden reservar
 *   - Si el alumno es de 1° o 2° año, no puede reservar equipos "premium"
 *
 * ESTRUCTURA DEL CARRITO EN localStorage:
 *   Clave: "cinestock_carrito"
 *   Valor: Array de IDs de equipo (ej: ["g-001", "g-006", "g-010"])
 */

const Carrito = {
  // Clave donde se guarda el carrito en localStorage
  STORAGE_KEY: 'cinestock_carrito',

  // Límite máximo de equipos por reserva
  MAX_EQUIPOS: 5,

  /**
   * obtenerCarrito()
   * Retorna el array de IDs de equipos que están en el carrito.
   *
   * @returns {Array} Array de strings con los IDs (ej: ["g-001", "g-006"])
   */
  obtenerCarrito() {
    const datos = localStorage.getItem(this.STORAGE_KEY);
    if (!datos) return [];
    return JSON.parse(datos);
  },

  /**
   * guardarCarrito(carrito)
   * Guarda el array del carrito en localStorage.
   *
   * @param {Array} carrito - Array de IDs de equipo
   */
  guardarCarrito(carrito) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(carrito));
  },

  /**
   * agregarAlCarrito(equipoId)
   * Agrega un equipo al carrito. Valida las reglas antes de agregar.
   *
   * @param {string} equipoId - ID del equipo a agregar (ej: "g-001")
   * @returns {Object} { exito: true/false, mensaje: "..." }
   */
  async agregarAlCarrito(equipoId) {
    const carrito = this.obtenerCarrito();

    // Regla 1: Máximo 5 equipos
    if (carrito.length >= this.MAX_EQUIPOS) {
      return { exito: false, mensaje: 'Ya alcanzaste el máximo de ' + this.MAX_EQUIPOS + ' equipos.' };
    }

    // Regla 2: No repetir equipos
    if (carrito.includes(equipoId)) {
      return { exito: false, mensaje: 'Este equipo ya está en tu carrito.' };
    }

    // Regla 3: Verificar que el equipo exista y esté disponible
    const equipo = await Datos.buscarEquipoPorId(equipoId);
    if (!equipo) {
      return { exito: false, mensaje: 'Equipo no encontrado.' };
    }
    if (equipo.estado === 'mantenimiento') {
      return { exito: false, mensaje: 'Este equipo está en mantenimiento y no se puede reservar.' };
    }
    if (equipo.estado === 'baja') {
      return { exito: false, mensaje: 'Este equipo fue dado de baja.' };
    }
    if (equipo.estado === 'prestado') {
      return { exito: false, mensaje: 'Este equipo ya está prestado actualmente.' };
    }

    // Regla 4: Los alumnos de 1° y 2° año no pueden reservar equipos premium
    const usuario = Auth.getUsuarioActual();
    if (usuario && usuario.rol === 'alumno' && usuario.anio <= 2 && equipo.gama === 'premium') {
      return { exito: false, mensaje: 'Como alumno de ' + usuario.anio + '° año, no podés reservar equipos premium.' };
    }

    // Si pasó todas las validaciones, agregar al carrito
    carrito.push(equipoId);
    this.guardarCarrito(carrito);

    return { exito: true, mensaje: equipo.nombre + ' agregado al carrito.' };
  },

  /**
   * quitarDelCarrito(equipoId)
   * Elimina un equipo del carrito.
   *
   * @param {string} equipoId - ID del equipo a eliminar
   */
  quitarDelCarrito(equipoId) {
    let carrito = this.obtenerCarrito();
    // filter() crea un nuevo array SIN el elemento que coincide
    carrito = carrito.filter(id => id !== equipoId);
    this.guardarCarrito(carrito);
  },

  /**
   * cantidadEnCarrito()
   * Retorna cuántos equipos hay en el carrito.
   *
   * @returns {number}
   */
  cantidadEnCarrito() {
    return this.obtenerCarrito().length;
  },

  /**
   * estaEnCarrito(equipoId)
   * Verifica si un equipo específico ya está en el carrito.
   *
   * @param {string} equipoId - ID del equipo a verificar
   * @returns {boolean}
   */
  estaEnCarrito(equipoId) {
    return this.obtenerCarrito().includes(equipoId);
  },

  /**
   * limpiarCarrito()
   * Vacía el carrito por completo.
   */
  limpiarCarrito() {
    this.guardarCarrito([]);
  },

  /**
   * obtenerDetallesCarrito()
   * Retorna los objetos completos de los equipos en el carrito,
   * resolviendo los IDs a objetos con todos sus datos.
   * Útil para mostrar el carrito en la interfaz.
   *
   * @returns {Promise<Array>} Array de objetos equipo
   */
  async obtenerDetallesCarrito() {
    const ids = this.obtenerCarrito();
    const equipos = [];
    for (const id of ids) {
      const equipo = await Datos.buscarEquipoPorId(id);
      if (equipo) equipos.push(equipo);
    }
    return equipos;
  }
};
