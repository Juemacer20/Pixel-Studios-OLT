const net = require('net');
const logger = require('../../middleware/logger');

class VSOL {
  constructor(olt) {
    this.olt = olt;
    this.socket = null;
    this.connected = false;
    this._buffer = '';
    this._waiters = [];
  }

  async connect() {
    // For polling (getSystemInfo/getCPUUsage/getTemperature) SNMP is used — no connection needed.
    // Telnet connect is only attempted when sendCommand is called explicitly (e.g. terminal).
    return this;
  }

  async _telnetConnect() {
    if (this.connected) return;
    const creds = this._getCredentials();
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      this.socket = socket;
      const globalTimeout = setTimeout(() => { socket.destroy(); reject(new Error('Telnet connect timeout')); }, 20000);

      socket.connect(23, this.olt.ip);
      socket.on('data', (data) => {
        this._buffer += data.toString().replace(/\xff[\xfb-\xfe]./gs, '').replace(/\xff\xf./gs, '');
        this._dispatch();
      });
      socket.on('error', (err) => { clearTimeout(globalTimeout); reject(err); });
      socket.on('close', () => { this.connected = false; });

      this._waitFor(/[Uu]ser[Nn]ame:|[Ll]ogin:/i, 12000)
        .then(() => { socket.write((creds.username || 'admin') + '\r\n'); return this._waitFor(/[Pp]assword:/i, 8000); })
        .then(() => { socket.write((creds.password || 'admin') + '\r\n'); return this._waitFor(/[>#$]\s*$/m, 10000); })
        .then(() => { clearTimeout(globalTimeout); this.connected = true; resolve(); })
        .catch((err) => { clearTimeout(globalTimeout); socket.destroy(); reject(new Error(`VSOL auth failed: ${err.message}`)); });
    });
  }

  disconnect() {
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }
    this.connected = false;
  }

  async sendCommand(cmd, timeout = 8000) {
    await this._telnetConnect();
    this._buffer = '';
    this.socket.write(cmd + '\r\n');
    return this._waitFor(/[>#$]\s*$/m, timeout).catch(() => this._buffer);
  }

  _waitFor(pattern, timeout) {
    return new Promise((resolve, reject) => {
      if (pattern.test(this._buffer)) { const r = this._buffer; this._buffer = ''; return resolve(r); }
      const t = setTimeout(() => {
        this._waiters = this._waiters.filter(w => w.id !== id);
        reject(new Error(`Telnet timeout waiting for ${pattern}`));
      }, timeout);
      const id = Symbol();
      this._waiters.push({
        id,
        check: () => pattern.test(this._buffer),
        resolve: () => { clearTimeout(t); const r = this._buffer; this._buffer = ''; resolve(r); },
        reject: () => { clearTimeout(t); reject(new Error(`Telnet closed`)); },
      });
    });
  }

  _dispatch() {
    this._waiters = this._waiters.filter(w => { if (w.check()) { w.resolve(); return false; } return true; });
  }

  async getSystemInfo() {
    // Use SNMP sysUpTime — no credentials needed
    try {
      const snmp = require('net-snmp');
      const session = snmp.createSession(this.olt.ip, this.olt.community || 'public', { timeout: 5000, retries: 1 });
      const uptime = await new Promise((res, rej) => {
        session.get(['1.3.6.1.2.1.1.3.0'], (err, vbs) => {
          session.close();
          if (err || !vbs[0] || snmp.isVarbindError(vbs[0])) return rej(err || new Error('no uptime'));
          res(Math.floor(vbs[0].value / 100)); // centiseconds → seconds
        });
      });
      return { description: `VSOL ${this.olt.model}`, uptime, name: this.olt.name };
    } catch (e) {
      throw e; // let poll job mark OFFLINE
    }
  }

  async listONTs(ponPort = null) {
    // VSOL V1600G serial numbers are not exposed via SNMP standard MIBs.
    // We discover ONTs via ifDescr (GPON0/X:Y) + ifOperStatus + MAC from vendor MIB.
    try {
      const snmp = require('net-snmp');
      const session = snmp.createSession(this.olt.ip, this.olt.community || 'public', { timeout: 10000 });

      const toVal = (v) => {
        if (Buffer.isBuffer(v)) return v;
        if (typeof v === 'object' && v !== null) return v.toString();
        return v;
      };
      const walkOid = (oid) => new Promise((res, rej) => {
        const rows = {};
        session.subtree(oid, 20, (varbinds) => {
          varbinds.forEach(v => { rows[v.oid] = toVal(v.value); });
        }, (err) => { if (err) rej(err); else res(rows); });
      });

      const [descs, stats, macs] = await Promise.all([
        walkOid('1.3.6.1.2.1.2.2.1.2'),    // ifDescr
        walkOid('1.3.6.1.2.1.2.2.1.8'),    // ifOperStatus
        walkOid('1.3.6.1.4.1.37950.1.1.5.10.3.2.1.3'), // VSOL ONU MAC table
      ]);
      session.close();

      // Build MAC lookup: onuId (1-based) → MAC string
      const macByOnuId = {};
      Object.entries(macs).forEach(([oid, val]) => {
        const idx = oid.split('.').pop();
        if (Buffer.isBuffer(val) && val.length === 6) {
          macByOnuId[idx] = Array.from(val).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
        }
      });

      const onts = [];
      Object.entries(descs).forEach(([oid, name]) => {
        const nameStr = Buffer.isBuffer(name) ? name.toString() : String(name);
        const m = nameStr.match(/^GPON(\d+)\/(\d+):(\d+)$/);
        if (!m) return;

        const [, , port, onuId] = m;
        const ifIdx = oid.split('.').pop();
        const statusOid = `1.3.6.1.2.1.2.2.1.8.${ifIdx}`;
        const statusVal = stats[statusOid];
        const up = statusVal === 1 || statusVal === '1';

        const portFilter = ponPort != null ? parseInt(port) === parseInt(ponPort) : true;
        if (!portFilter) return;

        const mac = macByOnuId[onuId] || null;
        const serial = mac
          ? `VSOL${mac.replace(/:/g, '').slice(-8)}`
          : `VSOL-P${port.padStart(2, '0')}-${onuId.padStart(3, '0')}`;

        onts.push({
          serial_number: serial,
          mac,
          pon_port: parseInt(port),
          onu_id: parseInt(onuId),
          interface: nameStr,
          status: up ? 'ONLINE' : 'OFFLINE',
          rx_power: null,
          tx_power: null,
        });
      });

      return onts;
    } catch (e) {
      logger.error(`VSOL listONTs SNMP: ${e.message}`);
      return [];
    }
  }

  async getONTSignal(ontId) {
    try {
      const output = await this.sendCommand(`show gpon onu detail-info ${ontId}`);
      const rx = output.match(/Rx\s*power.*?:([-\d.]+)/i);
      const tx = output.match(/Tx\s*power.*?:([-\d.]+)/i);
      return { rx_power: rx ? parseFloat(rx[1]) : null, tx_power: tx ? parseFloat(tx[1]) : null };
    } catch (e) {
      return { rx_power: null, tx_power: null };
    }
  }

  async getONTStatus(ontId) {
    const signal = await this.getONTSignal(ontId);
    return { ontId, ...signal, online: signal.rx_power !== null };
  }

  async rebootONT(ontId) {
    try {
      const output = await this.sendCommand(`onu reset ${ontId}`);
      return { success: true, output };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getActiveAlerts() {
    try {
      const output = await this.sendCommand('show alarm active');
      const alarms = [];
      for (const line of output.split('\n')) {
        if (line.includes('LOS') || line.includes('DyingGasp')) {
          alarms.push({ raw: line.trim(), type: line.includes('LOS') ? 'LOS' : 'DYING_GASP' });
        }
      }
      return alarms;
    } catch (e) {
      return [];
    }
  }

  async getCPUUsage() {
    // Requires Telnet credentials — returns null until configured
    if (!this._getCredentials().password) return null;
    try {
      const output = await this.sendCommand('show cpu');
      const match = output.match(/(\d+(?:\.\d+)?)\s*%/);
      return match ? parseFloat(match[1]) : null;
    } catch (e) { return null; }
  }

  async getTemperature() {
    if (!this._getCredentials().password) return null;
    try {
      const output = await this.sendCommand('show temperature');
      const match = output.match(/(\d+)\s*[Cc]/);
      return match ? parseInt(match[1]) : null;
    } catch (e) { return null; }
  }

  async getPortStats(portId) {
    try {
      const output = await this.sendCommand(`show interface gpon-port ${portId}`);
      const inMatch = output.match(/Input.*?(\d+)/i);
      const outMatch = output.match(/Output.*?(\d+)/i);
      return { portId, inOctets: inMatch ? parseInt(inMatch[1]) : 0, outOctets: outMatch ? parseInt(outMatch[1]) : 0 };
    } catch (e) { return { portId, error: e.message }; }
  }

  async detectPortType(portId) {
    return { portId, type: 'GPON' };
  }

  _parseONTs(output) {
    const onts = [];
    for (const block of output.split(/---+/)) {
      const sn = block.match(/SN\s*:\s*([A-Z0-9]+)/i);
      const status = block.match(/Status\s*:\s*(\S+)/i);
      const rx = block.match(/Rx\s*:\s*([-\d.]+)/i);
      if (sn) {
        onts.push({
          serial_number: sn[1],
          status: status && status[1].toLowerCase() === 'up' ? 'ONLINE' : 'OFFLINE',
          rx_power: rx ? parseFloat(rx[1]) : null,
        });
      }
    }
    return onts;
  }

  _getCredentials() {
    if (this.olt.credentials_encrypted) {
      try { return require('../../utils/encryption').decryptCredentials(this.olt.credentials_encrypted) || {}; } catch (e) { return {}; }
    }
    return {};
  }
}

module.exports = VSOL;
