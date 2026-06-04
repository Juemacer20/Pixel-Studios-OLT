// Sirve metadata de inventario relevada de SmartOLT (zones, ODBs, ONU types, auth presets).
const express = require('express');
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('../middleware/auth');

const META = path.join(__dirname, '..', '..', 'data', 'smartolt-meta.json');
function loadMeta() {
  try { return JSON.parse(fs.readFileSync(META, 'utf8')); }
  catch { return { zones: [], odbs: [], onuTypes: [], speedProfiles: [] }; }
}

function makeRouter(key) {
  const r = express.Router();
  r.use(verifyToken);
  r.get('/', (req, res) => res.json({ data: loadMeta()[key] || [] }));
  return r;
}

module.exports = {
  zones: makeRouter('zones'),
  odbs: makeRouter('odbs'),
  onuTypes: makeRouter('onuTypes'),
  authPresets: (() => { const r = express.Router(); r.use(verifyToken); r.get('/', (req, res) => res.json({ data: [] })); return r; })(),
};
