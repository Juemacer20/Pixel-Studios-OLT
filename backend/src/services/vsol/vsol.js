const logger = require('../../middleware/logger');
const TelnetSession = require('./telnetSession');
const {
  parseOnuList, parseOnuState, parseOptical, parseStats,
  parseEthPorts, parseDistance, parseProfile
} = require('./parser');
const { parseRunningConfig } = require('./configParser');

class VSOL {
  constructor(olt) {
    this.olt = olt;
    this.telnet = null;
  }

  async connect() {
    return this;
  }

  _getTelnet() {
    if (!this.telnet) {
      this.telnet = new TelnetSession();
    }
    return this.telnet;
  }

  disconnect() {
    if (this.telnet) {
      try { this.telnet.disconnect(); } catch {}
      this.telnet = null;
    }
  }

  _getCredentials() {
    if (this.olt.credentials_encrypted) {
      try { return require('../../utils/encryption').decryptCredentials(this.olt.credentials_encrypted) || {}; } catch (e) { return {}; }
    }
    return { username: 'admin', password: 'solomaz2' };
  }

  /* ─── low-level command ──────────────────────────────────────────────────── */
  async sendCommand(cmd, timeout = 12000) {
    const tn = this._getTelnet();
    await tn.connect(this.olt);
    await tn.enable(this.olt);
    return tn.run(cmd, timeout);
  }

  /* ─── SNMP system info ───────────────────────────────────────────────────── */
  async getSystemInfo() {
    try {
      const snmp = require('net-snmp');
      const session = snmp.createSession(this.olt.ip, this.olt.community || 'public', { timeout: 5000, retries: 1 });
      const uptime = await new Promise((res, rej) => {
        session.get(['1.3.6.1.2.1.1.3.0'], (err, vbs) => {
          session.close();
          if (err || !vbs[0] || snmp.isVarbindError(vbs[0])) return rej(err || new Error('no uptime'));
          res(Math.floor(vbs[0].value / 100));
        });
      });
      return { description: `VSOL ${this.olt.model}`, uptime, name: this.olt.name };
    } catch (e) {
      throw e;
    }
  }

