const net = require('net');

// Prompt pattern matches any VSOL CLI mode:
// gpon-olt>  gpon-olt#  gpon-olt(config)#  gpon-olt(config-pon-0/1)#
const PROMPT = /gpon-olt[^#>\r\n]*[#>]\s*$/m;
// Strip syslog event lines: "2026/06/03 07:40:34   ONU Online  ..."
const SYSLOG_LINE = /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+.*$/gm;

function getCreds(olt) {
  if (olt.credentials_encrypted) {
    try { return require('../../utils/encryption').decryptCredentials(olt.credentials_encrypted) || {}; } catch { return {}; }
  }
  return {};
}

class TelnetSession {
  constructor() {
    this.socket = null;
    this._buf = '';
    this._waiters = [];
  }

  connect(olt) {
    const creds = getCreds(olt);
    if (!creds.password) return Promise.reject(new Error('No credentials stored for this OLT'));
    return new Promise((resolve, reject) => {
      const sock = new net.Socket();
      this.socket = sock;
      const gtout = setTimeout(() => { sock.destroy(); reject(new Error('Telnet connect timeout')); }, 20000);

      sock.connect(23, olt.ip);
      sock.on('data', d => { this._buf += d.toString().replace(/\xff[\xfb-\xfe][\s\S]/g, '').replace(/\xff[\xf0-\xfa]/g, ''); this._dispatch(); });
      sock.on('error', e => { clearTimeout(gtout); reject(e); });
      sock.on('close', () => {});

      this._wait(/[Ll]ogin:/i, 12000)
        .then(() => { sock.write((creds.username || 'admin') + '\r\n'); return this._wait(/[Pp]assword:/i, 8000); })
        .then(() => { sock.write(creds.password + '\r\n'); return this._wait(PROMPT, 10000); })
        .then(() => { clearTimeout(gtout); resolve(); })
        .catch(e => { clearTimeout(gtout); sock.destroy(); reject(new Error(`Login failed: ${e.message}`)); });
    });
  }

  async enable(olt) {
    const creds = getCreds(olt);
    this._buf = '';
    this.socket.write('enable\r\n');
    await this._wait(/[Pp]assword:|gpon-olt#/m, 6000);
    if (/[Pp]assword:/.test(this._buf)) {
      this._buf = '';
      this.socket.write(creds.password + '\r\n');
      await this._wait(/gpon-olt#/m, 6000);
    }
    // Disable pagination and syslog streaming
    await this.run('terminal length 0');
  }

  async run(cmd, timeoutMs = 12000) {
    this._buf = '';
    this.socket.write(cmd + '\r\n');
    const raw = await this._wait(PROMPT, timeoutMs).catch(() => this._buf);
    return this._clean(cmd, raw);
  }

  // Run a batch of commands, returning { key: output } map
  async batch(cmds) {
    const results = {};
    for (const [key, cmd] of Object.entries(cmds)) {
      try { results[key] = await this.run(cmd); }
      catch { results[key] = ''; }
    }
    return results;
  }

  disconnect() {
    if (this.socket) {
      try { this.socket.write('exit\r\n'); } catch {}
      setTimeout(() => { try { this.socket.destroy(); } catch {} }, 300);
      this.socket = null;
    }
  }

  _clean(cmd, raw) {
    return raw
      .replace(SYSLOG_LINE, '')           // strip syslog lines
      .replace(/^\s*\r?\n/, '')           // strip leading blank
      .replace(PROMPT, '')                // strip final prompt
      .replace(new RegExp(`^.*${escRe(cmd)}.*\\r?\\n?`, 'm'), '') // strip echoed cmd
      .replace(/\r/g, '')
      .trim();
  }

  _wait(pattern, ms) {
    return new Promise((resolve, reject) => {
      if (pattern.test(this._buf)) { const r = this._buf; this._buf = ''; return resolve(r); }
      const id = Symbol();
      const t = setTimeout(() => {
        this._waiters = this._waiters.filter(w => w.id !== id);
        reject(new Error(`Timeout waiting for ${pattern}`));
      }, ms);
      this._waiters.push({
        id,
        check: () => pattern.test(this._buf),
        done: () => { clearTimeout(t); const r = this._buf; this._buf = ''; resolve(r); },
      });
    });
  }

  _dispatch() {
    this._waiters = this._waiters.filter(w => { if (w.check()) { w.done(); return false; } return true; });
  }
}

function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module.exports = TelnetSession;
