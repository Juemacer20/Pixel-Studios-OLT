const {
  parseOnuList, parseOnuState, parseOptical, parseStats,
  parseEthPorts, parseDistance, parseProfile, clean,
} = require('../parser');

describe('clean()', () => {
  test('elimina ANSI escapes', () => {
    expect(clean('\u001b[31mtest\u001b[0m')).toBe('test');
  });
  test('elimina líneas syslog', () => {
    expect(clean('2024/01/15 10:30:00 WARN some syslog\ndata')).toBe('data');
  });
  test('elimina retornos de carro', () => {
    expect(clean('line1\r\nline2')).toBe('line1\nline2');
  });
});

describe('parseOnuList()', () => {
  test('parsea lista de ONUs en formato VSOL', () => {
    const output = [
      'GPON0/1:1   HG8120C    HUAWEI   sn   HWTC7CA6A566',
      'GPON0/1:2   unknown    HUAWEI   sn   HWTC0A6F4947',
      'GPON0/2:3   IC485WRF   HUAWEI   sn   HWTC12345678',
    ].join('\n');
    const r = parseOnuList(output);
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({ ponIndex: 1, onuId: 1, model: 'HG8120C', profile: 'HUAWEI', authMode: 'sn', serial: 'HWTC7CA6A566' });
    expect(r[1].model).toBeNull();
    expect(r[2].ponIndex).toBe(2);
  });

  test('output vacío → array vacío', () => {
    expect(parseOnuList('')).toEqual([]);
  });
});

describe('parseOnuState()', () => {
  test('parsea estados de ONU', () => {
    const output = [
      '1/1/1:1  enable  enable  working  failed  1(GPON)',
      '1/1/1:2  enable  enable  working  succeeded  1(GPON)',
      '1/1/2:3  enable  disable offline  succeeded  1(GPON)',
    ].join('\n');
    const r = parseOnuState(output);
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({ stackId: 1, slotId: 1, ponIndex: 1, onuId: 1, adminState: 'enable', omccState: 'enable', phaseState: 'working', configState: 'failed' });
    expect(r[1].configState).toBe('succeeded');
    expect(r[2].phaseState).toBe('offline');
  });

  test('output vacío → array vacío', () => {
    expect(parseOnuState('')).toEqual([]);
  });
});

describe('parseOptical()', () => {
  test('parsea valores ópticos completos', () => {
    const output = [
      'Rx optical level: -19.666(dBm)',
      'Lower rx optical threshold: -27.0(dBm)',
      'Upper rx optical threshold: -8.0(dBm)',
      'Tx optical level: 1.906(dBm)',
      'Temperature: 31.000(C)',
      'Power feed voltage: 3.26(V)',
      'Laser bias current: 9.000(mA)',
      'ONU response time: 35999',
    ].join('\n');
    const r = parseOptical(output);
    expect(r.rxPower).toBe(-19.666);
    expect(r.txPower).toBe(1.906);
    expect(r.temperature).toBe(31);
    expect(r.voltage).toBe(3.26);
    expect(r.biasCurrent).toBe(9);
    expect(r.responseTime).toBe(35999);
  });

  test('valores faltantes → undefined', () => {
    expect(parseOptical('no optical data here')).toEqual({});
  });
});

describe('parseStats()', () => {
  test('parsea estadísticas de tráfico', () => {
    const output = [
      'Input rate(Bps): 4176',
      'Input rate(pps): 18',
      'Output rate(Bps): 14107',
      'Output rate(pps): 84',
      'Input bytes: 898496204',
      'Output bytes: 2930218002',
      'Input packets: 4333206',
      'Output packets: 19858110',
    ].join('\n');
    const r = parseStats(output);
    expect(r.inputRateBps).toBe(4176);
    expect(r.outputRateBps).toBe(14107);
    expect(r.inputBytes).toBe(898496204);
  });

  test('maneja N/A correctamente', () => {
    const r = parseStats('Input bandwidth thoughput: N/A');
    expect(r.inputBandwidth).toBeNull();
  });
});

describe('parseEthPorts()', () => {
  test('parsea puertos ethernet', () => {
    const output = [
      'Interface: eth_0/1',
      'Speed status: auto',
      'Operate status: enable',
      'Admin status: unlock',
      'Interface: eth_0/2',
      'Speed status: full-100',
      'Operate status: enable',
    ].join('\n');
    const r = parseEthPorts(output);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ portIndex: 1, speed: 'auto', operStatus: 'enable', adminStatus: 'unlock' });
    expect(r[1]).toEqual({ portIndex: 2, speed: 'full-100', operStatus: 'enable', adminStatus: null });
  });
});

describe('parseDistance()', () => {
  test('extrae distancia en metros', () => {
    expect(parseDistance('onu 1 Distance: 1293m')).toBe(1293);
  });
  test('sin distancia → null', () => {
    expect(parseDistance('no distance')).toBeNull();
  });
});

describe('parseProfile()', () => {
  test('extrae nombres de perfiles', () => {
    const output = [
      'onu id: 1',
      'line profile name: HUAWEI',
      'srv profile name: SMARTOLT',
      'alarm profile name: Alarm',
    ].join('\n');
    const r = parseProfile(output);
    expect(r.lineProfile).toBe('HUAWEI');
    expect(r.srvProfile).toBe('SMARTOLT');
    expect(r.alarmProfile).toBe('Alarm');
  });

  test('output parcial', () => {
    expect(parseProfile('line profile name: DEFAULT')).toEqual({ lineProfile: 'DEFAULT' });
  });
});
