const { Client: SSHClient } = require('ssh2');
const logger = require('../../middleware/logger');

class VSOL {
  constructor(olt) {
    this.olt = olt;
    this.conn = null;
    this.stream = null;
    this.connected = false;
    this.buffer = '';
  }

  async connect() {
    const creds = this._getCredentials();
    return new Promise((resolve, reject) => {
      const conn = new SSHClient();
      const timeout = setTimeout(() => reject(new Error('SSH timeout')), 20000);

      conn.on('ready', () => {
        clearTimeout(timeout);
        this.conn = conn;
        conn.shell((err, stream) => {
          if (err) return reject(err);
          this.stream = stream;
          this.connected = true;
          stream.on('data', (d) => { this.buffer += d.toString(); });
          stream.stderr.on('data', (d) => { this.buffer += d.toString(); });
          setTimeout(resolve, 1500);
        });
      });

      conn.on('error', (err) => { clearTimeout(timeout); reject(err); });

      conn.connect({
        host: this.olt.ip,
        port: 22,
        username: creds.username || 'admin',
        password: creds.password || 'admin',
        readyTimeout: 15000,
        keepaliveInterval: 10000,
      });
    });
  }

  disconnect() {
    if (this.stream) try { this.stream.end(); } catch (e) {}
    if (this.conn) try { this.conn.end(); } catch (e) {}
    this.connected = false;
  }

  async sendCommand(cmd, waitMs = 3000) {
    if (!this.connected) await this.connect();
    this.buffer = '';
    this.stream.write(`${cmd}\n`);
    await new Promise(r => setTimeout(r, waitMs));
    return this.buffer;
  }

  async getSystemInfo() {
    try {
      const output = await this.sendCommand('show version');
      const upMatch = output.match(/uptime.*?(\d+)/i);
      return { description: `VSOL ${this.olt.model}`, uptime: upMatch ? parseInt(upMatch[1]) * 3600 : 0, name: this.olt.name };
    } catch (e) {
      return { description: 'VSOL OLT', uptime: 0, name: this.olt.name };
    }
  }

  async listONTs(ponPort = null) {
    try {
      const output = await this.sendCommand(`show gpon onu detail-info ${ponPort || '0'}`, 4000);
      return this._parseONTs(output);
    } catch (e) {
      logger.error(`VSOL listONTs: ${e.message}`);
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
    try {
      const output = await this.sendCommand('show cpu');
      const match = output.match(/(\d+(?:\.\d+)?)\s*%/);
      return match ? parseFloat(match[1]) : null;
    } catch (e) { return null; }
  }

  async getTemperature() {
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
