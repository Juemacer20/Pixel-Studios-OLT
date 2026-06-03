const prisma = require('../config/database');
const TelnetSession = require('./vsol/telnetSession');
const logger = require('../middleware/logger');

// Features not available on VSOL V1600G1
const UNSUPPORTED = {
  tr069:  'TR-069 ACS no disponible en VSOL V1600G1',
  gps:    'GPS / ubicación no disponible en VSOL V1600G1',
  radius: 'Autenticación RADIUS no documentada en VSOL V1600G1',
  mpls:   'MPLS/VPN no soportado',
};

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseVlans(raw) {
  const vlans = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\S+)\s+(active|inactive|suspend)\s*(.*)?$/i);
    if (m) vlans.push({ id: parseInt(m[1]), name: m[2], status: m[3], ports: (m[4] || '').trim() });
  }
  return vlans;
}

function parseRoutes(raw) {
  const routes = [];
  for (const line of raw.split('\n')) {
    // "0.0.0.0/0  10.0.30.1  vlan1" or "Destination Mask Gateway Interface"
    const m = line.match(/^\s*(\d+\.\d+\.\d+\.\d+(?:\/\d+)?)\s+(\d+\.\d+\.\d+\.\d+|[-\*])\s*(\S*)/);
    if (m && !line.match(/Destination|---/i)) {
      routes.push({ dest: m[1], gateway: m[2] === '-' || m[2] === '*' ? '' : m[2], iface: m[3] });
    }
  }
  return routes;
}

function parseOnus(raw) {
  const onus = [];
  for (const line of raw.split('\n')) {
    // "ONU  1  SN:HWTC1234ABCD  State:Online  RxPower:-22.5dBm"
    // or tabular: "1  HWTC1234ABCD  Online  -22.5  ..."
    const m1 = line.match(/^\s*(\d+)\s+([A-Z0-9]{8,16})\s+(\w+)\s+([-\d.]+)?/);
    if (m1 && !line.match(/ONU|ID|---/i)) {
      onus.push({ id: parseInt(m1[1]), sn: m1[2], status: m1[3], rx: m1[4] ? parseFloat(m1[4]) : null });
    }
  }
  return onus;
}

function parseDbaProfiles(raw) {
  const profiles = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/Profile\s+DBA\s+(\d+).*name[=:]\s*(\S+).*type[=:]\s*(\d+).*max(?:imum)?[=:]\s*(\d+)/i);
    if (m) profiles.push({ id: parseInt(m[1]), name: m[2], type: parseInt(m[3]), max_kbps: parseInt(m[4]) });
  }
  return profiles;
}

function parseSrvProfiles(raw) {
  const profiles = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/Profile\s+srv\s+(\d+).*name[=:]\s*(\S+)/i);
    if (m) profiles.push({ id: parseInt(m[1]), name: m[2] });
  }
  return profiles;
}

function parseHostname(raw) {
  const m = raw.match(/^hostname\s+(\S+)/m);
  return m ? m[1] : null;
}

function parseSnmp(raw) {
  const community = (raw.match(/snmp-server community (\S+)/i) || [])[1] || '';
  const trapHost  = (raw.match(/snmp-server trap-host (\S+)/i)  || [])[1] || '';
  const contact   = (raw.match(/snmp-server contact (.+)/i)     || [])[1] || '';
  const location  = (raw.match(/snmp-server location (.+)/i)    || [])[1] || '';
  return { community, trapHost, contact, location };
}

// ── Session helper ────────────────────────────────────────────────────────────

async function withSession(olt, fn) {
  const sess = new TelnetSession();
  try {
    await sess.connect(olt);
    await sess.enable(olt);
    return await fn(sess);
  } finally {
    sess.disconnect();
  }
}

// ── Read sections ─────────────────────────────────────────────────────────────

