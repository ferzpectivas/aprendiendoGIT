function nextId(prefix, items) {
  const max = items.reduce((accumulator, item) => {
    const match = String(item.id || '').match(/(\d+)$/);
    return match ? Math.max(accumulator, Number(match[1])) : accumulator;
  }, 0);

  return prefix + String(max + 1).padStart(3, '0');
}

module.exports = { nextId };
