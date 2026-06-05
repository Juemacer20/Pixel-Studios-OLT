const net = require('net');
const logger = require('../../middleware/logger');

// Minimal Telnet client using net.Socket — avoids node-telnet-client's broken server
class TelnetHuawei {
  constructor(olt) {
    this.olt = olt;
    this.socket = null;
    this.connected = false;
    this._buffer = '';
    this._waiters = [];
  }

  connect() {
    const creds = this._getCredentials();
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      this.socket = socket;
      const timeout = setTimeout(() => { socket.destroy(); reject(new Error('Telnet connect timeout')); }, 15000);

      socket.connect(23, this.olt.ip);

      socket.on('data', (data) => {
        // Strip Telnet option bytes (IAC sequences)
        const stripped = this._stripTelnet(data);
        this._buffer += stripped;
        this._dispatch();
      });

      socket.on('error', (err) => { clearTimeout(timeout); reject(err); });
      socket.on('close', () => { this.connected = false; });

      // Login sequence — Huawei MA5800 uses ">>User name:" (with space)
      this._waitFor(/[Uu]ser\s*[Nn]ame:|[Ll]ogin:/i, 12000)
        .then(() => { socket.write(creds.username + '\r\n'); return this._waitFor(/[Uu]ser\s*[Pp]assword:|[Pp]assword:/i, 8000); })
        .then(() => { socket.write(creds.password + '\r\n'); return this._waitFor(/[>#$]\s*$/m, 10000); })
        .then(() => { clearTimeout(timeout); this.connected = true; resolve(); })
        .catch((err) => { clearTimeout(timeout); socket.destroy(); reject(err); });
    });
  }

  async disconnect() {
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
      this.connected = false;
    }
  }

  async sendCommand(cmd, timeout = 10000) {
    if (!this.connected) await this.connect();
    this._buffer = '';
    this.socket.write(cmd + '\r\n');
    const output = await this._waitFor(/[>#]\s*$/m, timeout);
    return output;
  }

  // ── Prompt parsing helpers ──────────────────────────────────────────────────

  _waitFor(pattern, timeout) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this._waiters = this._waiters.filter(w => w.resolve !== resolve);
        reject(new Error(`Telnet timeout waiting for ${pattern}`));
      }, timeout);

      const check = () => {
        if (pattern.test(this._buffer)) {
          clearTimeout(t);
          const result = this._buffer;
          this._buffer = '';
          return true;
        }
        return false;
      };

      if (check()) { resolve(this._buffer); return; }

      this._waiters.push({
        check: () => pattern.test(this._buffer),
        resolve: (buf) => { clearTimeout(t); resolve(buf); },
      });
    });
  }

  _dispatch() {
    this._waiters = this._waiters.filter((w) => {
      if (w.check()) { w.resolve(this._buffer); this._buffer = ''; return false; }
      return true;
    });
  }

  _stripTelnet(data) {
    const bytes = Buffer.from(data);
    const out = [];
    let i = 0;
    while (i < bytes.length) {
      if (bytes[i] === 0xff) {         // IAC
        const cmd = bytes[i + 1];
        if (cmd === 0xfb || cmd === 0xfc || cmd === 0xfd || cmd === 0xfe) {
          // WILL/WONT/DO/DONT — send DONT/WONT back, skip 3 bytes
          const reply = cmd === 0xfd ? 0xfc : 0xfe; // DO→WONT, WILL→DONT
          if (this.socket && !this.socket.destroyed) {
            this.socket.write(Buffer.from([0xff, reply, bytes[i + 2]]));
          }
          i += 3;
        } else {
          i += 2; // IAC + single cmd
        }
      } else {
        out.push(bytes[i]);
        i++;
      }
    }
    return Buffer.from(out).toString('utf8');
  }

  _getCredentials() {
    if (this.olt.credentials_encrypted) {
      try {
        const dec = require('../../utils/encryption').decryptCredentials(this.olt.credentials_encrypted);
        if (dec && dec.password) return dec;
      } catch (e) {}
    }
    // Fall back to plain telnet_user / telnet_pass columns
    if (this.olt.telnet_user || this.olt.telnet_pass) {
      return { username: this.olt.telnet_user || 'admin', password: this.olt.telnet_pass || '' };
    }
    return { username: 'admin', password: 'admin' };
  }

  // ── OLT commands ────────────────────────────────────────────────────────────

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
}

module.exports = TelnetHuawei;
