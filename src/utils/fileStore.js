const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.CINESTOCK_DATA_DIR
  ? path.resolve(process.env.CINESTOCK_DATA_DIR)
  : path.join(__dirname, '..', 'data');

const cache = {};

function getFilePath(filename) {
  return path.join(DATA_DIR, filename);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function read(filename) {
  if (cache[filename]) {
    return clone(cache[filename]);
  }

  const raw = fs.readFileSync(getFilePath(filename), 'utf-8');
  const data = JSON.parse(raw);
  cache[filename] = clone(data);
  return data;
}

function write(filename, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const filePath = getFilePath(filename);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
    cache[filename] = clone(data);
    return true;
  } catch (error) {
    try {
      fs.unlinkSync(tmpPath);
    } catch (cleanupError) {
      // El archivo temporal pudo no haberse creado.
    }
    throw error;
  }
}

function refreshCache(filename) {
  const raw = fs.readFileSync(getFilePath(filename), 'utf-8');
  cache[filename] = JSON.parse(raw);
}

function resetCache() {
  for (const key of Object.keys(cache)) {
    delete cache[key];
  }
}

module.exports = { read, write, refreshCache, resetCache, DATA_DIR };
