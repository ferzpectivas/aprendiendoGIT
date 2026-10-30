const fileStore = require('../utils/fileStore');
const validationService = require('./validationService');
const { today, isAtLeast24HoursAway } = require('../utils/dateUtils');
const { nextId } = require('../utils/idUtils');

const TRANSITIONS = {
  reservado: ['entregado', 'cancelado'],
  entregado: ['devuelto_ok', 'devuelto_faltantes', 'reparacion']
};

const VALID_STATES = ['entregado', 'devuelto_ok', 'devuelto_faltantes', 'reparacion', 'cancelado'];

function getAll() {
  return fileStore.read('checkouts.json');
}

function getById(id) {
  return getAll().find(checkout => checkout.id === id) || null;
}

function getByUser(userId) {
  return getAll()
    .filter(checkout => checkout.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getByDateRange(desde, hasta) {
  let checkouts = getAll();

  if (desde) {
    checkouts = checkouts.filter(checkout => checkout.fechaRetiro >= desde);
  }
  if (hasta) {
    checkouts = checkouts.filter(checkout => checkout.fechaDevolucion <= hasta);
  }

  return checkouts.sort((a, b) => a.fechaRetiro.localeCompare(b.fechaRetiro));
}

function create(user, items, fechaRetiro, fechaDevolucion) {
  const validation = validationService.validateAll(user, items, fechaRetiro, fechaDevolucion);

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const checkouts = getAll();
  const now = new Date().toISOString();

  const checkout = {
    id: nextId('co-', checkouts),
    userId: user.id,
    items,
    fechaRetiro,
    fechaDevolucion,
    estado: 'reservado',
    notas: '',
    notificaciones: [],
    createdAt: now,
    updatedAt: now
  };

  checkouts.push(checkout);
  fileStore.write('checkouts.json', checkouts);

  return { success: true, checkout };
}

function cancel(checkoutId, userId) {
  const checkouts = getAll();
  const checkout = checkouts.find(item => item.id === checkoutId);

  if (!checkout) {
    return { success: false, error: 'Reserva no encontrada.' };
  }
  if (checkout.userId !== userId) {
    return { success: false, error: 'No puede cancelar una reserva que no le pertenece.' };
  }
  if (checkout.estado !== 'reservado') {
    return { success: false, error: 'Solo se pueden cancelar reservas en estado "reservado".' };
  }
  if (!isAtLeast24HoursAway(checkout.fechaRetiro)) {
    return { success: false, error: 'Solo se puede cancelar con al menos 24 horas de anticipacion.' };
  }

  checkout.estado = 'cancelado';
  checkout.updatedAt = new Date().toISOString();
  fileStore.write('checkouts.json', checkouts);

  return { success: true, checkout };
}

function updateStatus(checkoutId, nuevoEstado, notas) {
  const checkouts = getAll();
  const checkout = checkouts.find(item => item.id === checkoutId);

  if (!checkout) {
    return { success: false, error: 'Reserva no encontrada.' };
  }
  if (!VALID_STATES.includes(nuevoEstado)) {
    return { success: false, error: `Estado invalido. Validos: ${VALID_STATES.join(', ')}` };
  }

  const allowed = TRANSITIONS[checkout.estado] || [];
  if (!allowed.includes(nuevoEstado)) {
    return { success: false, error: `No se puede cambiar de "${checkout.estado}" a "${nuevoEstado}".` };
  }

  checkout.estado = nuevoEstado;
  checkout.updatedAt = new Date().toISOString();

  if (notas) {
    checkout.notas = notas;
  }

  fileStore.write('checkouts.json', checkouts);
  syncGearState(checkout, nuevoEstado);

  return { success: true, checkout };
}

function syncGearState(checkout, nuevoEstado) {
  const gear = fileStore.read('gear.json');
  const checkouts = getAll();

  for (const itemId of checkout.items) {
    const gearItem = gear.find(item => item.id === itemId);
    if (!gearItem) continue;

    if (nuevoEstado === 'entregado') {
      gearItem.estado = 'prestado';
      continue;
    }

    if (nuevoEstado === 'reparacion') {
      gearItem.estado = 'mantenimiento';
      continue;
    }

    if (['devuelto_ok', 'devuelto_faltantes', 'cancelado'].includes(nuevoEstado)) {
      const stillDelivered = checkouts.some(other =>
        other.id !== checkout.id &&
        other.estado === 'entregado' &&
        other.items.includes(itemId)
      );

      if (!stillDelivered && gearItem.estado !== 'baja' && gearItem.estado !== 'mantenimiento') {
        gearItem.estado = 'disponible';
      }
    }
  }

  fileStore.write('gear.json', gear);
}

function addNotification(checkoutId, mensaje) {
  const checkouts = getAll();
  const checkout = checkouts.find(item => item.id === checkoutId);

  if (!checkout) {
    return { success: false, error: 'Reserva no encontrada.' };
  }

  const texto = typeof mensaje === 'string' ? mensaje.trim() : '';
  if (!texto) {
    return { success: false, error: 'Mensaje requerido.' };
  }

  if (!Array.isArray(checkout.notificaciones)) {
    checkout.notificaciones = [];
  }

  checkout.notificaciones.push(texto);
  checkout.updatedAt = new Date().toISOString();
  fileStore.write('checkouts.json', checkouts);

  return { success: true, checkout };
}

function getMora() {
  const checkouts = getAll();
  const gear = fileStore.read('gear.json');
  const fechaActual = today();

  return checkouts
    .filter(checkout =>
      ['entregado', 'devuelto_faltantes'].includes(checkout.estado) &&
      checkout.fechaDevolucion < fechaActual
    )
    .map(checkout => {
      const items = checkout.items.map(itemId => {
        const gearItem = gear.find(item => item.id === itemId);
        return gearItem ? gearItem.nombre : itemId;
      });

      return {
        id: checkout.id,
        userId: checkout.userId,
        items,
        fechaRetiro: checkout.fechaRetiro,
        fechaDevolucion: checkout.fechaDevolucion,
        diasVencido: Math.floor((new Date(fechaActual) - new Date(checkout.fechaDevolucion)) / (1000 * 3600 * 24)),
        estado: checkout.estado
      };
    })
    .sort((a, b) => b.diasVencido - a.diasVencido);
}

module.exports = {
  getAll,
  getById,
  getByUser,
  getByDateRange,
  create,
  cancel,
  updateStatus,
  addNotification,
  getMora
};
