const { Client } = require('node-telnet-client');
const logger = require('../../middleware/logger');

class TelnetHuawei {
  constructor(olt) {
    this.olt = olt;
    this.connection = null;
    this.connected = false;
  }

  async connect() {
    const creds = this._getCredentials();
    this.connection = new Client();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Telnet connect timeout')), 15000);
      this.connection.connect({
        host: this.olt.ip,
        port: 23,
        loginPrompt: /[Uu]ser[Nn]ame:|[Ll]ogin:/,
        passwordPrompt: /[Pp]assword:/,
        username: creds.username || 'admin',
        password: creds.password || 'admin',
        shellPrompt: /[>#]\s*$/,
        timeout: 10000,
        negotiationMandatory: false,
      });
      this.connection.on('ready', () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });
      this.connection.on('error', (err) => { clearTimeout(timeout); reject(err); });
    });
  }

  async disconnect() {
    if (this.connection && this.connected) {
      try { this.connection.end(); } catch (e) {}
      this.connected = false;
    }
  }

  async sendCommand(cmd, timeout = 10000) {
    if (!this.connected) await this.connect();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`Timeout: ${cmd}`)), timeout);
      this.connection.exec(cmd, (err, response) => {
        clearTimeout(t);
        if (err) return reject(err);
        resolve(response || '');
      });
    });
  }

  async getONTInfo(frameId, slotId, portId) {
    try {
      const output = await this.sendCommand(`display ont info ${frameId}/${slotId}/${portId} all`);
      return this._parseONTInfo(output);
    } catch (err) {
      logger.error(`getONTInfo: ${err.message}`);
      return [];
    }
  }

  async getONTOpticalInfo(frameId, slotId, portId, ontId) {
    try {
      const output = await this.sendCommand(`display ont optical-info ${frameId}/${slotId}/${portId} ${ontId}`);
      return this._parseOpticalInfo(output);
    } catch (err) {
      return null;
    }
  }

  async getActiveAlarms() {
    try {
      const output = await this.sendCommand('display alarm active all');
      return this._parseAlarms(output);
    } catch (err) {
      return [];
    }
  }

  async getSystemCPU() {
    try {
      const output = await this.sendCommand('display cpu-usage');
      const match = output.match(/CPU usage:\s*(\d+)%/i);
      return match ? parseInt(match[1]) : null;
    } catch (err) {
      return null;
    }
  }

  async getTemperature() {
    try {
      const output = await this.sendCommand('display temperature all');
      const match = output.match(/(\d+)\s*[Cc]\b/);
      return match ? parseInt(match[1]) : null;
    } catch (err) {
      return null;
    }
  }

  _parseONTInfo(output) {
    const onts = [];
    let current = {};
    for (const line of output.split('\n')) {
      const idMatch = line.match(/ONT-ID\s*:\s+(\d+)/i);
      const snMatch = line.match(/SN:\s+([A-Z0-9]+)/i);
      const statusMatch = line.match(/Run state\s*:\s+(\S+)/i);
      const descMatch = line.match(/Description\s*:\s+(.+)/i);
      if (idMatch) {
        if (current.id !== undefined) onts.push({ ...current });
        current = { id: parseInt(idMatch[1]) };
      }
      if (snMatch) current.serial_number = snMatch[1];
      if (statusMatch) current.status = statusMatch[1].toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
      if (descMatch) current.description = descMatch[1].trim();
    }
    if (current.id !== undefined) onts.push(current);
    return onts;
  }

  _parseOpticalInfo(output) {
    const rx = output.match(/Rx optical power\s*\(dBm\)\s*:\s*([-\d.]+)/i);
    const tx = output.match(/Tx optical power\s*\(dBm\)\s*:\s*([-\d.]+)/i);
    return { rx_power: rx ? parseFloat(rx[1]) : null, tx_power: tx ? parseFloat(tx[1]) : null };
  }

  _parseAlarms(output) {
    const alarms = [];
    for (const line of output.split('\n')) {
      if (line.includes('LOS') || line.includes('DyingGasp')) {
        alarms.push({ raw: line.trim(), type: line.includes('LOS') ? 'LOS' : 'DYING_GASP' });
      }
    }
    return alarms;
  }

  _getCredentials() {
    if (this.olt.credentials_encrypted) {
      try {
        return require('../../utils/encryption').decryptCredentials(this.olt.credentials_encrypted) || {};
      } catch (e) { return {}; }
    }
    return {};
  }
}

module.exports = TelnetHuawei;
