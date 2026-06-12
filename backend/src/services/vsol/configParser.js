/* ─── VSOL running-config parser ─────────────────────────────────────────────
 * Convierte "show running-config" en un JSON estructurado.
 *
 * Ejemplo:
 *   const parsed = parseRunningConfig(rawConfigText)
 *   parsed.profiles.dba    → [{ id, name, config }]
 *   parsed.onus           → [{ onuId, profile, serial }]
 *   parsed.interfaces     → { gpon: [], gigabitethernet: [], aux: [], vlan: [] }
 */

const SYSLOG_LINE = /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+.*$/gm;

function parseRunningConfig(config) {
  const lines = config
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(SYSLOG_LINE, '')
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.trim());

  const result = {
    hostname: '',
    vlans: [],
    interfaces: { gpon: [], gigabitethernet: [], vlan: [], aux: [] },
    profiles: { dba: [], traffic: [], line: [], srv: [], alarm: [], onu: [] },
    onus: [],        // ONUs by PON port
    system: {},      // misc system settings
  };

  let currentSection = null;
  let currentInterface = null;
  let currentProfile = null;
  let currentPonIndex = null;
  let inOnuSection = false;

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line || line === '!' || line.startsWith('Current configuration:')) continue;

    // Hostname
    if (line.startsWith('hostname ')) {
      result.hostname = line.slice(9).trim();
      continue;
    }

    // VLAN
    if (line.startsWith('vlan ') && !line.startsWith('vlan ')) {
      const m = line.match(/^vlan (\d+)$/);
      if (m) {
        result.vlans.push({ id: parseInt(m[1]), description: '' });
        currentSection = 'vlan';
        continue;
      }
    }
    if (line.startsWith('description ') && currentSection === 'vlan') {
      if (result.vlans.length > 0) {
        result.vlans[result.vlans.length - 1].description = line.slice(12);
      }
      continue;
    }

    // Interface
    const ifaceMatch = line.match(/^interface (gpon|gigabitethernet|vlan|aux)(?:\s+(\S+))?/);
    if (ifaceMatch) {
      if (currentInterface) {
        const type = currentInterface.type;
        if (result.interfaces[type]) {
          result.interfaces[type].push(currentInterface);
        }
      }
      currentInterface = {
        type: ifaceMatch[1],
        slot: ifaceMatch[2] || '',
        lines: [],
        config: {},
      };
      currentSection = 'interface';
      inOnuSection = false;
      continue;
    }
    if (line === 'exit' && currentInterface) {
      // Parse interface config
      _parseInterfaceConfig(currentInterface);
      const type = currentInterface.type;
      if (result.interfaces[type]) {
        result.interfaces[type].push(currentInterface);
      }
      currentInterface = null;
      inOnuSection = false;
      continue;
    }

    // Profiles
    const profileMatch = line.match(/^profile (\w+) id (\d+) name (\S+)/);
    if (profileMatch) {
      currentProfile = {
        type: profileMatch[1],
        id: parseInt(profileMatch[2]),
        name: profileMatch[3],
        lines: [],
        config: {},
      };
      currentSection = 'profile';
      continue;
    }
    if (line === 'commit' && currentProfile) {
      _parseProfileConfig(currentProfile);
      const type = currentProfile.type;
      if (result.profiles[type]) {
        result.profiles[type].push(currentProfile);
      }
      currentProfile = null;
      currentSection = null;
      continue;
    }
    if (line === 'exit' && currentProfile) {
      // If exit without commit, still push
      const type = currentProfile.type;
      if (result.profiles[type]) {
        result.profiles[type].push(currentProfile);
      }
      currentProfile = null;
      currentSection = null;
      continue;
    }

    // ONU add (inside interface gpon section)
    const onuAddMatch = line.match(/^onu add (\d+) profile (\S+) sn (\S+)/);
    if (onuAddMatch) {
      result.onus.push({
        ponIndex: currentPonIndex,
        onuId: parseInt(onuAddMatch[1]),
        profile: onuAddMatch[2],
        serial: onuAddMatch[3],
      });
      inOnuSection = true;
      continue;
    }

    // ONU config lines (onu X ...)
    const onuConfigMatch = line.match(/^onu (\d+) (.+)/);
    if (onuConfigMatch && inOnuSection) {
      // Could parse profile assignments here if needed
      continue;
    }

    // System settings
    if (line.startsWith('snmp-server ')) {
      result.system.snmp = result.system.snmp || [];
      result.system.snmp.push(line);
      continue;
    }
    if (line.startsWith('ntp server ')) {
      result.system.ntp = line.slice(11).trim();
      continue;
    }
    if (line.startsWith('time zone ') || line.startsWith('timezone ')) {
      result.system.timezone = line;
      continue;
    }
    if (line.startsWith('syslog server ')) {
      result.system.syslog = line.slice(14).trim();
      continue;
    }
    if (line.startsWith('user add ')) {
      result.system.users = result.system.users || [];
      result.system.users.push(line);
      continue;
    }
    if (line.startsWith('fan temperature ')) {
      result.system.fanTemp = parseInt(line.slice(15).trim());
      continue;
    }
    if (line.startsWith('ip igmp snooping')) {
      result.system.igmp = result.system.igmp || [];
      result.system.igmp.push(line);
      continue;
    }
    if (line.startsWith('spanning-tree ')) {
      result.system.spanningTree = line.slice(14).trim();
      continue;
    }

    // Accumulate lines for current section
    if (currentInterface) {
      currentInterface.lines.push(line);
      const ipMatch = line.match(/^ip address (\S+) (\S+)/);
      if (ipMatch) {
        currentInterface.config.ip = ipMatch[1];
        currentInterface.config.netmask = ipMatch[2];
      }
      const gwMatch = line.match(/^ip gateway (\S+)/);
      if (gwMatch) currentInterface.config.gateway = gwMatch[1];
    }
    if (currentProfile) {
      currentProfile.lines.push(line);
    }
  }

  // Push last interface if any
  if (currentInterface) {
    _parseInterfaceConfig(currentInterface);
    const type = currentInterface.type;
    if (result.interfaces[type]) {
      result.interfaces[type].push(currentInterface);
    }
  }

  return result;
}

