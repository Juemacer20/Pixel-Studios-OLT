/* ─── VSOL CLI output parsers ─────────────────────────────────────────────────
 * Transforma outputs crudos de comandos VSOL en objetos JS.
 * Todos los parsers reciben string y devuelven array o objeto.
 */

const SYSLOG_LINE = /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+.*$/gm;

function clean(raw) {
  return raw
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '') // ANSI escapes
    .replace(SYSLOG_LINE, '')                  // syslog lines
    .replace(/\r/g, '')
    .trim();
}

/* ─── show onu info ──────────────────────────────────────────────────────────
 * Output format:
 *   GPON0/1:1   HG8120C    HUAWEI   sn   HWTC7CA6A566
 *   GPON0/1:2   unknown    HUAWEI   sn   HWTC0A6F4947
 */
function parseOnuList(output) {
  const text = clean(output);
  const lines = text.split('\n');
  const onus = [];

  for (const line of lines) {
    const m = line.match(/GPON0\/(\d+):(\d+)\s+([\w-]+)\s+(\S+)\s+(\S+)\s+(\S+)/);
    if (m) {
      onus.push({
        ponIndex: parseInt(m[1]),
        onuId: parseInt(m[2]),
        model: m[3] === 'unknown' ? null : m[3],
        profile: m[4],
        authMode: m[5],
        serial: m[6],
      });
    }
  }
  return onus;
}

/* ─── show onu state ─────────────────────────────────────────────────────────
 * Output format:
 *   1/1/1:1  enable  enable  working  failed  1(GPON)
 *   1/1/1:2  enable  enable  working  succeeded  1(GPON)
 *   ONU Number: 34/47
 */
