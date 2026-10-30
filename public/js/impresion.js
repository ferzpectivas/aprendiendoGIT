/**
 * ================================================================
 * IMPRESION DE DOCUMENTOS (impresion.js)
 * ================================================================
 * Genera una ventana independiente con el documento formateado y
 * abre el dialogo de impresion del navegador. Desde alli el usuario
 * puede elegir "Guardar como PDF".
 */

const Impresion = {
  /**
   * Estilos del documento imprimible. Se incluyen en la ventana nueva
   * para que el resultado no dependa de la pagina de origen.
   */
  estilos() {
    return [
      '* { box-sizing: border-box; }',
      'body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 32px; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
      'h1, h2, h3 { margin-top: 0; }',
      '.documento-titulo { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 8px; font-size: 24px; }',
      '.documento-meta { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 24px; }',
      '.documento-resumen { margin: 16px 0; font-size: 13px; color: #334155; }',
      '.documento-tabla { width: 100%; border-collapse: collapse; font-size: 13px; }',
      '.documento-tabla th, .documento-tabla td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }',
      '.documento-tabla th { background: #e2e8f0; color: #1e293b; }',
      '.documento-tabla tr:nth-child(even) td { background: #f8fafc; }',
      '.documento-pie { margin-top: 32px; padding-top: 12px; border-top: 1px solid #cbd5e1; text-align: center; color: #64748b; font-size: 12px; }',
      '.remito { border: 2px solid #1e293b; border-radius: 8px; padding: 24px; max-width: 620px; margin: 0 auto; }',
      '.remito h2 { text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 16px; letter-spacing: 1px; }',
      '.remito-detalle { margin-bottom: 8px; font-size: 14px; }',
      '.remito-detalle strong { display: inline-block; width: 190px; }',
      '.remito-items { list-style: none; padding: 0; margin: 16px 0; }',
      '.remito-items li { padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }',
      '.remito-footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 2px solid #1e293b; font-size: 13px; color: #64748b; }',
      '.texto-secundario { color: #64748b; font-size: 0.9em; }',
      '@page { margin: 16mm; }',
      '@media print { body { padding: 0; } }'
    ].join('\n');
  },

  /**
   * Documento HTML completo para imprimir.
   */
  documento(titulo, contenidoHTML) {
    return '<!DOCTYPE html>' +
      '<html lang="es">' +
      '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>' + UI.escapar(titulo) + '</title>' +
        '<style>' + this.estilos() + '</style>' +
      '</head>' +
      '<body>' + contenidoHTML + '</body>' +
      '</html>';
  },

  /**
   * Abre una ventana con el documento y dispara la impresion.
   *
   * @param {string} titulo - Titulo de la ventana / nombre sugerido del PDF.
   * @param {string} contenidoHTML - Contenido HTML del documento.
   * @returns {boolean} true si pudo abrir la ventana.
   */
  imprimirDocumento(titulo, contenidoHTML) {
    const ventana = window.open('', '_blank');

    if (!ventana) {
      alert('El navegador bloqueo la ventana de impresion. Habilita las ventanas emergentes e intenta nuevamente.');
      return false;
    }

    ventana.document.open();
    ventana.document.write(this.documento(titulo, contenidoHTML));
    ventana.document.close();
    ventana.focus();

    let impreso = false;
    const imprimir = () => {
      if (impreso) return;
      impreso = true;
      ventana.focus();
      ventana.print();
    };

    ventana.onload = imprimir;
    window.setTimeout(imprimir, 400);

    return true;
  }
};

window.Impresion = Impresion;
