const { getSection, applyConfig } = require('../services/oltConfigService');

async function read(req, res, next) {
  try {
    const { section = 'system' } = req.query;
    const data = await getSection(req.params.id, section);
    res.json({ data });
  } catch (err) { next(err); }
}

async function write(req, res, next) {
  try {
    const { section, action, params } = req.body;
    if (!section || !action) return res.status(400).json({ error: 'section and action required' });
    const data = await applyConfig(req.params.id, section, action, params || {});
    res.json({ data });
  } catch (err) { next(err); }
}

module.exports = { read, write };
