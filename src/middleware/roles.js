function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!roles.includes(req.session.user.rol)) {
      return res.status(403).json({ error: 'No tiene permisos para esta operacion.' });
    }
    next();
  };
}

module.exports = { requireRole };
