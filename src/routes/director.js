const { Router } = require('express');
const gearService = require('../services/gearService');
const checkoutService = require('../services/checkoutService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = Router();

router.use(requireAuth, requireRole('director'));

function buildCategoryStats(gear) {
  const porCategoria = {};

  for (const item of gear) {
    if (!porCategoria[item.categoria]) {
      porCategoria[item.categoria] = {
        total: 0,
        disponibles: 0,
        prestados: 0,
        mantenimiento: 0,
        baja: 0
      };
    }

    const categoria = porCategoria[item.categoria];
    categoria.total++;

    if (item.estado === 'disponible') categoria.disponibles++;
    else if (item.estado === 'prestado') categoria.prestados++;
    else if (item.estado === 'mantenimiento') categoria.mantenimiento++;
    else if (item.estado === 'baja') categoria.baja++;
  }

  return porCategoria;
}

function buildDashboard() {
  const gear = gearService.getAll({});

  return {
    stats: gearService.getStats(),
    mostDemanded: gearService.getMostDemanded(10),
    demandaPorEquipo: gearService.getDemandCounts(),
    mora: checkoutService.getMora(),
    porCategoria: buildCategoryStats(gear),
    equiposFueraServicio: gear
      .filter(item => ['mantenimiento', 'baja'].includes(item.estado))
      .map(item => ({
        id: item.id,
        codigoBarras: item.codigoBarras,
        nombre: item.nombre,
        categoria: item.categoria,
        estado: item.estado
      }))
  };
}

router.get('/dashboard', (req, res) => {
  res.json(buildDashboard());
});

router.get('/reportes', (req, res) => {
  const checkouts = checkoutService.getAll();
  const dashboard = buildDashboard();

  res.json({
    generatedAt: new Date().toISOString(),
    stats: dashboard.stats,
    mostDemanded: gearService.getMostDemanded(999),
    demandaPorEquipo: gearService.getDemandCounts(),
    porCategoria: dashboard.porCategoria,
    equiposFueraServicio: dashboard.equiposFueraServicio,
    totalReservas: checkouts.length,
    reservasActivas: checkouts.filter(checkout =>
      ['reservado', 'entregado'].includes(checkout.estado)
    ).length
  });
});

module.exports = router;
