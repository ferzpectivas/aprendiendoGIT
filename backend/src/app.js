const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const gearRoutes = require('./routes/gear');
const userRoutes = require('./routes/users');
const checkoutRoutes = require('./routes/checkout');
const adminRoutes = require('./routes/admin');
const directorRoutes = require('./routes/director');

const app = express();

app.disable('x-powered-by');

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'cinestock-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/gear', gearRoutes);
app.use('/api/users', userRoutes);
app.use('/api/checkouts', checkoutRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/director', directorRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

module.exports = app;
