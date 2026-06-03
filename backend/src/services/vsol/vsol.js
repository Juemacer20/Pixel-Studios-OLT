const { Client: SSHClient } = require('ssh2');
const fs = require('fs');
const os = require('os');
const logger = require('../../middleware/logger');

function loadSystemPrivateKey() {
  const candidates = ['id_ed25519', 'id_rsa', 'id_ecdsa'].map(k => `${os.homedir()}/.ssh/${k}`);
  for (const p of candidates) {
    try { return fs.readFileSync(p); } catch {}
  }
  return null;
}

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
      const timeout = setTimeout(() => reject(new Error('SSH timeout')), 30000);

      conn.on('ready', () => {
        this.conn = conn;
        conn.shell({ term: 'vt100', cols: 220, rows: 50 }, (err, stream) => {
          if (err) { clearTimeout(timeout); return reject(err); }
          this.stream = stream;
          stream.on('data', (d) => { this.buffer += d.toString(); });
          stream.stderr.on('data', (d) => { this.buffer += d.toString(); });

          // Handle double-auth: SSH key opens the channel, then OLT prompts Login/Password
          const waitFor = (pattern, timeoutMs = 8000) => new Promise((res, rej) => {
            const check = setInterval(() => {
              if (pattern.test(this.buffer)) { clearInterval(check); res(); }
            }, 100);
            setTimeout(() => { clearInterval(check); rej(new Error(`Timeout waiting for ${pattern}`)); }, timeoutMs);
          });

          (async () => {
            try {
              await waitFor(/Login:/i);
              this.buffer = '';
              stream.write(`${creds.username || 'admin'}\n`);
              await waitFor(/Password:/i);
              this.buffer = '';
              stream.write(`${creds.password || 'admin'}\n`);
              // Wait for shell prompt (VSOL typically shows '>' or '#')
              await waitFor(/[>#$]\s*$/, 8000);
              this.buffer = '';
              this.connected = true;
              clearTimeout(timeout);
              resolve();
            } catch (e) {
              clearTimeout(timeout);
              reject(new Error(`VSOL auth failed: ${e.message}`));
            }
          })();
        });
      });

      conn.on('error', (err) => { clearTimeout(timeout); reject(err); });

      const privateKey = loadSystemPrivateKey();
      conn.connect({
        host: this.olt.ip,
        port: 22,
        username: 'admin',
        ...(privateKey ? { privateKey } : {}),
        readyTimeout: 15000,
        algorithms: {
          kex: ['ecdh-sha2-nistp256', 'diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
          serverHostKey: ['ssh-ed25519', 'ssh-rsa'],
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-cbc'],
          hmac: ['hmac-sha2-256', 'hmac-sha1'],
        },
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
