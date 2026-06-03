const snmpConfig = require('../../config/snmp');

const OIDS = {
  sysDescr: '1.3.6.1.2.1.1.1.0',
  sysUpTime: '1.3.6.1.2.1.1.3.0',
};

class SNMPVsol {
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
      const result = await snmpConfig.get(this.session, [OIDS.sysDescr, OIDS.sysUpTime]);
      return {
        description: result[OIDS.sysDescr]?.toString() || 'VSOL OLT',
        uptime: parseInt(result[OIDS.sysUpTime]) || 0,
      };
    } catch (e) {
      return null;
    }
  }
}

module.exports = SNMPVsol;
