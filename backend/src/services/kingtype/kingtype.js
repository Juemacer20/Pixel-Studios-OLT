const net = require('net');
const snmpConfig = require('../../config/snmp');
const { parseCounter, parseDbm } = require('../../utils/snmpParser');
const logger = require('../../middleware/logger');
const TelnetSession = require('../vsol/telnetSession');

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
    this.telnet = null;
  }

  async connect() {
    this.session = snmpConfig.createSession(this.olt.ip, this.olt.community || 'public');
    return this;
  }

  disconnect() {
    if (this.session) {
      try { this.session.close(); } catch {}
      this.session = null;
    }
  }

  _getTelnet() {
    if (!this.telnet) this.telnet = new TelnetSession();
    return this.telnet;
  }

  async sendCommand(cmd, timeout = 12000) {
    const tn = this._getTelnet();
    await tn.connect(this.olt);
    await tn.enable(this.olt);
    return tn.run(cmd, timeout);
  }

  // ─── SNMP: System info ─────────────────────────────────────────────────
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

  // ─── SNMP: ONT discovery ───────────────────────────────────────────────
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

  async _resolveOntIndex(serial) {
    const onts = await this.listONTs();
    const found = onts.find(o => o.serial_number === serial);
    return found != null ? found.ontIndex : null;
  }

  async getONTSignal(serialOrIndex) {
    if (!this.session) await this.connect();
    const ontId = typeof serialOrIndex === 'string'
      ? (await this._resolveOntIndex(serialOrIndex))
      : serialOrIndex;
    if (ontId == null) return { rx_power: null, tx_power: null };
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

  // ─── Telnet helpers ──────────────────────────────────────────────────────
  async _enterPonInterface(ponIndex) {
    const tn = this._getTelnet();
    await tn.connect(this.olt);
    await tn.enable(this.olt);
    await tn.run('configure terminal');
    await tn.run(`interface gpon 0/${ponIndex}`);
  }

  async _onuCmd(location, cmd) {
    const ponIndex = location?.port || 1;
    const onuId = location?.onu_id;
    if (onuId == null) throw Object.assign(new Error('onu_id required in location'), { status: 400 });
    try {
      const tn = this._getTelnet();
      await tn.connect(this.olt);
      await tn.enable(this.olt);
      await tn.run('configure terminal');
      await tn.run(`interface gpon 0/${ponIndex}`);
      const output = await tn.run(`onu ${onuId} ${cmd}`);
      return { success: !/error|invalid|fail|Unknown/i.test(output), output };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async _runCmds(location, cmds) {
    if (!cmds.length) return { success: true };
    const ponIndex = location?.port || 1;
    try {
      const tn = this._getTelnet();
      await tn.connect(this.olt);
      await tn.enable(this.olt);
      await tn.run('configure terminal');
      await tn.run(`interface gpon 0/${ponIndex}`);
      const outputs = [];
      let failed = false;
      for (const cmd of cmds) {
        const out = await tn.run(cmd);
        outputs.push({ cmd, out: out?.trim()?.slice(-300) });
        if (/error|invalid|fail|Unknown/i.test(out)) failed = true;
      }
      return { success: !failed, outputs, location };
    } catch (e) { return { success: false, error: e.message, location }; }
    finally { this._disconnectTelnet(); }
  }

  async _callGlobal(cmd) {
    try {
      const output = await this.sendCommand(cmd);
      return { success: true, outputs: [{ out: output }] };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  _disconnectTelnet() {
    if (this.telnet) {
      try { this.telnet.disconnect(); } catch {}
      this.telnet = null;
    }
  }

  // ─── PON-context methods (vendor routes: ports listing, optical, etc.) ─────
  async listOnusTelnet(ponIndex = 1) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run('show onu info');
      const { parseOnuList, parseOnuState } = require('../vsol/parser');
      const onus = parseOnuList(output);
      const stateOutput = await this.telnet.run('show onu state');
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
      logger.error(`KingType listOnusTelnet PON${ponIndex}: ${e.message}`);
      return [];
    } finally { this._disconnectTelnet(); }
  }

  async getOnuOptical(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} optical`);
      const { parseOptical } = require('../vsol/parser');
      return parseOptical(output);
    } catch (e) { return {}; }
    finally { this._disconnectTelnet(); }
  }

  async getOnuStats(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} statistics`);
      const { parseStats } = require('../vsol/parser');
      return parseStats(output);
    } catch (e) { return {}; }
    finally { this._disconnectTelnet(); }
  }

  async getOnuEth(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} eth`);
      const { parseEthPorts } = require('../vsol/parser');
      return parseEthPorts(output);
    } catch (e) { return []; }
    finally { this._disconnectTelnet(); }
  }

  async getOnuDistance(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} distance`);
      const { parseDistance } = require('../vsol/parser');
      return parseDistance(output);
    } catch (e) { return null; }
    finally { this._disconnectTelnet(); }
  }

  async getOnuProfile(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      const output = await this.telnet.run(`show onu ${onuId} profile`);
      const { parseProfile } = require('../vsol/parser');
      return parseProfile(output);
    } catch (e) { return {}; }
    finally { this._disconnectTelnet(); }
  }

  async addOnu(ponIndex, { onuId, profile, serial, description }) {
    try {
      await this._enterPonInterface(ponIndex);
      await this.telnet.run(`onu add ${onuId} profile ${profile} sn ${serial}`);
      await this.telnet.run(`onu ${onuId} profile line name ${profile}`);
      await this.telnet.run(`onu ${onuId} profile srv name ${profile}`);
      await this.telnet.run(`onu ${onuId} profile alarm name Alarm`);
      if (description) await this.telnet.run(`onu ${onuId} desc ${description}`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async activateOnu(ponIndex, onuId) {
    try { await this._enterPonInterface(ponIndex); const out = await this.telnet.run(`onu ${onuId} activate`); return { success: !/error/i.test(out) }; }
    catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async deactivateOnu(ponIndex, onuId) {
    try { await this._enterPonInterface(ponIndex); const out = await this.telnet.run(`onu ${onuId} deactivate`); return { success: !/error/i.test(out) }; }
    catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async rebootOnu(ponIndex, onuId) {
    try { await this._enterPonInterface(ponIndex); const out = await this.telnet.run(`onu ${onuId} reboot`); return { success: !/error/i.test(out) }; }
    catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async deleteOnu(ponIndex, onuId) {
    try {
      await this._enterPonInterface(ponIndex);
      await this.telnet.run(`no onu ${onuId}`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async setOnuDescription(ponIndex, onuId, description) {
    try {
      await this._enterPonInterface(ponIndex);
      await this.telnet.run(`onu ${onuId} desc ${description}`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async getProfiles(type) {
    try {
      const { parseRunningConfig } = require('../vsol/configParser');
      const config = await this.sendCommand('show running-config');
      const parsed = parseRunningConfig(config);
      return parsed.profiles[type] || [];
    } catch (e) { return []; }
    finally { this._disconnectTelnet(); }
  }

  async getRunningConfigText() {
    try { return await this.sendCommand('show running-config'); }
    finally { this._disconnectTelnet(); }
  }

  async getParsedConfig() {
    try {
      const { parseRunningConfig } = require('../vsol/configParser');
      const config = await this.sendCommand('show running-config');
      return parseRunningConfig(config);
    } catch (e) { return null; }
    finally { this._disconnectTelnet(); }
  }

  // ─── ONU actions (via ontService) ─────────────────────────────────────────
  enableONT(serial, body, location)        { return this._onuCmd(location, 'activate'); }
  disableONT(serial, body, location)       { return this._onuCmd(location, 'deactivate'); }
  startONT(serial, body, location)         { return this._onuCmd(location, 'activate'); }
  stopONT(serial, body, location)          { return this._onuCmd(location, 'deactivate'); }
  resyncONT(serial, body, location)        { return this._onuCmd(location, 'reboot'); }
  restoreDefaults(serial, body, location)  { return this._onuCmd(location, 'factory-reset'); }
  rebootONT(serial, body, location)        { return this._onuCmd(location, 'reboot'); }

  async deleteONTFromOLT(serial, body, location) {
    const ponIndex = location?.port || 1;
    const onuId = location?.onu_id;
    if (onuId == null) throw Object.assign(new Error('onu_id required in location'), { status: 400 });
    try {
      const tn = this._getTelnet();
      await tn.connect(this.olt);
      await tn.enable(this.olt);
      await tn.run('configure terminal');
      await tn.run(`interface gpon 0/${ponIndex}`);
      await tn.run(`no onu ${onuId}`);
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async changeOntType(serial, body, location) {
    const cmds = [];
    if (body.lineProfileId) cmds.push(`onu ${location.onu_id} profile line name ${body.lineProfileId}`);
    if (body.srvProfileId) cmds.push(`onu ${location.onu_id} profile srv name ${body.srvProfileId}`);
    if (!cmds.length) cmds.push(`onu ${location.onu_id} desc ${body.onuTypeId || ''}`);
    return this._runCmds(location, cmds);
  }

  async configureSpeedProfile(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.svlanId) cmds.push(`onu ${onuId} svlan ${body.svlanId}`);
    if (body.upstreamKbps) cmds.push(`onu ${onuId} speed upstream ${body.upstreamKbps}`);
    if (body.downstreamKbps) cmds.push(`onu ${onuId} speed downstream ${body.downstreamKbps}`);
    return this._runCmds(location, cmds);
  }

  updateVLANs(serial, body, location) {
    const vlan = body.vlanId || body.svlanId || body.userVlan;
    if (!vlan) return this._onuCmd(location, '');
    return this._runCmds(location, [`onu ${location.onu_id} svlan ${vlan}`]);
  }

  updateMode(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    const mode = body.mode || body.linkType || 'Routing';
    if (mode.toLowerCase() === 'bridging') cmds.push(`onu ${onuId} bridge`);
    if (body.vlanId) cmds.push(`onu ${onuId} svlan ${body.vlanId}`);
    return this._runCmds(location, cmds);
  }

  async updateMgmtIP(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.ip) {
      cmds.push(`onu ${onuId} ipconfig static ip ${body.ip} mask ${body.mask || '255.255.255.0'}${body.gateway ? ` gateway ${body.gateway}` : ''}`);
    } else {
      cmds.push(`onu ${onuId} ipconfig dhcp`);
    }
    return this._runCmds(location, cmds);
  }

  configureEthernetPort(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    const ethPort = body.ethPort || 1;
    if (body.vlanId) cmds.push(`onu ${onuId} svlan ${body.vlanId}`);
    if (body.enabled != null) cmds.push(`onu ${onuId} eth ${ethPort} ${body.enabled ? 'enable' : 'disable'}`);
    return this._runCmds(location, cmds);
  }

  configureWiFiPort(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.ssid) cmds.push(`onu ${onuId} wifi ssid ${body.ssid}${body.password ? ` password ${body.password}` : ''}`);
    if (body.enabled != null) cmds.push(`onu ${onuId} wifi ${body.enabled ? 'enable' : 'disable'}`);
    return this._runCmds(location, cmds);
  }

  configureVoIP(serial, body, location) {
    const onuId = location.onu_id;
    if (body.enable === false) return this._runCmds(location, [`onu ${onuId} voip disable`]);
    return this._runCmds(location, [`onu ${onuId} voip enable${body.sipUser ? ` user ${body.sipUser}` : ''}${body.sipPassword ? ` password ${body.sipPassword}` : ''}`]);
  }

  disableVoIP(serial, body, location) {
    return this._runCmds(location, [`onu ${location.onu_id} voip disable`]);
  }

  updateIPTV(serial, body, location) {
    const onuId = location.onu_id;
    if (body.enable === false) return this._runCmds(location, [`onu ${onuId} iptv disable`]);
    return this._runCmds(location, [`onu ${onuId} iptv enable vlan ${body.vlanId || body.svlanId || 100}`]);
  }

  updateGponChannel(serial, body, location) {
    return this._runCmds(location, [`onu ${location.onu_id} profile line name ${body.lineProfileId || 'LINEKTONU'}`]);
  }

  updateEponChannel(serial, body, location) {
    return this._runCmds(location, [`onu ${location.onu_id} profile line name ${body.lineProfileId || 'LINEKTONU'}`]);
  }

  reallocateId(serial, body, location) {
    return this._runCmds(location, [
      `no onu ${location.onu_id}`,
      `onu add ${body.newOnuId || 1} profile default sn ${serial}`,
    ]);
  }

  setTr069Profile(serial, body, location) {
    return this._runCmds(location, [`onu ${location.onu_id} tr069 profile ${body.profileId || 'default'}`]);
  }

  firmwareUpgrade(serial, body, location) {
    return this._runCmds(location, [`onu ${location.onu_id} firmware-upgrade ${body.targetFile || ''}`]);
  }

  changeWebUserPass(serial, body, location) {
    return this._runCmds(location, [`onu ${location.onu_id} web-user ${body.webUser || 'admin'} password ${body.webPassword || 'admin'}`]);
  }

  replaceBySN(serial, body, location) {
    return this._runCmds(location, [
      `no onu ${location.onu_id}`,
      `onu add ${location.onu_id} profile default sn ${body.newSn || serial}`,
    ]);
  }

  moveONT(serial, body, location) {
    return this._runCmds(location, [`no onu ${location.onu_id}`]);
  }

  getRunningConfig(serial, body, location) {
    return this._callGlobal('show running-config');
  }

  getSwInfo(serial, body, location) {
    return this._callGlobal('show version');
  }

  // ─── Additional ONU actions (ACTION_TO_ADAPTER compat) ───────────────────
  wanSetup(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.wanMode) cmds.push(`onu ${onuId} wan-mode ${body.wanMode}`);
    if (body.vlanId) cmds.push(`onu ${onuId} svlan ${body.vlanId}`);
    if (body.pppoeUser) cmds.push(`onu ${onuId} pppoe user ${body.pppoeUser}${body.pppoePass ? ` password ${body.pppoePass}` : ''}`);
    if (body.configMethod === 'DHCP') cmds.push(`onu ${onuId} ipconfig dhcp`);
    if (body.configMethod === 'Static' && body.ip) cmds.push(`onu ${onuId} ipconfig static ip ${body.ip} mask ${body.mask || '255.255.255.0'}${body.gateway ? ` gateway ${body.gateway}` : ''}`);
    return this._runCmds(location, cmds);
  }

  ipv6(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.enable === false) cmds.push(`onu ${onuId} ipv6 disable`);
    else if (body.enable || body.ipv6Prefix) cmds.push(`onu ${onuId} ipv6 enable prefix ${body.ipv6Prefix || 'auto'}`);
    else cmds.push(`onu ${onuId} ipv6 enable`);
    return this._runCmds(location, cmds);
  }

  dnsServers(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.dns1) cmds.push(`onu ${onuId} dns primary ${body.dns1}`);
    if (body.dns2) cmds.push(`onu ${onuId} dns secondary ${body.dns2}`);
    return this._runCmds(location, cmds);
  }

  dhcpOption82(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.enable === false) cmds.push(`onu ${onuId} dhcp-option82 disable`);
    else if (body.circuitId || body.remoteId) {
      let cmd = `onu ${onuId} dhcp-option82 enable`;
      if (body.circuitId) cmd += ` circuit-id ${body.circuitId}`;
      if (body.remoteId) cmd += ` remote-id ${body.remoteId}`;
      cmds.push(cmd);
    } else {
      cmds.push(`onu ${onuId} dhcp-option82 enable`);
    }
    return this._runCmds(location, cmds);
  }

  pppoePlus(serial, body, location) {
    const cmds = [];
    const onuId = location.onu_id;
    if (body.enable === false) cmds.push(`onu ${onuId} pppoe-plus disable`);
    else cmds.push(`onu ${onuId} pppoe-plus enable${body.acName ? ` ac ${body.acName}` : ''}${body.serviceName ? ` service ${body.serviceName}` : ''}`);
    return this._runCmds(location, cmds);
  }

  // ─── authorizeONT (provisioning flow via Telnet) ─────────────────────────
  async authorizeONT(data) {
    const { board, port, serial, onuId, lineProfileId, srvProfileId, name, svlanId, userVlan, gemport, tagTransform, upstreamKbps, downstreamKbps } = data;
    const ponIndex = port || 1;
    const onu_id = onuId || 1;
    const profile = lineProfileId || srvProfileId || 'LINEKTONU';

    try {
      const tn = this._getTelnet();
      await tn.connect(this.olt);
      await tn.enable(this.olt);
      await tn.run('configure terminal');
      await tn.run(`interface gpon 0/${ponIndex}`);
      await tn.run(`onu add ${onu_id} profile ${profile} sn ${serial}`);
      if (name) await tn.run(`onu ${onu_id} desc ${name}`);
      if (lineProfileId) await tn.run(`onu ${onu_id} profile line name ${lineProfileId}`);
      if (srvProfileId) await tn.run(`onu ${onu_id} profile srv name ${srvProfileId}`);
      await tn.run(`onu ${onu_id} profile alarm name Alarm`);
      if (svlanId || userVlan) await tn.run(`onu ${onu_id} svlan ${svlanId || userVlan}`);
      if (downstreamKbps) await tn.run(`onu ${onu_id} speed downstream ${downstreamKbps}`);
      if (upstreamKbps) await tn.run(`onu ${onu_id} speed upstream ${upstreamKbps}`);
      await tn.run(`onu ${onu_id} activate`);
      this._disconnectTelnet();
      return { success: true, location: { board: 0, port: ponIndex, onu_id } };
    } catch (e) {
      this._disconnectTelnet();
      return { success: false, error: e.message, location: {} };
    }
  }

  // ─── Monitoring ──────────────────────────────────────────────────────────
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
    } catch { return []; }
  }

  async getCPUUsage() {
    if (!this.session) await this.connect();
    try {
      const vbs = await snmpConfig.walk(this.session, OIDS.cpuUsage);
      return vbs.length ? parseCounter(vbs[0]) : null;
    } catch { return null; }
  }

  async getTemperature() {
    if (!this.session) await this.connect();
    try {
      const vbs = await snmpConfig.walk(this.session, OIDS.temperature);
      return vbs.length ? parseCounter(vbs[0]) : null;
    } catch { return null; }
  }

  async getPortStats(portId) {
    try {
      const output = await this.sendCommand(`show interface gpon-port ${portId}`);
      const inMatch = output.match(/Input.*?(\d+)/i);
      const outMatch = output.match(/Output.*?(\d+)/i);
      return { portId, inOctets: inMatch ? parseInt(inMatch[1]) : 0, outOctets: outMatch ? parseInt(outMatch[1]) : 0 };
    } catch { return { portId, error: 'Failed to get stats' }; }
  }

  async detectPortType(portId) {
    return { portId, type: 'GPON' };
  }

  // ─── Batch ──────────────────────────────────────────────────────────────
  async getOpticalInfo(slotPorts) {
    const rows = [];
    for (const sp of slotPorts) {
      const ponIndex = sp.port || sp.slot || 1;
      try {
        await this._enterPonInterface(ponIndex);
        const listOut = await this.telnet.run('show onu info');
        const { parseOnuList } = require('../vsol/parser');
        const onus = parseOnuList(listOut);
        for (const onu of onus) {
          try {
            const optOut = await this.telnet.run(`show onu ${onu.onuId} optical`);
            const { parseOptical } = require('../vsol/parser');
            const opt = parseOptical(optOut);
            rows.push({
              slot: 0, port: ponIndex, ont_id: onu.onuId,
              rx_power: opt.rxPower ?? null, tx_power: opt.txPower ?? null,
              olt_rx_power: opt.oltRxPower ?? null, temperature: opt.temperature ?? null,
              voltage: opt.voltage ?? null, bias_current: opt.biasCurrent ?? null, distance: null,
            });
          } catch {}
        }
      } catch (e) {
        logger.warn(`getOpticalInfo PON${ponIndex}: ${e.message}`);
      } finally { this._disconnectTelnet(); }
    }
    return rows;
  }

  async saveConfig() {
    try {
      const tn = this._getTelnet();
      await tn.connect(this.olt);
      await tn.enable(this.olt);
      await tn.run('write');
      return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { this._disconnectTelnet(); }
  }

  async ping(host) {
    try { return await this.sendCommand(`ping ${host}`); }
    finally { this._disconnectTelnet(); }
  }
}

module.exports = KingType;