async function getSection(oltId, section) {
  if (UNSUPPORTED[section]) return { supported: false, reason: UNSUPPORTED[section] };

  const olt = await prisma.oLT.findUnique({ where: { id: oltId } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });

  return withSession(olt, async (sess) => {
    switch (section) {

      case 'system': {
        const rc = await sess.run('show running-config');
        return {
          supported: true,
          hostname: parseHostname(rc) || olt.name,
          brand: olt.brand,
          model: olt.model,
          ip: olt.ip,
          raw: rc,
        };
      }

      case 'vlans': {
        const raw = await sess.run('show vlan all');
        return { supported: true, vlans: parseVlans(raw), raw };
      }

      case 'routes': {
        const raw = await sess.run('show ip route');
        return { supported: true, routes: parseRoutes(raw), raw };
      }

      case 'snmp': {
        const rc = await sess.run('show running-config');
        return { supported: true, ...parseSnmp(rc) };
      }

      case 'profiles': {
        const [dba, srv] = await Promise.all([
          sess.run('show profile dba'),
          sess.run('show profile srv'),
        ]);
        return {
          supported: true,
          dba: parseDbaProfiles(dba),
          srv: parseSrvProfiles(srv),
          rawDba: dba,
          rawSrv: srv,
        };
      }

      case 'pon': {
        // Discover how many PON ports exist via SNMP (already in DB as _count)
        const ports = await prisma.pONPort.findMany({ where: { olt_id: oltId } });
        const portNums = ports.length ? ports.map(p => p.port_number) : [1, 2];

        const result = {};
        for (const port of portNums) {
          try {
            await sess.run(`interface gpon 0/${port}`);
            const raw = await sess.run('show onu info');
            await sess.run('exit');
            result[port] = { onus: parseOnus(raw), raw };
          } catch {
            result[port] = { onus: [], raw: '' };
          }
        }
        return { supported: true, ports: result };
      }

      default:
        return { supported: false, reason: `Sección desconocida: ${section}` };
    }
  });
}

// ── Write actions ─────────────────────────────────────────────────────────────

async function applyConfig(oltId, section, action, params = {}) {
  if (UNSUPPORTED[section]) return { supported: false, reason: UNSUPPORTED[section] };

  const olt = await prisma.oLT.findUnique({ where: { id: oltId } });
  if (!olt) throw Object.assign(new Error('OLT not found'), { status: 404 });

  return withSession(olt, async (sess) => {
    let output = '';

    switch (`${section}.${action}`) {

      case 'system.save':
        output = await sess.run('write');
        return { ok: true, output };

      case 'system.hostname':
        await sess.run('configure terminal');
        output = await sess.run(`hostname ${params.hostname}`);
        await sess.run('exit');
        await sess.run('write');
        await prisma.oLT.update({ where: { id: oltId }, data: { name: params.hostname } });
        return { ok: true, output };

      case 'vlans.add':
        await sess.run('configure terminal');
        output = await sess.run(`vlan ${params.vlan_id}`);
        if (params.name) output += await sess.run(`name ${params.name}`);
        await sess.run('exit');
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      case 'vlans.delete':
        await sess.run('configure terminal');
        output = await sess.run(`no vlan ${params.vlan_id}`);
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      case 'routes.add':
        await sess.run('configure terminal');
        output = await sess.run(`ip route ${params.dest} ${params.mask} ${params.gateway}`);
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      case 'routes.delete':
        await sess.run('configure terminal');
        output = await sess.run(`no ip route ${params.dest} ${params.mask} ${params.gateway}`);
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      case 'snmp.set':
        await sess.run('configure terminal');
        if (params.community) output += await sess.run(`snmp-server community read-only ${params.community}`);
        if (params.trapHost)  output += await sess.run(`snmp-server trap-host ${params.trapHost}`);
        if (params.contact)   output += await sess.run(`snmp-server contact ${params.contact}`);
        if (params.location)  output += await sess.run(`snmp-server location ${params.location}`);
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      case 'profiles.dba.add':
        await sess.run('configure terminal');
        output = await sess.run(`profile dba id ${params.id} name ${params.name}`);
        output += await sess.run(`type ${params.type || 4} maximum ${params.max_kbps}`);
        output += await sess.run('commit');
        output += await sess.run('exit');
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      case 'profiles.dba.delete':
        await sess.run('configure terminal');
        output = await sess.run(`no profile dba id ${params.id}`);
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      case 'pon.onu_reboot':
        await sess.run(`interface gpon 0/${params.port}`);
        output = await sess.run(`onu reboot ${params.onu_id}`);
        await sess.run('exit');
        return { ok: true, output };

      case 'pon.onu_description':
        await sess.run('configure terminal');
        await sess.run(`interface gpon 0/${params.port}`);
        output = await sess.run(`onu description ${params.onu_id} ${params.description}`);
        await sess.run('exit');
        await sess.run('exit');
        await sess.run('write');
        return { ok: true, output };

      default:
        return { ok: false, error: `Acción desconocida: ${section}.${action}` };
    }
  });
}

module.exports = { getSection, applyConfig };
