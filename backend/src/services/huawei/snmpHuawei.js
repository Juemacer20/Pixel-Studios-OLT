const snmpConfig = require('../../config/snmp');
const { parseCounter, parseDbm } = require('../../utils/snmpParser');
const logger = require('../../middleware/logger');

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

const OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  hwCpuDevUsage: '1.3.6.1.4.1.2011.2.6.7.1.1.2.1.5',
  hwOpticalTemperature: '1.3.6.1.4.1.2011.2.6.7.1.1.2.1.6',
  // Inventario de ONTs (hwGponDeviceOntInfoTable .43) + DDM óptica (.51).
  // OIDs validados empíricamente en MA5800-X15 (firmware R018).
  ontSn:      '1.3.6.1.4.1.2011.6.128.1.1.2.43.1.3',  // serial: 4 bytes ASCII (vendor) + 4 bytes hex
  ontDescr:   '1.3.6.1.4.1.2011.6.128.1.1.2.43.1.9',  // descripción SmartOLT (cliente/zona/odb)
  ontDdmTemp: '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.1',  // temperatura °C
  ontDdmRx:   '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4',  // RX power ×100 dBm (SNMP_NA => sin señal/offline)
  ifInOctets: '1.3.6.1.2.1.2.2.1.10',
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
  ifDescr: '1.3.6.1.2.1.2.2.1.2',
};

// ifIndex del puerto GPON = 0xFA000000 + slot*0x2000 + port*0x100 (frame 0). Validado en MA5800-X15.
const GPON_IFINDEX_BASE = 0xFA000000;
const SNMP_NA = 2147483647; // sentinela "sin valor" de Huawei (óptica de ONT offline)

// índice SNMP "<ifIndex>.<ontId>" -> { iface: "0/slot/port:ontId", slot, port, ontId }
function decodeOntIndex(suffix) {
  const dot = suffix.lastIndexOf('.');
  const ifIndex = parseInt(suffix.slice(0, dot), 10);
  const ontId = parseInt(suffix.slice(dot + 1), 10);
  const rel = ifIndex - GPON_IFINDEX_BASE;
  const slot = Math.floor(rel / 0x2000);
  const port = Math.floor((rel % 0x2000) / 0x100);
  return { iface: `0/${slot}/${port}:${ontId}`, slot, port, ontId };
}

// Serial Huawei: 4 bytes ASCII (vendor) + 4 bytes hex. Ej. "HWTC" + "3A448F93".
// Si el vendor no es ASCII imprimible (bytes 0x00 etc.), se usa hex para evitar
// strings con bytes nulos que rompen el insert en Postgres (UTF8).
function decodeHuaweiSN(v) {
  if (!Buffer.isBuffer(v)) return String(v || '').replace(/\u0000/g, '');
  if (v.length >= 8) {
    const vendor = v.slice(0, 4);
    const printable = vendor.every((b) => b >= 0x20 && b <= 0x7e);
    const head = printable ? vendor.toString('ascii') : vendor.toString('hex').toUpperCase();
    return head + v.slice(4, 8).toString('hex').toUpperCase();
  }
  return v.toString('hex').toUpperCase();
}

// inverso de decodeOntIndex: (slot,port,ontId) -> "<ifIndex>.<ontId>"
function encodeOntIndex(slot, port, ontId) {
  const ifIndex = GPON_IFINDEX_BASE + Number(slot) * 0x2000 + Number(port) * 0x100;
  return `${ifIndex}.${ontId}`;
}

// Heurística: ¿la interfaz parece un uplink (no PON/internal)?
function isUplinkDescr(descr) {
  if (!descr) return false;
  const d = descr.toLowerCase();
  if (/gpon|epon|pon|vlanif|null|inloop|meth|virtual/.test(d)) return false;
  return /(^|\W)(xge|10ge|40ge|100ge|ge|eth|uplink|trunk)/.test(d);
}

class SNMPHuawei {
  constructor(olt) {
    this.olt = olt;
    this.session = null;
  }

  connect() {
    // La community de lectura se carga en la columna `snmp_read`; `community`
    // suele quedar en su default 'public' (que no responde). Preferir snmp_read.
    const readCommunity = this.olt.snmp_read || this.olt.community || 'public';
    this.session = snmpConfig.createSession(this.olt.ip, readCommunity);
    return this;
  }

  disconnect() {
    if (this.session) {
      try { this.session.close(); } catch (e) {}
      this.session = null;
    }
  }

  async getSystemInfo() {
    if (!this.session) this.connect();
    try {
      const result = await snmpConfig.get(this.session, [OIDS.sysDescr, OIDS.sysUpTime, OIDS.sysName]);
      return {
        description: result[OIDS.sysDescr]?.toString() || '',
        uptime: parseInt(result[OIDS.sysUpTime]) || 0,
        name: result[OIDS.sysName]?.toString() || this.olt.name,
      };
    } catch (err) {
      logger.error(`SNMP getSystemInfo ${this.olt.ip}: ${err.message}`);
      return null;
    }
  }

  async getCPUUsage() {
    if (!this.session) this.connect();
    try {
      // net-snmp walk over-returns past the column — clip to the exact OID prefix
      const prefix = OIDS.hwCpuDevUsage + '.';
      const vbs = await snmpConfig.walk(this.session, OIDS.hwCpuDevUsage);
      const values = vbs
        .filter(vb => vb.oid.startsWith(prefix) && typeof vb.value === 'number')
        .map(vb => vb.value)
        .filter(v => v >= 0 && v < 100);
      return values.length ? median(values) : null;
    } catch (err) {
      return null;
    }
  }

