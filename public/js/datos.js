const Datos = {
  _equipos: null,
  _usuarios: null,

  async obtenerEquipos(filtros) {
    const params = new URLSearchParams();

    if (filtros) {
      if (filtros.busqueda) params.set('busqueda', filtros.busqueda);
      if (filtros.categoria) params.set('categoria', filtros.categoria);
      if (filtros.estado) params.set('estado', filtros.estado);
      if (filtros.gama) params.set('gama', filtros.gama);
      if (filtros.disponible) params.set('disponible', filtros.disponible);
    }

    const query = params.toString();
    const equipos = await API.get('/api/gear' + (query ? '?' + query : ''));

    if (!query) {
      this._equipos = equipos;
    }

    return equipos;
  },

  async buscarEquipoPorId(id) {
    if (this._equipos) {
      const encontrado = this._equipos.find(equipo => equipo.id === id);
      if (encontrado) return encontrado;
    }

    try {
      return await API.get('/api/gear/' + encodeURIComponent(id));
    } catch (error) {
      if (error.status === 404) return undefined;
      throw error;
    }
  },

  async obtenerUsuarios() {
    const usuarios = await API.get('/api/users');
    this._usuarios = usuarios;
    return usuarios;
  },

  async buscarUsuarioPorId(id) {
    if (this._usuarios) {
      const encontrado = this._usuarios.find(usuario => usuario.id === id);
      if (encontrado) return encontrado;
    }

    try {
      return await API.get('/api/users/' + encodeURIComponent(id));
    } catch (error) {
      if (error.status === 404) return undefined;
      throw error;
    }
  },

  async obtenerReservas() {
    return API.get('/api/checkouts');
  },

  invalidarEquipos() {
    this._equipos = null;
  },

  invalidarUsuarios() {
    this._usuarios = null;
  }
};