function parseOnuState(output) {
  const text = clean(output);
  const lines = text.split('\n');
  const states = [];

  for (const line of lines) {
    const m = line.match(/(\d+)\/(\d+)\/(\d+):(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/);
    if (m) {
      states.push({
        stackId: parseInt(m[1]),
        slotId: parseInt(m[2]),
        ponIndex: parseInt(m[3]),
        onuId: parseInt(m[4]),
        adminState: m[5],
        omccState: m[6],
        phaseState: m[7],
        configState: m[8],
      });
    }
  }
  return states;
}

/* ─── show onu X optical ─────────────────────────────────────────────────────
 * Output format:
 *   Rx optical level: -19.666(dBm)
 *   Lower rx optical threshold: -27.0(dBm)
 *   Upper rx optical threshold: -8.0(dBm)
 *   Tx optical level: 1.906(dBm)
 *   Temperature: 31.000(C)
 *   Power feed voltage: 3.26(V)
 *   Laser bias current: 9.000(mA)
 *   ONU response time: 35999
 */
function parseOptical(output) {
  const text = clean(output);
  const result = {};

  const patterns = {
    rxPower: /Rx optical level:\s*([-\d.]+)/,
    rxLowerThreshold: /Lower rx optical threshold:\s*([-\d.]+)/,
    rxUpperThreshold: /Upper rx optical threshold:\s*([-\d.]+)/,
    txPower: /Tx optical level:\s*([-\d.]+)/,
    txLowerThreshold: /Lower tx optical threshold:\s*([-\d.]+)/,
    txUpperThreshold: /Upper tx optical threshold:\s*([-\d.]+)/,
    temperature: /Temperature:\s*([\d.]+)/,
    voltage: /Power feed voltage:\s*([\d.]+)/,
    biasCurrent: /Laser bias current:\s*([\d.]+)/,
    responseTime: /ONU response time:\s*(\d+)/,
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const m = text.match(regex);
    if (m) result[key] = parseFloat(m[1]);
  }

  return result;
}

/* ─── show onu X statistics ──────────────────────────────────────────────────
 * Output format:
 *   Input rate(Bps): 4176
 *   Input rate(pps): 18
 *   Output rate(Bps): 14107
 *   Output rate(pps): 84
 *   Input bytes: 898496204
 *   Output bytes: 2930218002
 *   Input packets: 4333206
 *   Output packets: 19858110
 */
function parseStats(output) {
  const text = clean(output);
  const result = {};

  const patterns = {
    inputRateBps: /Input rate\(Bps\):\s*([\d.]+)/,
    inputRatePps: /Input rate\(pps\):\s*([\d.]+)/,
    outputRateBps: /Output rate\(Bps\):\s*([\d.]+)/,
    outputRatePps: /Output rate\(pps\):\s*([\d.]+)/,
    inputBandwidth: /Input bandwidth thoughput:\s*([\d.]+%)/,
    outputBandwidth: /Output bandwidth thoughput:\s*(\S+)/,
    inputBytes: /Input bytes:\s*(\d+)/,
    inputPackets: /Input packets:\s*(\d+)/,
    outputBytes: /Output bytes:\s*(\d+)/,
    outputPackets: /Output packets:\s*(\d+)/,
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const m = text.match(regex);
    if (m) {
      result[key] = m[1] === 'N/A' ? null : (isNaN(m[1]) ? m[1] : parseFloat(m[1]));
    }
  }

  return result;
}

/* ─── show onu X eth ─────────────────────────────────────────────────────────
 * Output format:
 *   Interface: eth_0/1
 *   Speed status: auto
 *   Operate status: enable
 *   Admin status: unlock
 *   Interface: eth_0/2
 *   Speed status: full-100
 *   Operate status: enable
 */
function parseEthPorts(output) {
  const text = clean(output);
  const ports = [];
  let current = null;

  for (const line of text.split('\n')) {
    const iface = line.match(/Interface:\s*eth_(\d+)\/(\d+)/);
    if (iface) {
      if (current) ports.push(current);
      current = { portIndex: parseInt(iface[2]), speed: null, operStatus: null, adminStatus: null };
      continue;
    }
    if (!current) continue;

    const speed = line.match(/Speed status:\s*(\S+)/);
    if (speed) current.speed = speed[1];

    const oper = line.match(/Operate status:\s*(\S+)/);
    if (oper) current.operStatus = oper[1];

    const admin = line.match(/Admin status:\s*(\S+)/);
    if (admin) current.adminStatus = admin[1];
  }
  if (current) ports.push(current);

  return ports;
}

/* ─── show onu X distance ────────────────────────────────────────────────────
 * Output: "onu 1 Distance: 1293m"
 */
function parseDistance(output) {
  const text = clean(output);
  const m = text.match(/Distance:\s*(\d+)m/);
  return m ? parseInt(m[1]) : null;
}

/* ─── show onu X profile ─────────────────────────────────────────────────────
 * Output:
 *   onu id: 1
 *   line profile name: HUAWEI
 *   srv profile name: HUAWEI
 *   alarm profile name: Alarm
 */
function parseProfile(output) {
  const text = clean(output);
  const result = {};
  const mLine = text.match(/line profile name:\s*(\S+)/);
  const mSrv = text.match(/srv profile name:\s*(\S+)/);
  const mAlarm = text.match(/alarm profile name:\s*(\S+)/);

  if (mLine) result.lineProfile = mLine[1];
  if (mSrv) result.srvProfile = mSrv[1];
  if (mAlarm) result.alarmProfile = mAlarm[1];

  return result;
}

/* ─── merge ONU info + state + optical (página detail) ───────────────────── */
function mergeOnuDetail(info, state, optical, stats, eth, distance, profile) {
  return {
    ...info,
    ...(state || {}),
    ...(optical || {}),
    ...(stats || {}),
    ethPorts: eth || [],
    distance: distance || null,
    profiles: profile || {},
  };
}

module.exports = {
  parseOnuList,
  parseOnuState,
  parseOptical,
  parseStats,
  parseEthPorts,
  parseDistance,
  parseProfile,
  mergeOnuDetail,
  clean,
};
