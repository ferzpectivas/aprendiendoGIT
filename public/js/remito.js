/**
 * ================================================================
 * REMITO DE RESERVA (remito.js)
 * ================================================================
 * Render compartido del remito digital. Se usa en la pantalla de
 * confirmacion y en el modal del historial del alumno.
 */

const Remito = {
  ESTADOS: {
    reservado: 'Reservado',
    entregado: 'Entregado',
    devuelto_ok: 'Devuelto OK',
    devuelto_faltantes: 'Devuelto con faltantes',
    reparacion: 'En reparacion',
    cancelado: 'Cancelado'
  },

  /**
   * Resuelve usuario y equipos de una reserva.
   */
  async obtenerDatos(reserva) {
    let usuario = reserva.usuario || null;

    if (!usuario) {
      try {
        usuario = await Datos.buscarUsuarioPorId(reserva.userId);
      } catch (error) {
        usuario = null;
      }
    }

    if (!usuario) {
      usuario = Auth.getUsuarioActual();
    }

    let equipos = Array.isArray(reserva.equipos) && reserva.equipos.length
      ? reserva.equipos
      : null;

    if (!equipos) {
      try {
        equipos = await Reservas.resolverEquiposReserva(reserva);
      } catch (error) {
        equipos = [];
      }
    }

    return { usuario, equipos };
  },

  /**
   * Construye el HTML del remito.
   *
   * @param {Object} reserva
   * @param {Object} usuario
   * @param {Array} equipos
   * @returns {string}
   */
  construirHTML(reserva, usuario, equipos) {
    const fechaCreacion = reserva.createdAt
      ? new Date(reserva.createdAt).toLocaleDateString('es-AR')
      : 'N/A';

    const estado = this.ESTADOS[reserva.estado] || reserva.estado || 'N/A';

    const items = (equipos || []).map((equipo) => {
      return '<li>' +
        UI.escapar(equipo.nombre || 'Equipo sin nombre') +
        ' <span class="texto-secundario">(' + UI.escapar(equipo.codigoBarras || 'sin codigo') + ')</span>' +
      '</li>';
    }).join('');

    return '<section class="remito">' +
      '<h2>REMITO DE RESERVA</h2>' +
      '<div class="remito-detalle"><strong>N&deg; de Reserva:</strong> ' + UI.escapar(String(reserva.id || '').toUpperCase()) + '</div>' +
      '<div class="remito-detalle"><strong>Fecha de Solicitud:</strong> ' + UI.escapar(fechaCreacion) + '</div>' +
      '<div class="remito-detalle"><strong>Alumno:</strong> ' + UI.escapar(usuario ? usuario.nombre : 'Desconocido') + '</div>' +
      '<div class="remito-detalle"><strong>Matr&iacute;cula:</strong> ' + UI.escapar(usuario ? usuario.matricula : 'N/A') + '</div>' +
      '<div class="remito-detalle"><strong>Estado:</strong> ' + UI.escapar(estado) + '</div>' +
      '<br>' +
      '<div class="remito-detalle"><strong>Fecha de Retiro:</strong> ' + UI.escapar(reserva.fechaRetiro || 'N/A') + '</div>' +
      '<div class="remito-detalle"><strong>Fecha de Devoluci&oacute;n:</strong> ' + UI.escapar(reserva.fechaDevolucion || 'N/A') + '</div>' +
      '<br>' +
      '<h3>Equipos Reservados (' + (equipos || []).length + '):</h3>' +
      '<ul class="remito-items">' + (items || '<li>Sin equipos registrados.</li>') + '</ul>' +
      '<div class="remito-footer">' +
        'Present&aacute; este remito en el dep&oacute;sito al retirar tu equipamiento.<br>' +
        'Escuela de Artes Audiovisuales "Lumiere"' +
      '</div>' +
    '</section>';
  },

  /**
   * Muestra el remito en un modal.
   */
  async ver(reserva) {
    const datos = await this.obtenerDatos(reserva);
    const html = this.construirHTML(reserva, datos.usuario, datos.equipos);

    UI.abrirModal({
      titulo: '',
      contenido: html,
      ancho: '760px',
      botones: [
        {
          texto: 'Descargar PDF',
          clase: 'btn-action',
          accion: () => this.imprimir(reserva, datos.usuario, datos.equipos),
          cerrar: false
        },
        {
          texto: 'Cerrar',
          clase: 'btn-secundario'
        }
      ]
    });
  },

  /**
   * Genera el PDF a traves del dialogo de impresion.
   */
  async imprimir(reserva, usuario, equipos) {
    let datosUsuario = usuario;
    let datosEquipos = equipos;

    if (!datosUsuario || !datosEquipos) {
      const datos = await this.obtenerDatos(reserva);
      datosUsuario = datos.usuario;
      datosEquipos = datos.equipos;
    }

    const html = this.construirHTML(reserva, datosUsuario, datosEquipos);
    Impresion.imprimirDocumento('Remito ' + String(reserva.id || '').toUpperCase(), html);
  }
};

window.Remito = Remito;
