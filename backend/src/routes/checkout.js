const { Router } = require('express');
const checkoutService = require('../services/checkoutService');
const gearService = require('../services/gearService');
const userService = require('../services/userService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = Router();

function enrich(checkouts) {
  const usersById = new Map(userService.getAll().map(user => [user.id, user]));
  const gearById = new Map(gearService.getAll().map(item => [item.id, item]));

  return checkouts.map(checkout => ({
    ...checkout,
    usuario: userService.sanitize(usersById.get(checkout.userId)) || null,
    equipos: checkout.items
      .map(itemId => gearById.get(itemId))
      .filter(Boolean)
      .map(item => ({
        id: item.id,
        nombre: item.nombre,
        codigoBarras: item.codigoBarras,
        estado: item.estado
      }))
  }));
}

router.get('/', requireAuth, (req, res) => {
  const user = req.session.user;
  const checkouts = user.rol === 'alumno'
    ? checkoutService.getByUser(user.id)
    : checkoutService.getAll();

  res.json(enrich(checkouts));
});

router.get('/:id', requireAuth, (req, res) => {
  const checkout = checkoutService.getById(req.params.id);
  const user = req.session.user;

  if (!checkout) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }

  if (user.rol === 'alumno' && checkout.userId !== user.id) {
    return res.status(403).json({ error: 'No tiene permisos para ver esta reserva.' });
  }

  res.json(enrich([checkout])[0]);
});

router.post('/', requireAuth, requireRole('alumno'), (req, res) => {
  const { items, fechaRetiro, fechaDevolucion } = req.body || {};
  const result = checkoutService.create(req.session.user, items, fechaRetiro, fechaDevolucion);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json(enrich([result.checkout])[0]);
});

router.delete('/:id', requireAuth, requireRole('alumno'), (req, res) => {
  const result = checkoutService.cancel(req.params.id, req.session.user.id);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(enrich([result.checkout])[0]);
});

module.exports = router;
