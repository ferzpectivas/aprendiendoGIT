const { Router } = require('express');
const checkoutService = require('../services/checkoutService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = Router();

router.use(requireAuth);

router.get('/checkouts', requireRole('panolero'), (req, res) => {
  const { desde, hasta } = req.query;
  res.json(checkoutService.getByDateRange(desde, hasta));
});

router.get('/checkouts/:id', requireRole('panolero'), (req, res) => {
  const checkout = checkoutService.getById(req.params.id);

  if (!checkout) {
    return res.status(404).json({ error: 'Reserva no encontrada.' });
  }

  res.json(checkout);
});

router.put('/checkouts/:id/status', requireRole('panolero'), (req, res) => {
  const { estado, notas } = req.body || {};
  const result = checkoutService.updateStatus(req.params.id, estado, notas);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result.checkout);
});

router.post('/checkouts/:id/notify', requireRole('panolero'), (req, res) => {
  const { mensaje } = req.body || {};
  const result = checkoutService.addNotification(req.params.id, mensaje);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json(result.checkout);
});

router.get('/reportes/mora', requireRole('panolero', 'director'), (req, res) => {
  res.json(checkoutService.getMora());
});

module.exports = router;
