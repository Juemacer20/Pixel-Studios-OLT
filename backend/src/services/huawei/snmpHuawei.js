const snmpConfig = require('../../config/snmp');
const { parseCounter, parseDbm } = require('../../utils/snmpParser');
const logger = require('../../middleware/logger');

const OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  hwCpuDevUsage: '1.3.6.1.4.1.2011.6.3.4.1.4',
  hwOpticalTemperature: '1.3.6.1.4.1.2011.6.3.8.1.5',
  hwGponOntSn: '1.3.6.1.4.1.2011.6.128.1.1.2.1',
  hwGponOntOperState: '1.3.6.1.4.1.2011.6.128.1.1.2.10',
  hwGponOntDescription: '1.3.6.1.4.1.2011.6.128.1.1.2.7',
  hwGponOntOpticalRxPower: '1.3.6.1.4.1.2011.6.128.1.1.2.51',
  hwGponOntOpticalTxPower: '1.3.6.1.4.1.2011.6.128.1.1.2.52',
  ifInOctets: '1.3.6.1.2.1.2.2.1.10',
  ifOutOctets: '1.3.6.1.2.1.2.2.1.16',
  ifOperStatus: '1.3.6.1.2.1.2.2.1.8',
};

class SNMPHuawei {
  constructor(olt) {
    this.olt = olt;
    this.session = null;
  }

  connect() {
    this.session = snmpConfig.createSession(this.olt.ip, this.olt.community || 'public');
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
      const vbs = await snmpConfig.walk(this.session, OIDS.hwCpuDevUsage);
      if (!vbs.length) return null;
      const values = vbs.map(vb => parseCounter(vb)).filter(v => v > 0);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    } catch (err) {
      return null;
    }
  }

  async getTemperature() {
    if (!this.session) this.connect();
    try {
      const vbs = await snmpConfig.walk(this.session, OIDS.hwOpticalTemperature);
      return vbs.length ? parseCounter(vbs[0]) : null;
    } catch (err) {
      return null;
    }
  }

  async listONTsBySNMP() {
    if (!this.session) this.connect();
    try {
      const [snWalk, stateWalk, rxWalk] = await Promise.all([
        snmpConfig.walk(this.session, OIDS.hwGponOntSn),
        snmpConfig.walk(this.session, OIDS.hwGponOntOperState),
        snmpConfig.walk(this.session, OIDS.hwGponOntOpticalRxPower),
      ]);
      return snWalk.map((snVb, idx) => {
        const parts = snVb.oid.split('.');
        const ontIndex = parts[parts.length - 1];
        const sn = Buffer.isBuffer(snVb.value) ? snVb.value.toString('hex').toUpperCase() : String(snVb.value || '');
        const state = stateWalk[idx] ? parseCounter(stateWalk[idx]) : 0;
        const rx = rxWalk[idx] ? parseDbm(parseCounter(rxWalk[idx]), 100) : null;
        return { ontIndex, serial_number: sn, status: state === 1 ? 'ONLINE' : 'OFFLINE', rx_power: rx };
      });
    } catch (err) {
      logger.error(`listONTs SNMP ${this.olt.ip}: ${err.message}`);
      return [];
    }
  }

  async getONTSignal(ontIndex) {
    if (!this.session) this.connect();
    try {
      const rxOID = `${OIDS.hwGponOntOpticalRxPower}.${ontIndex}`;
      const txOID = `${OIDS.hwGponOntOpticalTxPower}.${ontIndex}`;
      const result = await snmpConfig.get(this.session, [rxOID, txOID]);
      return {
        rx_power: result[rxOID] != null ? parseDbm(result[rxOID], 100) : null,
        tx_power: result[txOID] != null ? parseDbm(result[txOID], 100) : null,
      };
    } catch (err) {
      return { rx_power: null, tx_power: null };
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
