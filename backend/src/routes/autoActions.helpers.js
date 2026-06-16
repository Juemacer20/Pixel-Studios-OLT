function parseJsonArray(val) {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return null; }
}

function parsePresetFields(body) {
  return {
    ...body,
    olts:   parseJsonArray(body.olts),
    boards: parseJsonArray(body.boards),
    ports:  parseJsonArray(body.ports),
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
  };
}

function formatPresetForDisplay(preset) {
  const olts = parseJsonArray(preset.olts);
  const oltLabel = !olts || olts.length === 0 ? 'All OLTs' : `${olts.length} OLT${olts.length > 1 ? 's' : ''}`;
  return {
    ...preset,
    oltLabel,
    statusLabel: preset.isActive ? 'Active' : 'Inactive',
  };
}

module.exports = { parsePresetFields, formatPresetForDisplay };
