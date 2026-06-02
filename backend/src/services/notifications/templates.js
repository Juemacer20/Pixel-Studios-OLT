function losTemplate(ont, client) {
  return `<h2>🔴 LOS Alert</h2><p>ONT: ${ont.serial_number}</p><p>Client: ${client?.name || 'Unknown'}</p>`;
}
function cpuHighTemplate(olt) {
  return `<h2>⚠️ CPU Alert</h2><p>OLT: ${olt.name}</p><p>CPU: ${olt.cpu_usage}%</p>`;
}
module.exports = { losTemplate, cpuHighTemplate };
