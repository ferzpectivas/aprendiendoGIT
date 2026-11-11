const Director = {
  _dashboard: null,

  async obtenerDashboard(forzar) {
    if (!forzar && this._dashboard) {
      return this._dashboard;
    }

    this._dashboard = await API.get('/api/director/dashboard');
    return this._dashboard;
  },

  async obtenerReporte() {
    return API.get('/api/director/reportes');
  }
};
