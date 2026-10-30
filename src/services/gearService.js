const fileStore = require('../utils/fileStore');
const { today } = require('../utils/dateUtils');
function getAll(filters) {
  let gear = fileStore.read('gear.json');

  if (filters) {
    if (filters.categoria) {
      gear = gear.filter(item => item.categoria === filters.categoria);
    }
    if (filters.estado) {
      gear = gear.filter(item => item.estado === filters.estado);
    }
    if (filters.gama) {
      gear = gear.filter(item => item.gama === filters.gama);
    }
    if (filters.busqueda) {
      const query = String(filters.busqueda).toLowerCase();
      gear = gear.filter(item =>
        item.nombre.toLowerCase().includes(query) ||
        item.codigoBarras.toLowerCase().includes(query) ||
        item.categoria.toLowerCase().includes(query)
      );
    }
    if (filters.disponible === 'true') {
      gear = gear.filter(item => item.estado === 'disponible');
    }
  }

  return gear;
}

function getById(id) {
  return fileStore.read('gear.json').find(item => item.id === id) || null;
}

function getOcupiedDates(gearId) {
  const checkouts = fileStore.read('checkouts.json');
  const fechaActual = today();

  return checkouts
    .filter(checkout =>
      checkout.items.includes(gearId) &&
      ['reservado', 'entregado', 'reparacion'].includes(checkout.estado) &&
      checkout.fechaDevolucion >= fechaActual
    )
    .map(checkout => ({
      fechaRetiro: checkout.fechaRetiro,
      fechaDevolucion: checkout.fechaDevolucion,
      checkoutId: checkout.id
    }));
}

function getStats() {
  const gear = fileStore.read('gear.json');
  const checkouts = fileStore.read('checkouts.json');
  const fechaActual = today();

  const enUso = checkouts.filter(checkout =>
    ['reservado', 'entregado'].includes(checkout.estado) &&
    checkout.fechaRetiro <= fechaActual &&
    checkout.fechaDevolucion >= fechaActual
  ).length;

  const enMora = checkouts.filter(checkout =>
    ['entregado', 'devuelto_faltantes'].includes(checkout.estado) &&
    checkout.fechaDevolucion < fechaActual
  ).length;

  return {
    total: gear.length,
    disponibles: gear.filter(item => item.estado === 'disponible').length,
    prestados: gear.filter(item => item.estado === 'prestado').length,
    mantenimiento: gear.filter(item => item.estado === 'mantenimiento').length,
    baja: gear.filter(item => item.estado === 'baja').length,
    enUso,
    enMora
  };
}

function getDemandCounts() {
  const checkouts = fileStore.read('checkouts.json');
  const counts = {};

  for (const checkout of checkouts) {
    if (checkout.estado === 'cancelado') continue;

    for (const itemId of checkout.items) {
      counts[itemId] = (counts[itemId] || 0) + 1;
    }
  }

  return counts;
}

function getMostDemanded(limit) {
  const gear = fileStore.read('gear.json');
  const counts = getDemandCounts();

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit || 10)
    .map(([id, count]) => {
      const item = gear.find(equipo => equipo.id === id);
      return {
        id,
        nombre: item ? item.nombre : 'Desconocido',
        categoria: item ? item.categoria : null,
        estado: item ? item.estado : null,
        vecesReservado: count
      };
    });
}

module.exports = {
  getAll,
  getById,
  getOcupiedDates,
  getStats,
  getDemandCounts,
  getMostDemanded
};
