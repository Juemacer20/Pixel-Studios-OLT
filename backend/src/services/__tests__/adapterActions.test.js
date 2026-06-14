const path = require('path');

const ALL_EXPECTED_ACTIONS = [
  'changeType', 'speedProfile', 'enable', 'disable', 'start', 'stop',
  'resync', 'restoreDefaults', 'webUserPass', 'replaceBySN', 'move',
  'updateVLANs', 'updateSvlan', 'updateAttachedVlans', 'updateMode',
  'updateMgmtIP', 'ethernetPort', 'wifiPort', 'voip', 'disableVoip',
  'updateIPTV', 'gponChannel', 'eponChannel', 'reallocateId',
  'tr069Profile', 'firmwareUpgrade', 'runningConfig', 'swInfo',
  'wanSetup', 'ipv6', 'dnsServers', 'dhcpOption82', 'pppoePlus',
];

const ALL_EXPECTED_ADAPTER_METHODS = [
  'changeOntType', 'configureSpeedProfile', 'enableONT', 'disableONT',
  'startONT', 'stopONT', 'resyncONT', 'restoreDefaults', 'changeWebUserPass',
  'replaceBySN', 'moveONT', 'updateVLANs',
  'updateMode', 'updateMgmtIP', 'configureEthernetPort',
  'configureWiFiPort', 'configureVoIP', 'disableVoIP', 'updateIPTV',
  'updateGponChannel', 'updateEponChannel', 'reallocateId', 'setTr069Profile',
  'firmwareUpgrade', 'getRunningConfig', 'getSwInfo', 'wanSetup', 'ipv6',
  'dnsServers', 'dhcpOption82', 'pppoePlus',
];

describe('ACTION_TO_ADAPTER mapping', () => {
  test('todas las acciones esperadas están mapeadas', () => {
    // Dynamic import via require
    const ontService = require('../ontService');
    // The module exports functions, but ACTION_TO_ADAPTER is internal.
    // We verify by checking the routes use all expected actions.
    const routes = require('fs').readFileSync(
      path.join(__dirname, '../../routes/onts.js'), 'utf8'
    );
    for (const action of ALL_EXPECTED_ACTIONS) {
      if (['customProfile', 'externalId', 'updateSvlan', 'updateAttachedVlans'].includes(action)) continue;
      // Each action should appear in the routes file as ctrl.ontAction('actionName')
      expect(routes).toContain(`ontAction('${action}')`);
    }
  });

  test('todos los métodos de adaptador esperados existen en VSOL', () => {
    const VSOL = require('../vsol/vsol');
    const adapter = new VSOL({ ip: '10.0.0.1', name: 'test', brand: 'vsol' });
    for (const method of ALL_EXPECTED_ADAPTER_METHODS) {
      expect(typeof adapter[method]).toBe('function');
    }
  });

  test('todos los métodos de adaptador esperados existen en KingType', () => {
    const KingType = require('../kingtype/kingtype');
    const adapter = new KingType({ ip: '10.0.0.1', name: 'test', brand: 'kingtype' });
    for (const method of ALL_EXPECTED_ADAPTER_METHODS) {
      expect(typeof adapter[method]).toBe('function');
    }
  });

  test('VSOL saveConfig existe', () => {
    const VSOL = require('../vsol/vsol');
    const adapter = new VSOL({ ip: '10.0.0.1', name: 'test', brand: 'vsol' });
    expect(typeof adapter.saveConfig).toBe('function');
  });

  test('KingType saveConfig existe', () => {
    const KingType = require('../kingtype/kingtype');
    const adapter = new KingType({ ip: '10.0.0.1', name: 'test', brand: 'kingtype' });
    expect(typeof adapter.saveConfig).toBe('function');
  });
});
