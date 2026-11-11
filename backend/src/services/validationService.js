const fileStore = require('../utils/fileStore');
const { today, overlaps } = require('../utils/dateUtils');

const ACTIVE_STATES = ['reservado', 'entregado'];

function validateCartSize(items) {
  if (!Array.isArray(items)) {
    return { valid: false, error: 'Formato de items invalido.' };
  }
  if (items.length === 0) {
    return { valid: false, error: 'Debe seleccionar al menos un equipo.' };
  }
  if (items.length > 5) {
    return { valid: false, error: 'Maximo 5 equipos por reserva.' };
  }
  if (new Set(items).size !== items.length) {
    return { valid: false, error: 'No se puede repetir un equipo en la misma reserva.' };
  }
  return { valid: true };
}

function validateGearAccess(user, gearItem) {
  const anioMinimo = Number(gearItem.anioMinimo) || 0;

  if (user.anio < anioMinimo) {
    const tipo = gearItem.gama === 'premium' ? ' premium' : '';
    return {
      valid: false,
      error: `El equipo "${gearItem.nombre}"${tipo} requiere ser alumno de ${anioMinimo} anio o superior.`
    };
  }

  return { valid: true };
}

function validateGearAvailable(gearItem) {
  if (gearItem.estado === 'baja') {
    return { valid: false, error: `El equipo "${gearItem.nombre}" esta dado de baja.` };
  }
  if (gearItem.estado === 'mantenimiento') {
    return { valid: false, error: `El equipo "${gearItem.nombre}" esta en mantenimiento.` };
  }
  if (gearItem.estado === 'prestado') {
    return { valid: false, error: `El equipo "${gearItem.nombre}" ya esta prestado actualmente.` };
  }
  return { valid: true };
}

function validateDates(fechaRetiro, fechaDevolucion) {
  if (!fechaRetiro || !fechaDevolucion) {
    return { valid: false, error: 'Debe indicar fecha de retiro y devolucion.' };
  }
  if (fechaRetiro < today()) {
    return { valid: false, error: 'La fecha de retiro no puede ser anterior a hoy.' };
  }
  if (fechaDevolucion <= fechaRetiro) {
    return { valid: false, error: 'La fecha de devolucion debe ser posterior a la de retiro.' };
  }
  return { valid: true };
}

function validateDateConflict(gearId, fechaRetiro, fechaDevolucion, excludeCheckoutId) {
  const checkouts = fileStore.read('checkouts.json');

  const conflict = checkouts.some(checkout => {
    if (excludeCheckoutId && checkout.id === excludeCheckoutId) return false;
    if (!ACTIVE_STATES.includes(checkout.estado)) return false;
    if (!checkout.items.includes(gearId)) return false;
    return overlaps(fechaRetiro, fechaDevolucion, checkout.fechaRetiro, checkout.fechaDevolucion);
  });

  if (conflict) {
    return { valid: false, error: 'El equipo ya esta reservado para las fechas seleccionadas.' };
  }

  return { valid: true };
}

function validateAll(user, items, fechaRetiro, fechaDevolucion) {
  const sizeCheck = validateCartSize(items);
  if (!sizeCheck.valid) return sizeCheck;

  const gearList = fileStore.read('gear.json');

  for (const gearId of items) {
    const gearItem = gearList.find(item => item.id === gearId);

    if (!gearItem) {
      return { valid: false, error: `Equipo ${gearId} no encontrado.` };
    }

    const availableCheck = validateGearAvailable(gearItem);
    if (!availableCheck.valid) return availableCheck;

    const accessCheck = validateGearAccess(user, gearItem);
    if (!accessCheck.valid) return accessCheck;

    const dateCheck = validateDates(fechaRetiro, fechaDevolucion);
    if (!dateCheck.valid) return dateCheck;

    const conflictCheck = validateDateConflict(gearId, fechaRetiro, fechaDevolucion);
    if (!conflictCheck.valid) return conflictCheck;
  }

  return { valid: true };
}

module.exports = {
  validateCartSize,
  validateGearAccess,
  validateGearAvailable,
  validateDates,
  validateDateConflict,
  validateAll
};
