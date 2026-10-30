const { Router } = require('express');
const userService = require('../services/userService');

const router = Router();

router.post('/login', (req, res) => {
  const { matricula, password } = req.body || {};

  if (!matricula || !password) {
    return res.status(400).json({ error: 'Matricula y contrasena son requeridas.' });
  }

  const user = userService.findByMatricula(String(matricula).trim());

  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Matricula o contrasena incorrecta.' });
  }

  req.session.user = userService.sanitize(user);

  res.json({
    user: req.session.user,
    message: 'Inicio de sesion exitoso.'
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(error => {
    if (error) {
      return res.status(500).json({ error: 'Error al cerrar sesion.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesion cerrada.' });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }
  res.json({ user: req.session.user });
});

module.exports = router;
