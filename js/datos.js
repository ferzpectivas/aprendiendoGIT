/**
 * ================================================================
 * MODULO DE CARGA Y PERSISTENCIA DE DATOS (datos.js)
 * ================================================================
 * Este módulo se encarga de cargar los datos iniciales desde
 * data/datos.json usando fetch() y guardarlos en localStorage
 * para que persistan entre recargas de página.
 *
 * FLUJO DE DATOS:
 *   1. Primera vez: fetch() carga datos.json → se guarda en localStorage
 *   2. En adelante: se lee directamente de localStorage (más rápido)
 *   3. Cuando el usuario modifica datos (reservas, carrito), se
 *      guardan de vuelta en localStorage
 *
 * POR QUÉ localStorage Y NO fetch CADA VEZ:
 *   - Si hiciéramos fetch cada vez, se perderían las reservas creadas
 *   - localStorage permite que las modificaciones del usuario persistan
 *   - fetch solo se usa la primera vez para obtener los datos iniciales
 */

const Datos = {
  // Clave donde se guardan los datos en localStorage
  STORAGE_KEY: 'cinestock_datos',

  /**
   * cargarDatos()
   * Función principal que carga todos los datos de la aplicación.
   * Primero intenta leer de localStorage; si no hay datos guardados,
   * hace fetch a datos.json y los guarda para futuras consultas.
   *
   * Retorna: Promise con el objeto { usuarios, equipos, reservas }
   */
  async cargarDatos() {
    // Intentar leer de localStorage primero (más rápido)
    const datosGuardados = localStorage.getItem(this.STORAGE_KEY);
    if (datosGuardados) {
      return JSON.parse(datosGuardados);
    }

    // Si no hay datos guardados, hacer fetch a datos.json
    // La ruta relativa funciona tanto con file:// como con un servidor local
    try {
      const respuesta = await fetch('data/datos.json');
      if (!respuesta.ok) {
        throw new Error('Error al cargar datos.json: ' + respuesta.status);
      }
      const datos = await respuesta.json();

      // Guardar en localStorage para que persistan
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datos));
      return datos;
    } catch (error) {
      console.error('Error cargando datos:', error);
      throw error;
    }
  },

  /**
   * guardarDatos(datos)
   * Guarda el objeto completo de datos en localStorage.
   * Se llama después de cada modificación (reserva, cambio de estado, etc.)
   *
   * @param {Object} datos - Objeto con usuarios, equipos y reservas
   */
  guardarDatos(datos) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(datos));
  },

  /**
   * obtenerUsuarios()
   * Retorna el array de usuarios desde localStorage.
   */
  async obtenerUsuarios() {
    const datos = await this.cargarDatos();
    return datos.usuarios;
  },

  /**
   * obtenerEquipos()
   * Retorna el array de equipos desde localStorage.
   */
  async obtenerEquipos() {
    const datos = await this.cargarDatos();
    return datos.equipos;
  },

  /**
   * obtenerReservas()
   * Retorna el array de reservas desde localStorage.
   */
  async obtenerReservas() {
    const datos = await this.cargarDatos();
    return datos.reservas;
  },

  /**
   * guardarReservas(reservas)
   * Guarda el array actualizado de reservas en localStorage.
   *
   * @param {Array} reservas - Array de objetos reserva
   */
  guardarReservas(reservas) {
    const datos = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
    datos.reservas = reservas;
    this.guardarDatos(datos);
  },

  /**
   * guardarEquipos(equipos)
   * Guarda el array actualizado de equipos en localStorage.
   *
   * @param {Array} equipos - Array de objetos equipo
   */
  guardarEquipos(equipos) {
    const datos = JSON.parse(localStorage.getItem(this.STORAGE_KEY));
    datos.equipos = equipos;
    this.guardarDatos(datos);
  },

  /**
   * buscarEquipoPorId(id)
   * Busca un equipo por su ID en los datos guardados.
   *
   * @param {string} id - ID del equipo (ej: "g-001")
   * @returns {Object|undefined} El equipo encontrado o undefined
   */
  async buscarEquipoPorId(id) {
    const equipos = await this.obtenerEquipos();
    return equipos.find(e => e.id === id);
  },

  /**
   * buscarUsuarioPorId(id)
   * Busca un usuario por su ID en los datos guardados.
   *
   * @param {string} id - ID del usuario (ej: "u-001")
   * @returns {Object|undefined} El usuario encontrado o undefined
   */
  async buscarUsuarioPorId(id) {
    const usuarios = await this.obtenerUsuarios();
    return usuarios.find(u => u.id === id);
  },

  /**
   * limpiarDatos()
   * Elimina todos los datos de localStorage.
   * Útil para "resetear" la aplicación y volver a cargar datos.json.
   */
  limpiarDatos() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};
