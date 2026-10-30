const Auth = {
  _usuario: null,

  async init() {
    if (this._usuario) return true;

    try {
      const data = await API.get('/api/auth/me');
      this._usuario = data.user;
      return true;
    } catch (error) {
      this._usuario = null;
      return false;
    }
  },

  async login(matricula, password) {
    const data = await API.post('/api/auth/login', { matricula, password });
    this._usuario = data.user;
    return data.user;
  },

  async logout() {
    try {
      await API.post('/api/auth/logout');
    } finally {
      this._usuario = null;
      localStorage.removeItem('cinestock_carrito');
      localStorage.removeItem('cinestock_usuario_actual');
      localStorage.removeItem('cinestock_ultima_reserva');
    }
  },

  getUsuarioActual() {
    return this._usuario;
  },

  isLoggedIn() {
    return this._usuario !== null;
  },

  rutaInicio(rol) {
    const rutas = {
      alumno: '/pages/alumno.html',
      panolero: '/pages/panolero.html',
      director: '/pages/director.html'
    };
    return rutas[rol] || '/index.html';
  },

  verificarSesion() {
    if (!this._usuario) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  },

  verificarRol(rolRequerido) {
    if (!this._usuario) {
      window.location.href = '/index.html';
      return false;
    }

    if (this._usuario.rol !== rolRequerido) {
      window.location.href = this.rutaInicio(this._usuario.rol);
      return false;
    }

    return true;
  }
};