  /* ─── SNMP ONT discovery ─────────────────────────────────────────────────── */
  async listONTs(ponPort = null) {
    try {
      const snmp = require('net-snmp');
      const session = snmp.createSession(this.olt.ip, this.olt.community || 'public', { timeout: 10000 });
      const toVal = (v) => Buffer.isBuffer(v) ? v.toString() : (typeof v === 'object' ? v.toString() : v);
      const walkOid = (oid) => new Promise((res, rej) => {
        const rows = {};
        session.subtree(oid, 20, (varbinds) => {
          varbinds.forEach(v => { rows[v.oid] = toVal(v.value); });
        }, (err) => { if (err) rej(err); else res(rows); });
      });
      const [descs, stats, macs] = await Promise.all([
        walkOid('1.3.6.1.2.1.2.2.1.2'),
        walkOid('1.3.6.1.2.1.2.2.1.8'),
        walkOid('1.3.6.1.4.1.37950.1.1.5.10.3.2.1.3'),
      ]);
      session.close();
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
        const mac = macByOnuId[ifIdx] || macByOnuId[onuId] || null;
        const serial = mac ? `VSOL${mac.replace(/:/g, '')}` : `VSOL-${this.olt.ip.replace(/\./g, '')}-P${port}-${onuId}`;
        onts.push({
          serial_number: serial, mac, pon_port: parseInt(port), onu_id: parseInt(onuId),
          interface: nameStr, status: up ? 'ONLINE' : 'OFFLINE', rx_power: null, tx_power: null,
        });
      });
      return onts;
    } catch (e) {
      logger.error(`VSOL listONTs SNMP: ${e.message}`);
      return [];
    }
  }

  /* ─── Telnet ONU operations (from PON interface) ──────────────────────────── */

  async _enterPonInterface(ponIndex) {
    const tn = this._getTelnet();
    await tn.connect(this.olt);
    await tn.enable(this.olt);
    await tn.run('configure terminal');
    await tn.run(`interface gpon 0/${ponIndex}`);
  }

  /* ─── ONU list via Telnet (usando PON interface) ──────────────────────────── */
  async listOnusTelnet(ponIndex = 1) {
    try {
      const tn = this._getTelnet();
      await tn.connect(this.olt);
      await tn.enable(this.olt);
      await tn.run('configure terminal');
      await tn.run(`interface gpon 0/${ponIndex}`);
      const output = await tn.run('show onu info');
      const onus = parseOnuList(output);

      // También obtener estados
      const stateOutput = await tn.run('show onu state');
      const states = parseOnuState(stateOutput);
      const stateMap = {};
      for (const s of states) stateMap[s.onuId] = s;

      return onus.map(o => ({
        ...o,
        adminState: stateMap[o.onuId]?.adminState || 'unknown',
        omccState: stateMap[o.onuId]?.omccState || 'unknown',
        phaseState: stateMap[o.onuId]?.phaseState || 'unknown',
        configState: stateMap[o.onuId]?.configState || 'unknown',
      }));
    } catch (e) {
      logger.error(`VSOL listOnusTelnet PON${ponIndex}: ${e.message}`);
      return [];
    } finally { this.disconnect(); }
  }

  async getOnuOptical(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} optical`);
      return parseOptical(output);
    } catch (e) { return {}; }
    finally { this.disconnect(); }
  }

  async getOnuStats(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} statistics`);
      return parseStats(output);
    } catch (e) { return {}; }
    finally { this.disconnect(); }
  }

  async getOnuEth(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} eth`);
      return parseEthPorts(output);
    } catch (e) { return []; }
    finally { this.disconnect(); }
  }

  async getOnuDistance(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} distance`);
      return parseDistance(output);
    } catch (e) { return null; }
    finally { this.disconnect(); }
  }

  async getOnuProfile(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} profile`);
      return parseProfile(output);
    } catch (e) { return {}; }
    finally { this.disconnect(); }
  }

  /* ─── ONU actions (desde PON interface) ────────────────────────────────────── */
  async _onuAction(ponIndex, onuId, action) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`onu ${onuId} ${action}`);
      return { success: !/error|invalid|fail|Unknown/i.test(output), output };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this.disconnect(); }
  }

  async rebootONT(ontId) { return this._onuAction(1, ontId, 'reboot'); }
  async activateOnu(ponIndex, onuId) { return this._onuAction(ponIndex, onuId, 'activate'); }
  async deactivateOnu(ponIndex, onuId) { return this._onuAction(ponIndex, onuId, 'deactivate'); }
  async rebootOnu(ponIndex, onuId) { return this._onuAction(ponIndex, onuId, 'reboot'); }

  async addOnu(ponIndex, { onuId, profile, serial }) {
    try {
      await this._enterPonInterface(ponIndex);
      await this.telnet.run(`onu add ${onuId} profile ${profile} sn ${serial}`);
      // Asignar perfiles por defecto
      await this.telnet.run(`onu ${onuId} profile line name ${profile}`);
      await this.telnet.run(`onu ${onuId} profile srv name ${profile}`);
      await this.telnet.run(`onu ${onuId} profile alarm name Alarm`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this.disconnect(); }
  }

  async deleteOnu(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      await this.telnet.run('configure terminal');
      await this.telnet.run(`no onu ${onuId}`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this.disconnect(); }
  }

  async setOnuDescription(ponIndex, onuId, description) {
    try {
      await this._enterPonInterface(ponIndex);
      await this.telnet.run(`onu ${onuId} desc ${description}`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this.disconnect(); }
  }

  async setOnuProfile(ponIndex, onuId, type, profileName) {
    try {
      await this._enterPonInterface(ponIndex);
      await this.telnet.run(`onu ${onuId} profile ${type} name ${profileName}`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this.disconnect(); }
  }

  /* ─── ONU actions (compatibilidad con ontService) ──────────────────────────── */
  enableONT(serial)        { return this._callWrapper(`onu activate ${serial}`); }
  disableONT(serial)       { return this._callWrapper(`onu deactivate ${serial}`); }
  startONT(serial)         { return this._callWrapper(`onu activate ${serial}`); }
  stopONT(serial)          { return this._callWrapper(`onu deactivate ${serial}`); }
  resyncONT(serial)        { return this._callWrapper(`onu reboot ${serial}`); }
  restoreDefaults(serial)  { return this._callWrapper(`onu factory-reset ${serial}`); }
  deleteONTFromOLT(serial) { return this._callWrapper(`no onu ${serial}`); }

  async _callWrapper(cmd) {
    try {
      const output = await this.sendCommand(cmd);
      return { success: !/error|invalid|fail/i.test(output), output };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this.disconnect(); }
  }

  async getRunningConfig(serial) {
    try { return { success: true, outputs: [{ out: await this.sendCommand('show running-config') }] }; }
    finally { this.disconnect(); }
  }
  async getSwInfo(serial) {
    try { return { success: true, outputs: [{ out: await this.sendCommand('show version') }] }; }
    finally { this.disconnect(); }
  }

  /* ─── Profile management ──────────────────────────────────────────────────── */
  async getProfiles(type) {
    try {
      const config = await this.sendCommand('show running-config');
      const parsed = parseRunningConfig(config);
      return parsed.profiles[type] || [];
    } catch (e) { return []; }
    finally { this.disconnect(); }
  }

  async getRunningConfigText() {
    try { return await this.sendCommand('show running-config'); }
    finally { this.disconnect(); }
  }

  async getParsedConfig() {
    try {
      const config = await this.sendCommand('show running-config');
      return parseRunningConfig(config);
    } catch (e) { return null; }
    finally { this.disconnect(); }
  }

  async saveConfig() {
    try {
      await this._getTelnet().connect(this.olt);
      await this._getTelnet().enable(this.olt);
      await this._getTelnet().run('write');
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this.disconnect(); }
  }

  /* ─── Alarms ──────────────────────────────────────────────────────────────── */
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
    } catch (e) { return []; }
  }

  /* ─── Diagnostics ─────────────────────────────────────────────────────────── */
  async ping(host) {
    try { return await this.sendCommand(`ping ${host}`); }
    finally { this.disconnect(); }
  }

  /* ─── System info via Telnet ──────────────────────────────────────────────── */
  async getCPUUsage() {
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

  /* ─── authorizeONT (compatibilidad con ontService) ────────────────────────── */
  async authorizeONT(data) {
    const { board, port, serial, onuId, lineProfileId, srvProfileId, name, svlanId, userVlan, gemport, tagTransform, upstreamKbps, downstreamKbps } = data;
    const ponIndex = port || 1;
    const onu_id = onuId || 1;
    const profile = lineProfileId || srvProfileId || 'default';

    try {
      const tn = this._getTelnet();
      await tn.connect(this.olt);
      await tn.enable(this.olt);
      await tn.run('configure terminal');
      await tn.run(`interface gpon 0/${ponIndex}`);

      // ONU add with serial, profile, and description
      await tn.run(`onu add ${onu_id} profile ${profile} sn ${serial}`);
      if (name) await tn.run(`onu ${onu_id} desc ${name}`);

      // Set profiles
      if (lineProfileId) await tn.run(`onu ${onu_id} profile line name ${lineProfileId}`);
      if (srvProfileId) await tn.run(`onu ${onu_id} profile srv name ${srvProfileId}`);
      await tn.run(`onu ${onu_id} profile alarm name Alarm`);

      // Apply VLAN config if provided
      if (svlanId || userVlan) {
        const svlan = svlanId || userVlan;
        await tn.run(`onu ${onu_id} svlan ${svlan}`);
      }

      // Apply speed limits if provided
      if (downstreamKbps || upstreamKbps) {
        if (downstreamKbps) await tn.run(`onu ${onu_id} speed downstream ${downstreamKbps}`);
        if (upstreamKbps) await tn.run(`onu ${onu_id} speed upstream ${upstreamKbps}`);
      }

      // Activate
      await tn.run(`onu ${onu_id} activate`);

      this.disconnect();
      return {
        success: true,
        location: { board: 0, port: ponIndex, onu_id },
      };
    } catch (e) {
      this.disconnect();
      return { success: false, error: e.message, location: {} };
    }
  }

  /* ─── getOpticalInfo (batch enrichment para scanOLTOnts) ──────────────────── */
  async getOpticalInfo(slotPorts) {
    const rows = [];
    for (const sp of slotPorts) {
      // VSOL no tiene slot, usa port como PON index y onu_id de cada ONU
      const ponIndex = sp.port || sp.slot || 1;
      try {
        await this._enterPonInterface(ponIndex);
        const listOut = await this.telnet.run('show onu info');
        const onus = parseOnuList(listOut);
        for (const onu of onus) {
          try {
            const optOut = await this.telnet.run(`show onu ${onu.onuId} optical`);
            const opt = parseOptical(optOut);
            rows.push({
              slot: 0,
              port: ponIndex,
              ont_id: onu.onuId,
              rx_power: opt.rxPower ?? null,
              tx_power: opt.txPower ?? null,
              olt_rx_power: opt.oltRxPower ?? null,
              temperature: opt.temperature ?? null,
              voltage: opt.voltage ?? null,
              bias_current: opt.biasCurrent ?? null,
              distance: null,
            });
          } catch {}
        }
      } catch (e) {
        logger.warn(`getOpticalInfo PON${ponIndex}: ${e.message}`);
      } finally { this.disconnect(); }
    }
    return rows;
  }
}

module.exports = VSOL;
