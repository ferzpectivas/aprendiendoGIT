const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`CineStock corriendo en http://localhost:${PORT}`);
});

module.exports = server;
