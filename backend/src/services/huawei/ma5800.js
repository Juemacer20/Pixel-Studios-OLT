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
    // SNMP-only for polling — Telnet is used exclusively in listONTs/_listONTsDirectTelnet
    this.snmp.connect();
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

    const PROMPT = /MA5800[^#>\r\n]*#/;
    const MORE = /---- More|More \( Press/;
    const CR_PROMPT = /\{ <cr>/;

    const sock = new net.Socket();
    let buf = '';
    sock.on('data', d => { for (const b of d) { if (b < 0xf0) buf += String.fromCharCode(b); } });

    // Wait until buffer matches one of the regexes, or timeout. Returns matched regex (or null).
    const waitFor = (regexes, timeoutMs) => new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const hit = regexes.find(r => r.test(buf));
        if (hit) { clearInterval(iv); resolve(hit); }
        else if (Date.now() - start > timeoutMs) { clearInterval(iv); resolve(null); }
      }, 80);
    });

    try {
      await new Promise((res, rej) => {
        const to = setTimeout(() => rej(new Error('connect timeout')), 15000);
        sock.once('error', e => { clearTimeout(to); rej(e); });
        sock.connect(23, this.olt.ip, () => { clearTimeout(to); res(); });
      });

      // Login
      await waitFor([/User name:|Username:|Login:/i], 10000);
      buf = ''; sock.write((creds.username || 'admin') + '\r\n');
      await waitFor([/User password:|Password:/i], 8000);
      buf = ''; sock.write(creds.password + '\r\n');
      await waitFor([/MA5800[^#>\r\n]*>/], 10000);
      buf = ''; sock.write('enable\r\n');
      await waitFor([PROMPT], 6000);

      // Run a command and collect every page (handles { <cr> } confirm + More pagination)
      const collect = async (cmd, pageTimeout = 8000) => {
        buf = '';
        sock.write(cmd + '\r\n');
        let out = '';
        // First response: either { <cr> } confirm prompt, More, or directly the prompt
        let hit = await waitFor([CR_PROMPT, MORE, PROMPT], pageTimeout);
        while (true) {
          out += buf; buf = '';
          if (hit === CR_PROMPT) {
            sock.write('\r\n');
          } else if (hit === MORE) {
            sock.write(' ');
          } else {
            break; // PROMPT or timeout(null) → done
          }
          hit = await waitFor([CR_PROMPT, MORE, PROMPT], pageTimeout);
          if (hit === null) { out += buf; buf = ''; break; }
        }
        return out;
      };

      // Discover GPON boards (H9xxGPxx, H9xxGPBx, etc.)
      const boardOut = await collect('display board 0');
      const gponSlots = [...new Set(
        [...boardOut.matchAll(/^\s*(\d+)\s+H\d+[A-Z]*GP[A-Z0-9]*\s+\w/gim)].map(m => m[1])
      )];
      logger.info(`MA5800 ${this.olt.ip}: GPON slots = ${gponSlots.join(',') || '(none)'}`);
      const slots = gponSlots.length ? gponSlots : ['1'];

      // Collect ONTs per slot
      let allOnts = [];
      for (const slot of slots) {
        const slotOut = await collect(`display ont info 0 ${slot} all`, 10000);
        const parsed = this._parseOntInfoOutput(slotOut);
        allOnts = allOnts.concat(parsed);
        logger.info(`MA5800 ${this.olt.ip}: slot ${slot} → ${parsed.length} ONTs (total ${allOnts.length})`);
      }

      sock.destroy();
      logger.info(`MA5800 ${this.olt.ip}: total parsed ${allOnts.length} ONTs`);
      return allOnts;
    } catch (e) {
      logger.error(`MA5800 direct telnet ${this.olt.ip}: ${e.message}`);
      try { sock.destroy(); } catch {}
      return [];
    }
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