function _parseInterfaceConfig(iface) {
  const lines = iface.lines || [];
  const cfg = iface.config || {};

  for (const line of lines) {
    if (line.startsWith('switchport mode ')) cfg.mode = line.slice(16).trim();
    else if (line.startsWith('switchport hybrid vlan ')) {
      const m = line.match(/vlan (\d+)\s+(\w+)/);
      if (m) {
        cfg.vlans = cfg.vlans || [];
        cfg.vlans.push({ vlan: parseInt(m[1]), tag: m[2] });
      }
    }
    else if (line.startsWith('switchport hybrid pvid vlan ')) cfg.pvid = parseInt(line.slice(27));
    else if (line.startsWith('switchport trunk vlan ')) {
      cfg.trunkVlans = line.slice(21).trim();
    }
    else if (line.startsWith('description ')) cfg.description = line.slice(12);
    else if (line === 'no shutdown') cfg.noShutdown = true;
    else if (line === 'shutdown') cfg.noShutdown = false;
    else if (line.startsWith('storm-control broadcast ')) cfg.stormBroadcast = line.slice(23).trim();
    else if (line.startsWith('switchport isolate')) cfg.isolate = true;
    else if (line.startsWith('no switchport isolate')) cfg.isolate = false;
    else if (line.startsWith('onu auto-learn')) cfg.autoLearn = true;
    else if (line.startsWith('onu auto-learn line-profile')) cfg.autoLearnLine = line.split('name ')[1] || '';
    else if (line.startsWith('onu auto-learn srv-profile')) cfg.autoLearnSrv = line.split('name ')[1] || '';
    else if (line.startsWith('onu auto-learn alarm-profile')) cfg.autoLearnAlarm = line.split('name ')[1] || '';
    else if (line.startsWith('ip address ')) {
      const m = line.match(/ip address (\S+) (\S+)/);
      if (m) { cfg.ip = m[1]; cfg.netmask = m[2]; }
    }
    else if (line.startsWith('ip gateway ')) cfg.gateway = line.slice(11).trim();
  }

  return cfg;
}

function _parseProfileConfig(profile) {
  const lines = profile.lines || [];

  if (profile.type === 'dba') {
    for (const line of lines) {
      const t = line.match(/^type (\d+)/);
      if (t) profile.config.type = parseInt(t[1]);
      const maxM = line.match(/maximum (\d+)/);
      if (maxM) profile.config.maximum = parseInt(maxM[1]);
      const assM = line.match(/assured (\d+)/);
      if (assM) profile.config.assured = parseInt(assM[1]);
      const fixM = line.match(/fixed (\d+)/);
      if (fixM) profile.config.fixed = parseInt(fixM[1]);
      const priM = line.match(/priority (\d+)/);
      if (priM) profile.config.priority = parseInt(priM[1]);
    }
  } else if (profile.type === 'traffic') {
    for (const line of lines) {
      const m = line.match(/sir (\d+) pir (\d+)/);
      if (m) { profile.config.sir = parseInt(m[1]); profile.config.pir = parseInt(m[2]); }
    }
  } else if (profile.type === 'onu') {
    for (const line of lines) {
      const p = line.match(/port-num eth (\d+) veip (\d+)/);
      if (p) { profile.config.eth = parseInt(p[1]); profile.config.veip = parseInt(p[2]); }
      const d = line.match(/^description (.+)/);
      if (d) profile.config.description = d[1];
    }
  } else if (profile.type === 'srv') {
    for (const line of lines) {
      const m = line.match(/portvlan veip (\d+) mode (\S+)/);
      if (m) { profile.config.veip = parseInt(m[1]); profile.config.mode = m[2]; }
    }
  } else if (profile.type === 'alarm') {
    for (const line of lines) {
      const m = line.match(/state (\S+)/);
      if (m) profile.config.state = m[1];
    }
  }

  return profile;
}

module.exports = { parseRunningConfig };
