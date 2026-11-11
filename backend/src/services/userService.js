const fileStore = require('../utils/fileStore');

function getAll() {
  return fileStore.read('users.json');
}

function sanitize(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function findByMatricula(matricula) {
  return getAll().find(user => user.matricula === matricula) || null;
}

function findById(id) {
  return getAll().find(user => user.id === id) || null;
}

module.exports = { getAll, sanitize, findByMatricula, findById };