  async getTemperature() {
    if (!this.session) this.connect();
    try {
      const prefix = OIDS.hwOpticalTemperature + '.';
      const vbs = await snmpConfig.walk(this.session, OIDS.hwOpticalTemperature);
      const values = vbs
        .filter(vb => vb.oid.startsWith(prefix) && typeof vb.value === 'number')
        .map(vb => vb.value)
        .filter(v => v > 0 && v < 100);
      return values.length ? median(values) : null;
    } catch (err) {
      return null;
    }
  }

  // Inventario de ONTs por SNMP (RAPIDO): camina solo la tabla de seriales (.43.1.3)
  // y decodifica el ifIndex a slot/puerto. NO trae optica: la tabla DDM (.51) es
  // lentisima en este OLT (~5 ONTs/s); la optica se obtiene por telnet (hibrido).
  // Devuelve TODAS las ONTs provisionadas (incluye offline) con serial e interface.
  async listInventoryBySNMP() {
    if (!this.session) this.connect();
    try {
      const snWalk = await snmpConfig.walk(this.session, OIDS.ontSn, 120000);
      const base = OIDS.ontSn.length + 1;
      return snWalk.map((vb) => {
        const ix = vb.oid.slice(base);
        const d = decodeOntIndex(ix);
        return { ontIndex: ix, serial_number: decodeHuaweiSN(vb.value), interface: d.iface, slot: d.slot, port: d.port, ontId: d.ontId };
      }).filter((o) => o.serial_number);
    } catch (err) {
      logger.error(`listInventoryBySNMP ${this.olt.ip}: ${err.message}`);
      return [];
    }
  }

  // Trae SOLO la descripcion SmartOLT (.43.1.9: cliente/zona/ODB) por SNMP, con GETs
  // puntuales por lote, para ONTs ya descubiertas por telnet. La tabla .43 es rapida.
  // (La optica .51 NO se trae por SNMP: es lentisima; eso va por telnet.)
  // items: [{slot,port,ontId}] -> Map "slot/port/ontId" -> descripcion(string|null)
  async getDescriptionsForOnts(items) {
    if (!this.session) this.connect();
    const out = new Map();
    const BATCH = 3; // strings de descripcion largos: lotes muy chicos para no exceder el PDU UDP (~1472b)
    for (let i = 0; i < items.length; i += BATCH) {
      const slice = items.slice(i, i + BATCH);
      const oids = slice.map((it) => `${OIDS.ontDescr}.${encodeOntIndex(it.slot, it.port, it.ontId)}`);
      let r = {};
      try { r = await snmpConfig.get(this.session, oids); } catch (e) { r = {}; }
      for (const it of slice) {
        const v = r[`${OIDS.ontDescr}.${encodeOntIndex(it.slot, it.port, it.ontId)}`];
        out.set(`${it.slot}/${it.port}/${it.ontId}`, Buffer.isBuffer(v) ? v.toString('utf8').replace(/\u0000/g, '') : (v ? String(v) : null));
      }
    }
    return out;
  }

  async getONTSignal(ontIndex) {
    if (!this.session) this.connect();
    try {
      const rxOID = `${OIDS.ontDdmRx}.${ontIndex}`;
      const result = await snmpConfig.get(this.session, [rxOID]);
      const raw = result[rxOID];
      return {
        rx_power: (raw == null || Number(raw) === SNMP_NA) ? null : Number(raw) / 100,
        tx_power: null, // TX no expuesto de forma fiable por SNMP en este firmware
      };
    } catch (err) {
      return { rx_power: null, tx_power: null };
    }
  }

  // Lee contadores de octetos por interfaz (para gráficos de tráfico/uplink).
  // Devuelve [{ ifIndex, descr, inOctets, outOctets, isUplink }].
  async getInterfaceTraffic() {
    try {
      const [descrs, inO, outO] = await Promise.all([
        snmpConfig.walk(this.session, OIDS.ifDescr),
        snmpConfig.walk(this.session, OIDS.ifInOctets),
        snmpConfig.walk(this.session, OIDS.ifOutOctets),
      ]);
      const idxOf = (oid, base) => oid.replace(base + '.', '');
      const dMap = {}; for (const vb of descrs) dMap[idxOf(vb.oid, OIDS.ifDescr)] = String(vb.value);
      const inMap = {}; for (const vb of inO) inMap[idxOf(vb.oid, OIDS.ifInOctets)] = Number(parseCounter(vb.value));
      const outMap = {}; for (const vb of outO) outMap[idxOf(vb.oid, OIDS.ifOutOctets)] = Number(parseCounter(vb.value));
      const rows = [];
      for (const idx of Object.keys(inMap)) {
        const descr = dMap[idx] || `if${idx}`;
        rows.push({ ifIndex: parseInt(idx), descr, inOctets: inMap[idx] || 0, outOctets: outMap[idx] || 0, isUplink: isUplinkDescr(descr) });
      }
      return rows;
    } catch (e) {
      logger.error(`getInterfaceTraffic ${this.olt.ip}: ${e.message}`);
      return [];
    }
  }

  async getPortStats(portId) {
    if (!this.session) this.connect();
    try {
      const inOID = `${OIDS.ifInOctets}.${portId}`;
      const outOID = `${OIDS.ifOutOctets}.${portId}`;
      const statusOID = `${OIDS.ifOperStatus}.${portId}`;
      const result = await snmpConfig.get(this.session, [inOID, outOID, statusOID]);
      return { portId, inOctets: result[inOID] || 0, outOctets: result[outOID] || 0, status: result[statusOID] === 1 ? 'up' : 'down' };
    } catch (err) {
      return { portId, error: err.message };
    }
  }
}

module.exports = SNMPHuawei;
module.exports.OIDS = OIDS;
