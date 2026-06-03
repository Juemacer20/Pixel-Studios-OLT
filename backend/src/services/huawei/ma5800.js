const SNMPHuawei = require('./snmpHuawei');
const TelnetHuawei = require('./telnetHuawei');
const logger = require('../../middleware/logger');

class MA5800 {
  constructor(olt) {
    this.olt = olt;
    this.snmp = new SNMPHuawei(olt);
    this.telnet = new TelnetHuawei(olt);
  }

  async connect() {
    this.snmp.connect();
    try { await this.telnet.connect(); } catch (e) {
      logger.warn(`MA5800 Telnet failed ${this.olt.ip}: ${e.message}`);
    }
    return this;
  }

  async disconnect() {
    this.snmp.disconnect();
    await this.telnet.disconnect().catch(() => {});
  }

  async getSystemInfo() {
    try {
      return await this.snmp.getSystemInfo() || { name: this.olt.name, description: `Huawei ${this.olt.model}`, uptime: 0 };
    } catch (e) {
      return { name: this.olt.name, description: `Huawei ${this.olt.model}`, uptime: 0 };
    }
  }

  async listONTs() {
    try {
      return await this._listONTsDirectTelnet();
    } catch (err) {
      logger.error(`MA5800 listONTs ${this.olt.ip}: ${err.message}`);
      return [];
    }
  }

  async _listONTsDirectTelnet() {
    const net = require('net');
    const creds = this.telnet._getCredentials();
    logger.info(`MA5800 _listONTsDirectTelnet ${this.olt.ip} user=${creds.username} hasPwd=${!!creds.password}`);
    if (!creds.password) return [];

    return new Promise((resolve) => {
      const sock = new net.Socket();
      let buf = '';
      let done = false;
      const finish = (onts) => {
        if (!done) {
          done = true;
          sock.destroy();
          logger.info(`MA5800 direct telnet ${this.olt.ip}: parsed ${onts.length} ONTs`);
          resolve(onts);
        }
      };
      const globalTimeout = setTimeout(() => { logger.warn(`MA5800 direct telnet GLOBAL TIMEOUT`); finish(this._parseOntInfoOutput(buf)); }, 90000);

      sock.connect(23, this.olt.ip);
      sock.on('data', d => {
        for (const b of d) { if (b < 0xf0) buf += String.fromCharCode(b); }
      });
      sock.on('error', (e) => { logger.error(`MA5800 direct sock error: ${e.message}`); finish([]); });
      sock.on('close', () => { if (!done) finish(this._parseOntInfoOutput(buf)); });

      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const send = async (cmd, ms = 400) => { sock.write(cmd + '\r\n'); await sleep(ms); };

      (async () => {
        await sleep(2000);                    // wait for banner
        await send(creds.username || 'admin', 2000);
        await send(creds.password, 3000);
        await send('enable', 1500);
        buf = '';   // clear buffer before issuing display command
        sock.write('display ont info 0 all\r\n');
        await sleep(800);

        // Collect output — Huawei needs Enter for "{ <cr> }" prompt,
        // Space for "---- More ----" pagination
        let pages = 0;
        while (pages++ < 60) {
          await sleep(1000);
          if (buf.includes('{ <cr>')) {
            // Confirm command parameter prompt
            buf = buf.replace(/\{[^}]*<cr>[^}]*\}/g, '');
            sock.write('\r\n');
          } else if (buf.includes('---- More ----')) {
            buf = buf.replace(/----\s*More\s*----/g, '');
            sock.write(' ');
          } else if (buf.includes('MA5800-X15#') || buf.includes('MA5800#')) {
            break;
          }
        }

        clearTimeout(globalTimeout);
        finish(this._parseOntInfoOutput(buf));
      })();
    });
  }

  _parseOntInfoOutput(raw) {
    const onts = [];
    const LINE = /^\s*(\d+)\/\s*(\d+)\/(\d+)\s+(\d+)\s+([0-9A-Fa-f]{16})\s+(\S+)\s+(\S+)/gm;
    let m;
    while ((m = LINE.exec(raw)) !== null) {
      const [, frame, slot, port, ontId, snHex, controlFlag, runState] = m;
      if (controlFlag === 'deactivate') continue;
      // Convert hex serial: first 4 bytes = ASCII vendor, last 4 bytes = hex ID
      const vendorBuf = Buffer.from(snHex.slice(0, 8), 'hex');
      const vendor = vendorBuf.toString('ascii').replace(/[^\x20-\x7e]/g, '?');
      const serial = vendor + snHex.slice(8).toUpperCase();
      onts.push({
        serial_number: serial,
        mac: null,
        pon_port: parseInt(port),
        onu_id: parseInt(ontId),
        interface: `${frame}/${slot}/${port}:${ontId}`,
        status: runState === 'online' ? 'ONLINE' : 'OFFLINE',
        rx_power: null,
        tx_power: null,
      });
    }
    return onts;
  }

  async getONTSignal(ontId) {
    try {
      return await this.snmp.getONTSignal(ontId);
    } catch (e) {
      return { rx_power: null, tx_power: null };
    }
  }

  async getONTStatus(ontId) {
    const signal = await this.getONTSignal(ontId);
    return { ontId, ...signal, online: signal.rx_power !== null && signal.rx_power > -27 };
  }

  async rebootONT(ontId) {
    try {
      if (!this.telnet.connected) await this.telnet.connect();
      const output = await this.telnet.sendCommand(`ont reset ${ontId}`);
      return { success: true, output };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async getActiveAlerts() {
    try {
      return this.telnet.connected ? await this.telnet.getActiveAlarms() : [];
    } catch (e) {
      return [];
    }
  }

  async getCPUUsage() {
    try {
      const snmpCpu = await this.snmp.getCPUUsage();
      if (snmpCpu !== null) return snmpCpu;
      return this.telnet.connected ? await this.telnet.getSystemCPU() : null;
    } catch (e) {
      return null;
    }
  }

  async getTemperature() {
    try {
      const snmpTemp = await this.snmp.getTemperature();
      if (snmpTemp !== null) return snmpTemp;
      return this.telnet.connected ? await this.telnet.getTemperature() : null;
    } catch (e) {
      return null;
    }
  }

  async getPortStats(portId) {
    return this.snmp.getPortStats(portId);
  }

  async sendCommand(cmd) {
    if (!this.telnet.connected) await this.telnet.connect();
    return this.telnet.sendCommand(cmd);
  }

  async detectPortType(portId) {
    return { portId, type: 'GPON' };
  }
}

module.exports = MA5800;
