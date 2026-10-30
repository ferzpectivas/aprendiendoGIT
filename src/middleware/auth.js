function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'No autenticado. Inicie sesion primero.' });
  }
  next();
}

module.exports = { requireAuth };
