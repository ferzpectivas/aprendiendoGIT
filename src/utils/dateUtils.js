function today() {
  return new Date().toISOString().split('T')[0];
}

function isAfterOrEqual(dateA, dateB) {
  return dateA >= dateB;
}

function isBeforeOrEqual(dateA, dateB) {
  return dateA <= dateB;
}

function isAtLeast24HoursAway(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  return (target - new Date()) >= 24 * 60 * 60 * 1000;
}

function overlaps(startA, endA, startB, endB) {
  return startA <= endB && endA >= startB;
}

module.exports = { today, isAfterOrEqual, isBeforeOrEqual, isAtLeast24HoursAway, overlaps };
