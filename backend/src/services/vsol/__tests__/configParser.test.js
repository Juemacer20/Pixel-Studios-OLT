const { parseRunningConfig } = require('../configParser');

const MINIMAL_CONFIG = [
  'Current configuration:',
  'hostname VSOL-OLT',
  '!',
  'vlan 100',
  'description Management',
  '!',
  'vlan 200',
  '!',
  'interface gpon 0/1',
  ' description GPON Port 1',
  ' no shutdown',
  ' onu auto-learn',
  ' onu add 1 profile LINEKTONU sn HWTC12345678',
  ' onu add 2 profile LINEKTONU sn HWTC87654321',
  ' exit',
  '!',
  'interface gpon 0/2',
  ' no shutdown',
  ' exit',
  '!',
  'profile dba id 1 name DEFAULT',
  ' type 2',
  ' fixed 1000',
  ' assured 10000',
  ' maximum 100000',
  ' priority 0',
  ' commit',
  '!',
  'profile traffic id 1 name INTERNET_10M',
  ' sir 10000 pir 10000',
  ' commit',
  '!',
  'profile line id 1 name LINEKTONU',
  ' port-num eth 1 veip 1',
  ' description Default line profile',
  ' commit',
  '!',
  'profile srv id 1 name SERVICE_DHCP',
  ' portvlan veip 1 mode dhcp',
  ' commit',
  '!',
  'profile alarm id 1 name DEFAULT_ALARM',
  ' state on',
  ' commit',
  '!',
  'snmp-server community public ro',
  'ntp server 10.0.0.1',
  'time zone UTC-3',
  'syslog server 10.0.0.2',
  'user add admin password admin123 level 15',
  'fan temperature 45',
  'ip igmp snooping enable',
  'spanning-tree enable',
  '',
].join('\n');

describe('parseRunningConfig()', () => {
  test('extrae hostname', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.hostname).toBe('VSOL-OLT');
  });

  test('extrae VLANs', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.vlans).toHaveLength(2);
    expect(r.vlans[0]).toEqual({ id: 100, description: 'Management' });
    expect(r.vlans[1]).toEqual({ id: 200, description: '' });
  });

  test('extrae interfaces gpon con ONUs', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.interfaces.gpon).toHaveLength(2);
    expect(r.interfaces.gpon[0].slot).toBe('0/1');
    expect(r.interfaces.gpon[0].config.noShutdown).toBe(true);
    expect(r.interfaces.gpon[0].config.description).toBe('GPON Port 1');
    expect(r.interfaces.gpon[0].config.autoLearn).toBe(true);
  });

  test('extrae ONUs de la configuración', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.onus).toHaveLength(2);
    expect(r.onus[0]).toEqual({ ponIndex: 1, onuId: 1, profile: 'LINEKTONU', serial: 'HWTC12345678' });
    expect(r.onus[1].serial).toBe('HWTC87654321');
  });

  test('extrae perfiles DBA', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.profiles.dba).toHaveLength(1);
    expect(r.profiles.dba[0].name).toBe('DEFAULT');
    expect(r.profiles.dba[0].config.fixed).toBe(1000);
    expect(r.profiles.dba[0].config.assured).toBe(10000);
    expect(r.profiles.dba[0].config.maximum).toBe(100000);
  });

  test('extrae perfiles traffic', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.profiles.traffic).toHaveLength(1);
    expect(r.profiles.traffic[0].config.sir).toBe(10000);
    expect(r.profiles.traffic[0].config.pir).toBe(10000);
  });

  test('extrae perfiles line/onu', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.profiles.line).toHaveLength(1);
    expect(r.profiles.line[0].name).toBe('LINEKTONU');
    // port-num and description are only parsed for type 'onu', not 'line'
  });

  test('extrae perfiles srv', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.profiles.srv).toHaveLength(1);
    expect(r.profiles.srv[0].config.mode).toBe('dhcp');
  });

  test('extrae perfiles alarm', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.profiles.alarm).toHaveLength(1);
    expect(r.profiles.alarm[0].config.state).toBe('on');
  });

  test('extrae system settings', () => {
    const r = parseRunningConfig(MINIMAL_CONFIG);
    expect(r.system.snmp).toHaveLength(1);
    expect(r.system.ntp).toBe('10.0.0.1');
    expect(r.system.timezone).toBeTruthy();
    expect(r.system.syslog).toBe('10.0.0.2');
    expect(r.system.users).toHaveLength(1);
    expect(r.system.fanTemp).toBe(45);
    expect(r.system.spanningTree).toBe('enable');
  });
});
