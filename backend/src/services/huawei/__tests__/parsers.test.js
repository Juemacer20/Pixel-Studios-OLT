const fs = require('fs');
const path = require('path');
const MA5800 = require('../ma5800');

const fixture = (f) => fs.readFileSync(path.join(__dirname, '../__fixtures__', f), 'utf8');

describe('_parseOntDetailInfo', () => {
  const adapter = new MA5800({ ip: '10.0.0.1', name: 'test' });

  test('extrae distancia, perfiles, última caída, mgmt y estados (fixture 8_50)', () => {
    const r = adapter._parseOntDetailInfo(fixture('ont-info-8_50.txt'));
    expect(r.distance).toBe(3611);
    expect(r.line_profile).toBe('SMARTOLT_FLEXIBLE_GPON');
    expect(r.srv_profile).toBe('IC485WRF');
    expect(r.last_down_cause).toBe('LOSi/LOBi');
    expect(r.configuration_method).toBe('OMCI');
    expect(r.config_state).toBe('normal');
    expect(r.match_state).toBe('match');
  });

  test('"Last down cause: -" se normaliza a undefined (fixture 43_25)', () => {
    const r = adapter._parseOntDetailInfo(fixture('ont-info-43_25.txt'));
    expect(r.distance).toBe(1185);
    expect(r.srv_profile).toBe('HG8546M');
    expect(r.last_down_cause).toBeUndefined();
  });
});

describe('_parseOntVersion', () => {
  const adapter = new MA5800({ ip: '10.0.0.1', name: 'test' });

  test('extrae modelo (Equipment-ID), firmware y sw_version', () => {
    const r = adapter._parseOntVersion(fixture('ont-version-8_50.txt'));
    expect(r.model).toBe('IC485WRF');
    expect(r.firmware).toBe('V3R017C10S125');
    expect(r.sw_version).toBe('4B4.A');
  });

  test('parsea correctamente otro firmware/modelo (fixture 43_25)', () => {
    const r = adapter._parseOntVersion(fixture('ont-version-43_25.txt'));
    expect(r.model).toBe('HG8546M');
    expect(r.firmware).toBe('V3R017C10S125');
  });
});
