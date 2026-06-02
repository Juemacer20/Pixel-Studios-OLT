const snmpConfig = require('../../config/snmp');
const { parseCounter, parseDbm } = require('../../utils/snmpParser');
const logger = require('../../middleware/logger');

const OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  cpuUsage: '1.3.6.1.4.1.38848.2.1.2.1.5',
  temperature: '1.3.6.1.4.1.38848.2.1.2.1.6',
  ontSN: '1.3.6.1.4.1.38848.2.2.1.1.1',
  ontStatus: '1.3.6.1.4.1.38848.2.2.1.1.2',
  ontRxPower: '1.3.6.1.4.1.38848.2.2.1.1.10',
  ontTxPower: '1.3.6.1.4.1.38848.2.2.1.1.11',
};

class KingType {
  constructor(olt) {
    this.olt = olt;
    this.session = null;
  }

  async connect() {
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
    if (!this.session) await this.connect();
    try {
      const result = await snmpConfig.get(this.session, [OIDS.sysDescr, OIDS.sysUpTime]);
      return {
        description: result[OIDS.sysDescr]?.toString() || 'KingType OLT',
        uptime: parseInt(result[OIDS.sysUpTime]) || 0,
        name: this.olt.name,
      };
    } catch (err) {
      logger.error(`KingType getSystemInfo ${this.olt.ip}: ${err.message}`);
      return { description: 'KingType OLT', uptime: 0, name: this.olt.name };
    }
  }

  async listONTs() {
    if (!this.session) await this.connect();
    try {
      const [snWalk, statusWalk, rxWalk] = await Promise.all([
        snmpConfig.walk(this.session, OIDS.ontSN),
        snmpConfig.walk(this.session, OIDS.ontStatus),
        snmpConfig.walk(this.session, OIDS.ontRxPower),
      ]);
      return snWalk.map((vb, idx) => ({
        ontIndex: idx,
        serial_number: Buffer.isBuffer(vb.value) ? vb.value.toString('hex').toUpperCase() : String(vb.value || ''),
        status: statusWalk[idx] && parseCounter(statusWalk[idx]) === 1 ? 'ONLINE' : 'OFFLINE',
        rx_power: rxWalk[idx] ? parseDbm(parseCounter(rxWalk[idx]), 100) : null,
      }));
    } catch (err) {
      logger.error(`KingType listONTs: ${err.message}`);
      return [];
    }
  }

  async getONTSignal(ontId) {
    if (!this.session) await this.connect();
    try {
      const rxOID = `${OIDS.ontRxPower}.${ontId}`;
      const txOID = `${OIDS.ontTxPower}.${ontId}`;
      const result = await snmpConfig.get(this.session, [rxOID, txOID]);
      return {
        rx_power: result[rxOID] != null ? parseDbm(result[rxOID], 100) : null,
        tx_power: result[txOID] != null ? parseDbm(result[txOID], 100) : null,
      };
    } catch (e) {
      return { rx_power: null, tx_power: null };
    }
  }

  async getONTStatus(ontId) {
    const signal = await this.getONTSignal(ontId);
    return { ontId, ...signal, online: signal.rx_power !== null && signal.rx_power > -27 };
  }

  async rebootONT(ontId) {
    return { success: false, error: 'Reboot via SNMP not supported for KingType' };
  }

  async getActiveAlerts() { return []; }

  async getCPUUsage() {
    if (!this.session) await this.connect();
    try {
      const vbs = await snmpConfig.walk(this.session, OIDS.cpuUsage);
      return vbs.length ? parseCounter(vbs[0]) : null;
    } catch (e) { return null; }
  }

  async getTemperature() {
    if (!this.session) await this.connect();
    try {
      const vbs = await snmpConfig.walk(this.session, OIDS.temperature);
      return vbs.length ? parseCounter(vbs[0]) : null;
    } catch (e) { return null; }
  }

  async getPortStats(portId) {
    return { portId, error: 'Not implemented for KingType' };
  }

  async sendCommand(cmd) {
    throw new Error('CLI commands not supported for KingType via SNMP');
  }

  async detectPortType(portId) {
    return { portId, type: 'GPON' };
  }
}

module.exports = KingType;
