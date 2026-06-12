const SNMPHuawei = require('./snmpHuawei');
const TelnetHuawei = require('./telnetHuawei');
const logger = require('../../middleware/logger');

// Parser de la descripción SmartOLT (.43.1.9), formato típico:
//   "<extid>___<cliente>_zone_<zona>_descr_<descr>_odb_<odb>_"
function parseSmartoltDesc(s) {
  if (!s || typeof s !== 'string') return {};
  const between = (a, b) => {
    const i = s.indexOf(a); if (i < 0) return null;
    const from = i + a.length;
    const j = b ? s.indexOf(b, from) : -1;
    const v = (j >= 0 ? s.slice(from, j) : s.slice(from)).trim();
    return v || null;
  };
  let zone = between('_zone_', '_descr_');
  const descr = between('_descr_', '_odb_');
  let odb = between('_odb_', null);
  if (odb) { const k = odb.indexOf('_extid_'); if (k >= 0) odb = odb.slice(0, k); odb = odb.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || null; }
  if (zone) zone = zone.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || null;
  const head = s.indexOf('_zone_') >= 0 ? s.slice(0, s.indexOf('_zone_')) : s;
  let external_id = null, contact = null;
  const parts = head.split('___');
  if (parts.length >= 2) { external_id = parts[0].trim() || null; contact = parts.slice(1).join(' ').replace(/_/g, ' ').trim() || null; }
  else { contact = head.replace(/_/g, ' ').trim() || null; }
  return { external_id, contact, zone, descr, odb };
}

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
    // SCAN RÁPIDO: lista de ONTs por TELNET + info de cliente/zona/ODB por SNMP.
    // La óptica (RX/TX/temp) NO se trae acá: la llena el poll de señal cada 5 min
    // (adapter.getOpticalInfo por telnet), para que agregar/editar una OLT sea ágil.
    let onts = [];
    try {
      onts = await this._listONTsDirectTelnet();
    } catch (err) {
      logger.error(`MA5800 listONTs telnet ${this.olt.ip}: ${err.message}`);
      return [];
    }
    if (!onts.length) return [];

    // Info cliente/zona/ODB por SNMP (descripción .43.1.9, rápida)
    try {
      if (!this.snmp.session) this.snmp.connect();
      const items = onts.map((o) => ({ slot: o.slot, port: o.pon_port, ontId: o.onu_id }));
      const descMap = await this.snmp.getDescriptionsForOnts(items);
      let filled = 0;
      for (const o of onts) {
        const p = parseSmartoltDesc(descMap.get(`${o.slot}/${o.pon_port}/${o.onu_id}`));
        if (p.external_id) o.external_id = p.external_id;
        if (p.contact) o.contact = p.contact;
        if (p.zone) o.zone = p.zone;
        if (p.odb) o.odb = p.odb;
        if (p.contact || p.zone || p.odb) filled++;
      }
      logger.info(`MA5800 listONTs ${this.olt.ip}: ${onts.length} ONTs (telnet), cliente/zona SNMP en ${filled}`);
    } catch (e) { logger.warn(`MA5800 info SNMP ${this.olt.ip}: ${e.message}`); }

    return onts;
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
        slot: parseInt(slot),
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

  /**
   * Fetch optical info for ONTs. Requires the `interface gpon 0/<slot>` context;
   * the command is `display ont optical-info <port> all` (port goes in the command,
   * not in each row). Receives the list of {slot, port} pairs that actually have ONTs
   * (derived from the ONT scan) to avoid probing all 16 ports blindly.
   * Returns rows: { slot, port, ont_id, rx_power, tx_power, olt_rx_power, temperature, voltage, bias_current, distance }.
   */
  // Óptica por telnet (rápido, comando en bloque por puerto). La usa el poll de
  // señal cada 5 min (signalHistory). El scan NO la llama (scan rápido).
  async getOpticalInfo(slotPorts) {
    return this._getOpticalInfoTelnet(slotPorts);
  }

  async _getOpticalInfoTelnet(slotPorts) {
    const net = require('net');
    const creds = this.telnet._getCredentials();
    if (!creds.password) return [];

    // Default: derive nothing → fall back to slot 1 port 0
    let pairs = Array.isArray(slotPorts) && slotPorts.length
      ? slotPorts
      : [{ slot: 1, port: 0 }];
    // Dedup
    const seen = new Set();
    pairs = pairs.filter(p => { const k = `${p.slot}/${p.port}`; if (seen.has(k)) return false; seen.add(k); return true; });
    logger.info(`MA5800 getOpticalInfo ${this.olt.ip}: ${pairs.length} slot/port pairs`);

    const PROMPT = /MA5800[^#>\r\n]*[#>]/;
    const MORE   = /---- More|More \( Press/;
    const CR_PROMPT = /\{ <cr>/;

    const sock = new net.Socket();
    let buf = '';
    sock.on('data', d => { for (const b of d) { if (b < 0xf0) buf += String.fromCharCode(b); } });

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

      await waitFor([/User name:|Username:|Login:/i], 10000);
      buf = ''; sock.write((creds.username || 'admin') + '\r\n');
      await waitFor([/User password:|Password:/i], 8000);
      buf = ''; sock.write(creds.password + '\r\n');
      await waitFor([/MA5800[^#>\r\n]*>/], 10000);
      buf = ''; sock.write('enable\r\n');
      await waitFor([/MA5800[^#>\r\n]*#/], 6000);
      buf = ''; sock.write('config\r\n');
      await waitFor([/MA5800\(config\)#/], 6000);

      // Collect paginated output until prompt
      const collect = async (cmd, pageTimeout = 15000) => {
        buf = '';
        sock.write(cmd + '\r\n');
        let out = '';
        let hit = await waitFor([CR_PROMPT, MORE, PROMPT], pageTimeout);
        while (true) {
          out += buf; buf = '';
          if (hit === CR_PROMPT) { sock.write('\r\n'); }
          else if (hit === MORE) { sock.write(' '); }
          else break;
          hit = await waitFor([CR_PROMPT, MORE, PROMPT], pageTimeout);
          if (hit === null) { out += buf; buf = ''; break; }
        }
        return out;
      };

      let allOptical = [];
      let currentSlot = null;
      for (const { slot, port } of pairs) {
        if (slot !== currentSlot) {
          // Leave previous interface context, enter the new slot's
          if (currentSlot !== null) { await collect('quit'); }
          await collect(`interface gpon 0/${slot}`);
          currentSlot = slot;
        }
        const raw = await collect(`display ont optical-info ${port} all`);
        const parsed = this._parseOpticalInfoTable(raw, parseInt(slot), parseInt(port));
        allOptical = allOptical.concat(parsed);
        logger.info(`MA5800 getOpticalInfo ${this.olt.ip}: slot ${slot} port ${port} → ${parsed.length} rows`);
      }

      sock.destroy();
      logger.info(`MA5800 getOpticalInfo ${this.olt.ip}: total ${allOptical.length} rows`);
      return allOptical;
    } catch (e) {
      logger.error(`MA5800 getOpticalInfo ${this.olt.ip}: ${e.message}`);
      try { sock.destroy(); } catch {}
      return [];
    }
  }

  /**
   * Parse `display ont optical-info <port> all` output. Rows are:
   *   ONT_ID  Rx(dBm)  Tx(dBm)  OLT-Rx(dBm)  Temp(C)  Volt(V)  Curr(mA)  Dist(m)
   * The port is NOT in each row — it comes from the command, passed in.
   */
  _parseOpticalInfoTable(raw, slot, port) {
    const results = [];
    for (const line of raw.split('\n')) {
      // Columns: ONT_ID  Rx  Tx  OLT_Rx  Temp  Voltage  Current  [Distance]
      // Distance is present on some firmware variants (Santa Ana) and absent on others (Feliciano).
      const m = line.match(
        /^\s*(\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)(?:\s+(\d+))?\s*$/
      );
      if (!m) continue;
      const [, ontId, rx, tx, oltRx, temp, volt, curr, dist] = m;
      results.push({
        slot,
        port,
        ont_id: parseInt(ontId),
        rx_power:     parseFloat(rx),
        tx_power:     parseFloat(tx),
        olt_rx_power: parseFloat(oltRx),
        temperature:  parseFloat(temp),
        voltage:      parseFloat(volt),
        bias_current: parseFloat(curr),
        distance:     dist != null ? parseInt(dist) : undefined,
      });
    }
    return results;
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

  async getInterfaceTraffic() {
    return this.snmp.getInterfaceTraffic();
  }

  async sendCommand(cmd) {
    if (!this.telnet.connected) await this.telnet.connect();
    return this.telnet.sendCommand(cmd);
  }

  async detectPortType(portId) {
    return { portId, type: 'GPON' };
  }

  // ── ONU action layer (write commands via raw Telnet session) ─────────────────
  //
  // Huawei MA5800 ONT commands require the `interface gpon 0/<board>` context.
  // Existing ONTs lack board/port/onu_id in DB, so each action resolves the ONT's
  // physical location by serial number at execution time via `display ont info by-sn`.

  /**
   * Open a Telnet session, log in, run `fn(collect)` where `collect(cmd)` sends a
   * command and returns its full (paginated) output, then close. Mirrors the raw
   * socket pattern used in getOpticalInfo. `opts.config` enters `enable`+`config`.
   */
  async _session(fn, opts = {}) {
    const net = require('net');
    const creds = this.telnet._getCredentials();
    if (!creds.password) throw Object.assign(new Error('No telnet credentials for OLT'), { status: 400 });

    const PROMPT = /MA5800[^#>\r\n]*[#>]/;
    const MORE = /---- More|More \( Press/;
    const CR_PROMPT = /\{ <cr>/;
    const FAILURE = /Failure|Error|invalid|Unknown command|incomplete/i;

    const sock = new net.Socket();
    let buf = '';
    sock.on('data', d => { for (const b of d) { if (b < 0xf0) buf += String.fromCharCode(b); } });

    const waitFor = (regexes, timeoutMs) => new Promise((resolve) => {
      const start = Date.now();
      const iv = setInterval(() => {
        const hit = regexes.find(r => r.test(buf));
        if (hit) { clearInterval(iv); resolve(hit); }
        else if (Date.now() - start > timeoutMs) { clearInterval(iv); resolve(null); }
      }, 80);
    });

    const collect = async (cmd, pageTimeout = 12000) => {
      buf = '';
      sock.write(cmd + '\r\n');
      let out = '';
      let hit = await waitFor([CR_PROMPT, MORE, PROMPT], pageTimeout);
      while (true) {
        out += buf; buf = '';
        if (hit === CR_PROMPT) { sock.write('\r\n'); }
        else if (hit === MORE) { sock.write(' '); }
        else break;
        hit = await waitFor([CR_PROMPT, MORE, PROMPT], pageTimeout);
        if (hit === null) { out += buf; buf = ''; break; }
      }
      return out;
    };

    try {
      await new Promise((res, rej) => {
        const to = setTimeout(() => rej(new Error('connect timeout')), 15000);
        sock.once('error', e => { clearTimeout(to); rej(e); });
        sock.connect(23, this.olt.ip, () => { clearTimeout(to); res(); });
      });
      await waitFor([/User name:|Username:|Login:/i], 10000);
      buf = ''; sock.write((creds.username || 'admin') + '\r\n');
      await waitFor([/User password:|Password:/i], 8000);
      buf = ''; sock.write(creds.password + '\r\n');
      await waitFor([/MA5800[^#>\r\n]*>/], 10000);
      buf = ''; sock.write('enable\r\n');
      await waitFor([/MA5800[^#>\r\n]*#/], 6000);
      if (opts.config !== false) {
        buf = ''; sock.write('config\r\n');
        await waitFor([/MA5800\(config\)#/], 6000);
      }
      const result = await fn(collect, { FAILURE });
      sock.destroy();
      return result;
    } catch (e) {
      try { sock.destroy(); } catch {}
      throw e;
    }
  }

  /** Resolve {board, port, onu_id} from a serial number. Returns null if not found. */
  async _resolveBySn(serial, collect) {
    const out = await collect(`display ont info by-sn ${serial}`);
    // F/S/P : 0/ 2/1   and   ONT-ID : 12
    const fsp = out.match(/F\/S\/P\s*:\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/i);
    const id = out.match(/ONT-ID\s*:\s*(\d+)/i);
    if (!fsp || !id) return null;
    return { board: parseInt(fsp[2]), port: parseInt(fsp[3]), onu_id: parseInt(id[1]) };
  }

  /**
   * Run a sequence of ONT action commands against an ONT identified by serial.
   * `buildCmds({board, port, onu_id})` returns an array of command strings to run
   * inside `interface gpon 0/<board>`. Saves config at the end.
   */
  async _ontAction(serial, location, buildCmds) {
    return this._session(async (collect, { FAILURE }) => {
      let loc = location && location.board != null && location.onu_id != null ? location : null;
      if (!loc) loc = await this._resolveBySn(serial, collect);
      if (!loc) throw Object.assign(new Error(`ONT ${serial} not found on OLT`), { status: 404 });

      await collect(`interface gpon 0/${loc.board}`);
      const outputs = [];
      let failed = false;
      for (const cmd of buildCmds(loc)) {
        const out = await collect(cmd);
        outputs.push({ cmd, out: out.trim().slice(-400) });
        if (FAILURE.test(out)) failed = true;
      }
      await collect('quit');
      await collect('save');
      return { success: !failed, location: loc, outputs };
    });
  }

  // Action command builders ----------------------------------------------------
  changeOntType(serial, { lineProfileId, srvProfileId }, location) {
    return this._ontAction(serial, location, (l) => {
      const cmds = [];
      if (lineProfileId) cmds.push(`ont modify ${l.port} ${l.onu_id} ont-lineprofile-id ${lineProfileId}`);
      if (srvProfileId) cmds.push(`ont modify ${l.port} ${l.onu_id} ont-srvprofile-id ${srvProfileId}`);
      return cmds.length ? cmds : [`ont modify ${l.port} ${l.onu_id}`];
    });
  }

  configureSpeedProfile(serial, { svlanId, userVlan, gemport = 1, tagTransform = 'translate', upstreamKbps, downstreamKbps }, location) {
    return this._ontAction(serial, location, (l) => {
      const cmds = [];
      if (svlanId) cmds.push(`ont port vlan ${l.port} ${l.onu_id} eth 1 vlan ${userVlan || svlanId}`);
      if (upstreamKbps && downstreamKbps) {
        cmds.push(`traffic-limit ont ${l.port} ${l.onu_id} gemport ${gemport} upstream ${upstreamKbps} downstream ${downstreamKbps}`);
      }
      return cmds.length ? cmds : [`display ont info ${l.port} ${l.onu_id}`];
    });
  }

  enableONT(serial, location)  { return this._ontAction(serial, location, (l) => [`ont activate ${l.port} ${l.onu_id}`]); }
  disableONT(serial, location) { return this._ontAction(serial, location, (l) => [`ont deactivate ${l.port} ${l.onu_id}`]); }
  startONT(serial, location)   { return this._ontAction(serial, location, (l) => [`ont activate ${l.port} ${l.onu_id}`]); }
  stopONT(serial, location)    { return this._ontAction(serial, location, (l) => [`ont deactivate ${l.port} ${l.onu_id}`]); }
  resyncONT(serial, location)  { return this._ontAction(serial, location, (l) => [`ont reset ${l.port} ${l.onu_id}`]); }
  restoreDefaults(serial, location) { return this._ontAction(serial, location, (l) => [`ont factory-reset ${l.port} ${l.onu_id}`]); }

  changeWebUserPass(serial, { webUser = 'admin', webPassword }, location) {
    return this._ontAction(serial, location, (l) => [
      `ont wan-config ${l.port} ${l.onu_id} ip-index 0 username ${webUser} password ${webPassword}`,
    ]);
  }

  replaceBySN(serial, { newSn }, location) {
    return this._ontAction(serial, location, (l) => [`ont replace ${l.port} ${l.onu_id} sn-auth ${newSn} omci`]);
  }

  moveONT(serial, { targetBoard, targetPort }, location) {
    return this._ontAction(serial, location, (l) => [`ont move ${l.port} ${l.onu_id} 0 ${targetBoard} ${targetPort}`]);
  }

  updateVLANs(serial, { vlanId, ethPort = 1 }, location) {
    return this._ontAction(serial, location, (l) => [`ont port vlan ${l.port} ${l.onu_id} eth ${ethPort} vlan ${vlanId}`]);
  }

  /** Delete the ONT from the OLT entirely. */
  deleteONTFromOLT(serial, location) {
    return this._ontAction(serial, location, (l) => [`ont delete ${l.port} ${l.onu_id}`]);
  }

  updateMode(serial, { ethPort = 1, vlanId, linkType = 'access' }, location) {
    return this._ontAction(serial, location, (l) => {
      const cmds = [`ont port link-type ${l.port} ${l.onu_id} eth ${ethPort} type ${linkType}`];
      if (vlanId) cmds.push(`ont port native-vlan ${l.port} ${l.onu_id} eth ${ethPort} vlan ${vlanId}`);
      return cmds;
    });
  }

  updateMgmtIP(serial, { ip, mask, gateway, vlanId }, location) {
    return this._ontAction(serial, location, (l) => {
      if (ip) return [`ont ipconfig ${l.port} ${l.onu_id} static ip-address ${ip} mask ${mask || '255.255.255.0'}${gateway ? ` gateway ${gateway}` : ''}${vlanId ? ` vlan ${vlanId}` : ''}`];
      return [`ont ipconfig ${l.port} ${l.onu_id} dhcp${vlanId ? ` vlan ${vlanId}` : ''}`];
    });
  }

  configureEthernetPort(serial, { ethPort = 1, vlanId, enabled = true }, location) {
    return this._ontAction(serial, location, (l) => {
      const cmds = [];
      if (vlanId) cmds.push(`ont port native-vlan ${l.port} ${l.onu_id} eth ${ethPort} vlan ${vlanId}`);
      cmds.push(`ont port attribute ${l.port} ${l.onu_id} eth ${ethPort} operational-state ${enabled ? 'enable' : 'disable'}`);
      return cmds;
    });
  }

  configureWiFiPort(serial, { ssid, password, enabled = true }, location) {
    // WiFi sobre ONT vía OMCI extendido (depende de firmware); comando best-effort.
    return this._ontAction(serial, location, (l) => {
      const cmds = [];
      if (ssid) cmds.push(`ont wifi-config ${l.port} ${l.onu_id} ssid ${ssid}${password ? ` wpa-key ${password}` : ''}`);
      cmds.push(`ont wifi-config ${l.port} ${l.onu_id} state ${enabled ? 'enable' : 'disable'}`);
      return cmds;
    });
  }

  configureVoIP(serial, { phoneNumber, sipUser, sipPassword, enable = true }, location) {
    return this._ontAction(serial, location, (l) => {
      if (!enable) return [`ont voip-config ${l.port} ${l.onu_id} disable`];
      return [`ont voip-config ${l.port} ${l.onu_id} pots 1 telno ${phoneNumber || ''} sip-user ${sipUser || ''} sip-pwd ${sipPassword || ''}`];
    });
  }

  disableVoIP(serial, location) {
    return this._ontAction(serial, location, (l) => [`ont voip-config ${l.port} ${l.onu_id} disable`]);
  }

  updateIPTV(serial, { svlanId, userVlan, enable = true }, location) {
    return this._ontAction(serial, location, (l) => {
      if (!enable) return [`undo ont port vlan ${l.port} ${l.onu_id} eth 1`];
      return [`ont port vlan ${l.port} ${l.onu_id} eth 1 vlan ${userVlan || svlanId}`];
    });
  }

  updateGponChannel(serial, { lineProfileId }, location) {
    return this._ontAction(serial, location, (l) => [`ont modify ${l.port} ${l.onu_id} ont-lineprofile-id ${lineProfileId}`]);
  }

  updateEponChannel(serial, { lineProfileId }, location) {
    return this._ontAction(serial, location, (l) => [`ont modify ${l.port} ${l.onu_id} ont-lineprofile-id ${lineProfileId}`]);
  }

  reallocateId(serial, { newOnuId }, location) {
    // Huawei no reasigna ONT-ID in situ; se elimina y re-agrega con el nuevo id.
    return this._ontAction(serial, location, (l) => [
      `ont delete ${l.port} ${l.onu_id}`,
      `ont add ${l.port} ${newOnuId} sn-auth ${serial} omci ont-lineprofile-id 1`,
    ]);
  }

  setTr069Profile(serial, { acsProfileId }, location) {
    return this._ontAction(serial, location, (l) => [`ont tr069-config ${l.port} ${l.onu_id} profile-id ${acsProfileId}`]);
  }

  firmwareUpgrade(serial, { targetFile }, location) {
    return this._ontAction(serial, location, (l) => [`ont-version auto-update ${l.port} ${l.onu_id}${targetFile ? ` file ${targetFile}` : ''}`]);
  }

  // Read-only actions -----------------------------------------------------------
  async getRunningConfig(serial, location) {
    return this._ontAction(serial, location, (l) => [`display ont info ${l.port} ${l.onu_id}`]);
  }

  async getSwInfo(serial, location) {
    return this._ontAction(serial, location, (l) => [`display ont version ${l.port} ${l.onu_id}`]);
  }

  /**
   * Authorize (provision) a new ONU on the OLT.
   * data: { board, port, serial, onuId?, lineProfileId, srvProfileId, name,
   *         svlanId, userVlan, gemport, tagTransform, upstreamKbps, downstreamKbps }
   * If onuId is omitted, picks the next free ONT-ID on the port.
   */
  async authorizeONT(data) {
    const board = data.board;
    const port = data.port;
    if (board == null || port == null || !data.serial) {
      throw Object.assign(new Error('board, port and serial are required to authorize'), { status: 400 });
    }
    return this._session(async (collect, { FAILURE }) => {
      await collect(`interface gpon 0/${board}`);

      // Resolve a free ONT-ID on the port if not provided.
      let onuId = data.onuId;
      if (onuId == null) {
        const info = await collect(`display ont info ${port} all`);
        const used = [...info.matchAll(/^\s*\d+\s+(\d+)\s+/gm)].map((m) => parseInt(m[1]));
        onuId = used.length ? Math.max(...used) + 1 : 0;
      }

      const outputs = [];
      let failed = false;
      const lp = data.lineProfileId || 1;
      let addCmd = `ont add ${port} ${onuId} sn-auth ${data.serial} omci ont-lineprofile-id ${lp}`;
      if (data.srvProfileId) addCmd += ` ont-srvprofile-id ${data.srvProfileId}`;
      if (data.name) addCmd += ` desc "${String(data.name).slice(0, 32)}"`;
      let out = await collect(addCmd);
      outputs.push({ cmd: addCmd, out: out.trim().slice(-400) });
      if (FAILURE.test(out)) failed = true;

      // Native VLAN on eth1 if a user VLAN was given.
      if (data.userVlan || data.svlanId) {
        const vcmd = `ont port native-vlan ${port} ${onuId} eth 1 vlan ${data.userVlan || data.svlanId}`;
        out = await collect(vcmd);
        outputs.push({ cmd: vcmd, out: out.trim().slice(-300) });
      }
      await collect('quit'); // leave interface context for service-port

      // Service-port binds the ONU to the S-VLAN.
      if (data.svlanId) {
        const tt = data.tagTransform || 'translate';
        const spcmd = `service-port vlan ${data.svlanId} gpon 0/${board}/${port} ont ${onuId} gemport ${data.gemport || 1} multi-service user-vlan ${data.userVlan || data.svlanId} tag-transform ${tt}`;
        out = await collect(spcmd);
        outputs.push({ cmd: spcmd, out: out.trim().slice(-300) });
        if (FAILURE.test(out)) failed = true;
      }

      await collect('save');
      return { success: !failed, location: { board, port, onu_id: onuId }, outputs };
    });
  }
}

module.exports = MA5800;
