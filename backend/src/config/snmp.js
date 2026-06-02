const snmp = require('net-snmp');

const DEFAULT_OPTIONS = {
  port: 161,
  retries: parseInt(process.env.SNMP_RETRIES) || 3,
  timeout: parseInt(process.env.SNMP_TIMEOUT) || 5000,
  backoff: 1.0,
  transport: 'udp4',
  trapPort: 162,
  version: snmp.Version2c,
  idBitsSize: 32,
};

function createSession(host, community, options = {}) {
  return snmp.createSession(host, community, { ...DEFAULT_OPTIONS, ...options });
}

function get(session, oids) {
  return new Promise((resolve, reject) => {
    session.get(oids, (error, varbinds) => {
      if (error) return reject(error);
      const result = {};
      varbinds.forEach((vb, i) => {
        if (snmp.isVarbindError(vb)) {
          result[oids[i]] = null;
        } else {
          result[oids[i]] = vb.value;
        }
      });
      resolve(result);
    });
  });
}

function getNext(session, oids) {
  return new Promise((resolve, reject) => {
    session.getNext(oids, (error, varbinds) => {
      if (error) return reject(error);
      resolve(varbinds);
    });
  });
}

function walk(session, oid) {
  return new Promise((resolve, reject) => {
    const results = [];
    session.walk(oid, 20, (varbinds) => {
      varbinds.forEach((vb) => {
        if (!snmp.isVarbindError(vb)) results.push(vb);
      });
    }, (error) => {
      if (error) return reject(error);
      resolve(results);
    });
  });
}

module.exports = { createSession, get, getNext, walk, DEFAULT_OPTIONS };
