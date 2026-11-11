const { Router } = require('express');
const gearService = require('../services/gearService');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const gear = gearService.getAll(req.query);
  res.json(gear.map(item => ({
    ...item,
    ocupiedDates: gearService.getOcupiedDates(item.id)
  })));
});

router.get('/:id', requireAuth, (req, res) => {
  const gearItem = gearService.getById(req.params.id);

  if (!gearItem) {
    return res.status(404).json({ error: 'Equipo no encontrado.' });
  }

  res.json({
    ...gearItem,
    ocupiedDates: gearService.getOcupiedDates(gearItem.id)
  });
});

module.exports = router;
