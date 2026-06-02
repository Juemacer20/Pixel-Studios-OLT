function parseOID(varbind) {
  if (!varbind) return null;
  if (Buffer.isBuffer(varbind.value)) return varbind.value.toString('utf8').replace(/\x00/g, '');
  if (typeof varbind.value === 'object' && varbind.value !== null) return varbind.value.toString();
  return varbind.value;
}

function parseCounter(varbind) {
  if (!varbind) return 0;
  return typeof varbind.value === 'number' ? varbind.value : parseInt(varbind.value) || 0;
}

function parseHex(buffer) {
  if (!Buffer.isBuffer(buffer)) return '';
  return buffer.toString('hex').match(/.{1,2}/g)?.join(':').toUpperCase() || '';
}

function parseDbm(rawValue, divisor = 100) {
  const num = typeof rawValue === 'number' ? rawValue : parseInt(rawValue);
  if (isNaN(num)) return null;
  return num / divisor;
}

module.exports = { parseOID, parseCounter, parseHex, parseDbm };
