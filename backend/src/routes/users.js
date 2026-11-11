const { Router } = require('express');
const userService = require('../services/userService');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = Router();

router.get('/', requireAuth, requireRole('panolero', 'director'), (req, res) => {
  res.json(userService.getAll().map(userService.sanitize));
});

router.get('/:id', requireAuth, (req, res) => {
  const sessionUser = req.session.user;
  const isStaff = ['panolero', 'director'].includes(sessionUser.rol);

  if (sessionUser.id !== req.params.id && !isStaff) {
    return res.status(403).json({ error: 'No tiene permisos para ver este usuario.' });
  }

  const user = userService.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  res.json(userService.sanitize(user));
});

module.exports = router;
