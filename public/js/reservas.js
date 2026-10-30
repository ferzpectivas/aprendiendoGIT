const Reservas = {
  _reservas: null,

  async crearReserva(items, fechaRetiro, fechaDevolucion) {
    const reserva = await API.post('/api/checkouts', { items, fechaRetiro, fechaDevolucion });
    this._reservas = null;
    Carrito.limpiarCarrito();
    return reserva;
  },

  async cancelarReserva(reservaId) {
    try {
      const reserva = await API.del('/api/checkouts/' + encodeURIComponent(reservaId));
      this._reservas = null;
      return { exito: true, mensaje: 'Reserva cancelada exitosamente.', reserva };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  async cambiarEstadoReserva(reservaId, nuevoEstado, notas) {
    try {
      const reserva = await API.put(
        '/api/admin/checkouts/' + encodeURIComponent(reservaId) + '/status',
        { estado: nuevoEstado, notas }
      );

      this._reservas = null;
      Datos.invalidarEquipos();

      const mensajes = {
        entregado: 'Equipo entregado al alumno.',
        devuelto_ok: 'Devolucion registrada: todo en orden.',
        devuelto_faltantes: 'Devolucion registrada: con faltantes.',
        reparacion: 'Equipo enviado a reparacion.'
      };

      return { exito: true, mensaje: mensajes[nuevoEstado] || 'Estado actualizado.', reserva };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  async enviarNotificacion(reservaId, mensaje) {
    try {
      const reserva = await API.post(
        '/api/admin/checkouts/' + encodeURIComponent(reservaId) + '/notify',
        { mensaje }
      );

      this._reservas = null;
      return { exito: true, mensaje: 'Notificacion enviada.', reserva };
    } catch (error) {
      return { exito: false, mensaje: error.message };
    }
  },

  async obtenerReservasPorUsuario(usuarioId) {
    const reservas = await this.obtenerTodasLasReservas();
    return reservas.filter(reserva => reserva.userId === usuarioId);
  },

  async obtenerTodasLasReservas(forzar) {
    if (!forzar && this._reservas) {
      return this._reservas;
    }

    const reservas = await API.get('/api/checkouts');
    this._reservas = reservas;
    return reservas;
  },

  async obtenerReservasVencidas() {
    const reservas = await this.obtenerTodasLasReservas();
    const hoy = new Date().toISOString().split('T')[0];

    return reservas.filter(reserva => {
      if (reserva.estado !== 'reservado' && reserva.estado !== 'entregado') return false;
      return reserva.fechaDevolucion < hoy;
    });
  },

  async resolverEquiposReserva(reserva) {
    const equipos = await Datos.obtenerEquipos();
    return (reserva.items || [])
      .map(itemId => equipos.find(equipo => equipo.id === itemId))
      .filter(Boolean);
  },

  async contarPrestamosPorEquipo(equipoId) {
    const reservas = await this.obtenerTodasLasReservas();

    return reservas.filter(reserva =>
      (reserva.items || []).includes(equipoId) &&
      ['entregado', 'devuelto_ok', 'devuelto_faltantes'].includes(reserva.estado)
    ).length;
  }
};
