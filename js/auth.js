/**
 * ================================================================
 * MODULO DE AUTENTICACION SIMULADA (auth.js)
 * ================================================================
 * Este módulo maneja el inicio y cierre de sesión de los usuarios.
 * NO usa un servidor real ni bases de datos. La "autenticación"
 * consiste en buscar el usuario en datos.json por matrícula y
 * contraseña, y guardar la sesión en localStorage.
 *
 * FLUJO DE LOGIN:
 *   1. Usuario ingresa matrícula y contraseña
 *   2. Se busca en el array de usuarios de datos.json
 *   3. Si coincide, se guarda el usuario en localStorage
 *   4. Se redirige a la página según el rol del usuario
 *
 * FLUJO DE LOGOUT:
 *   1. Se elimina el usuario de localStorage
 *   2. Se redirige al login (index.html)
 *
 * PERSISTENCIA:
 *   La sesión se mantiene en localStorage con la clave
 *   "cinestock_usuario_actual". Mientras no se cierre el
 *   navegador o se haga logout, el usuario permanece logueado.
 */

const Auth = {
  // Clave donde se guarda el usuario logueado en localStorage
  STORAGE_KEY: 'cinestock_usuario_actual',

  /**
   * login(matricula, password)
   * Busca un usuario con la matrícula y contraseña proporcionadas.
   * Si lo encuentra, guarda su información en localStorage.
   *
   * @param {string} matricula - Matrícula del usuario (ej: "2025-1001")
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} El objeto usuario si las credenciales son correctas
   * @throws {Error} Si las credenciales son incorrectas o hay un error
   */
  async login(matricula, password) {
    // Obtener todos los usuarios del sistema
    const usuarios = await Datos.obtenerUsuarios();

    // Buscar un usuario cuya matrícula y contraseña coincidan
    // find() retorna el primer elemento que cumple la condición
    const usuario = usuarios.find(u =>
      u.matricula === matricula && u.password === password
    );

    // Si no se encontró, lanzar error
    if (!usuario) {
      throw new Error('Matrícula o contraseña incorrectos');
    }

    // Guardar el usuario en localStorage (sin la contraseña por seguridad)
    const usuarioSeguro = { ...usuario };
    delete usuarioSeguro.password;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuarioSeguro));

    return usuarioSeguro;
  },

  /**
   * logout()
   * Elimina la sesión del usuario de localStorage.
   * Después de llamar a esta función, verificarSesion() retornará false.
   */
  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    // También limpiar el carrito al cerrar sesión
    localStorage.removeItem('cinestock_carrito');
  },

  /**
   * getUsuarioActual()
   * Retorna el usuario que tiene la sesión activa.
   *
   * @returns {Object|null} El usuario logueado o null si no hay sesión
   */
  getUsuarioActual() {
    const datos = localStorage.getItem(this.STORAGE_KEY);
    if (!datos) return null;
    return JSON.parse(datos);
  },

  /**
   * verificarSesion()
   * Verifica si hay un usuario logueado. Se usa al cargar cada página
   * para proteger el acceso: si no hay sesión, redirige al login.
   *
   * @returns {boolean} true si hay sesión activa, false si no
   */
  verificarSesion() {
    const usuario = this.getUsuarioActual();
    if (!usuario) {
      // No hay sesión → redirigir al login
      window.location.href = '../index.html';
      return false;
    }
    return true;
  },

  /**
   * verificarRol(rolRequerido)
   * Verifica que el usuario logueado tenga el rol indicado.
   * Si no tiene el rol, lo redirige a su vista correspondiente.
   *
   * @param {string} rolRequerido - Rol necesario (ej: "alumno", "panolero", "director")
   * @returns {boolean} true si el usuario tiene el rol correcto
   */
  verificarRol(rolRequerido) {
    const usuario = this.getUsuarioActual();
    if (!usuario) {
      window.location.href = '../index.html';
      return false;
    }
    if (usuario.rol !== rolRequerido) {
      // Redirigir a la vista correspondiente al rol real del usuario
      const vistas = {
        alumno: 'pages/alumno.html',
        panolero: 'pages/panolero.html',
        director: 'pages/director.html'
      };
      window.location.href = vistas[usuario.rol] || '../index.html';
      return false;
    }
    return true;
  },

  /**
   * isLoggedIn()
   * Retorna true si hay un usuario con sesión activa.
   *
   * @returns {boolean}
   */
  isLoggedIn() {
    return this.getUsuarioActual() !== null;
  }
};
