/**
 * ================================================================
 * HELPERS DE INTERFAZ (ui.js)
 * ================================================================
 * Modales y confirmaciones reutilizables para todas las pantallas.
 * No requiere marcado previo: los modales se crean dinamicamente.
 */

const UI = {
  /**
   * Escapa texto para insertarlo de forma segura dentro de HTML.
   */
  escapar(valor) {
    return String(valor === null || valor === undefined ? '' : valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Abre un modal generico.
   *
   * @param {Object} opciones
   * @param {string} opciones.titulo - Titulo del modal. Si esta vacio no se muestra.
   * @param {string|Node} opciones.contenido - HTML o nodo con el cuerpo.
   * @param {Array} opciones.botones - Lista de { texto, clase, accion, cerrar }.
   * @param {string} opciones.ancho - Ancho maximo opcional (ej: "760px").
   * @param {Function} opciones.onCerrar - Callback al cerrar.
   * @returns {Object} Referencia al overlay, modal, cuerpo y funcion cerrar.
   */
  abrirModal(opciones) {
    const config = opciones || {};
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay visible';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'modal';
    if (config.ancho) {
      modal.style.maxWidth = config.ancho;
    }

    if (config.titulo) {
      const titulo = document.createElement('h3');
      titulo.textContent = config.titulo;
      modal.appendChild(titulo);
    }

    const cuerpo = document.createElement('div');
    cuerpo.className = 'modal-cuerpo';

    if (typeof config.contenido === 'string') {
      cuerpo.innerHTML = config.contenido;
    } else if (config.contenido instanceof Node) {
      cuerpo.appendChild(config.contenido);
    }

    modal.appendChild(cuerpo);

    const pie = document.createElement('div');
    pie.className = 'modal-botones';

    let cerrado = false;

    const cerrar = (resultado) => {
      if (cerrado) return;
      cerrado = true;
      document.removeEventListener('keydown', alPresionarTecla);
      overlay.remove();
      if (typeof config.onCerrar === 'function') {
        config.onCerrar(resultado);
      }
    };

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape') {
        cerrar();
      }
    };

    document.addEventListener('keydown', alPresionarTecla);

    overlay.addEventListener('click', (evento) => {
      if (evento.target === overlay) {
        cerrar();
      }
    });

    (config.botones || []).forEach((boton) => {
      const elemento = document.createElement('button');
      elemento.type = 'button';
      elemento.textContent = boton.texto;

      if (boton.clase) {
        elemento.className = boton.clase;
      }

      elemento.addEventListener('click', () => {
        const resultado = typeof boton.accion === 'function' ? boton.accion() : undefined;
        if (boton.cerrar !== false) {
          cerrar(resultado);
        }
      });

      pie.appendChild(elemento);
    });

    // Si no se indicaron botones, se agrega uno de cierre.
    if (pie.children.length === 0) {
      const cerrarBtn = document.createElement('button');
      cerrarBtn.type = 'button';
      cerrarBtn.className = 'btn-secundario';
      cerrarBtn.textContent = 'Cerrar';
      cerrarBtn.addEventListener('click', () => cerrar());
      pie.appendChild(cerrarBtn);
    }

    modal.appendChild(pie);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return { overlay, modal, cuerpo, cerrar };
  },

  /**
   * Muestra una confirmacion y devuelve una promesa con true/false.
   *
   * @param {Object} opciones
   * @param {string} opciones.titulo
   * @param {string} opciones.mensaje
   * @param {string} opciones.detalleHTML
   * @param {string} opciones.textoConfirmar
   * @param {string} opciones.textoCancelar
   * @param {string} opciones.claseConfirmar
   * @returns {Promise<boolean>}
   */
  confirmar(opciones) {
    const config = opciones || {};

    return new Promise((resolve) => {
      let respondido = false;

      const contenido = document.createElement('div');

      if (config.mensaje) {
        const mensaje = document.createElement('p');
        mensaje.textContent = config.mensaje;
        contenido.appendChild(mensaje);
      }

      if (config.detalleHTML) {
        const detalle = document.createElement('div');
        detalle.className = 'modal-detalle';
        detalle.innerHTML = config.detalleHTML;
        contenido.appendChild(detalle);
      }

      this.abrirModal({
        titulo: config.titulo || 'Confirmar accion',
        contenido,
        ancho: config.ancho,
        botones: [
          {
            texto: config.textoCancelar || 'Cancelar',
            clase: 'btn-secundario',
            accion: () => {
              respondido = true;
              resolve(false);
            }
          },
          {
            texto: config.textoConfirmar || 'Confirmar',
            clase: config.claseConfirmar || 'btn-success',
            accion: () => {
              respondido = true;
              resolve(true);
            }
          }
        ],
        onCerrar: () => {
          if (!respondido) {
            resolve(false);
          }
        }
      });
    });
  }
};

window.UI = UI;
