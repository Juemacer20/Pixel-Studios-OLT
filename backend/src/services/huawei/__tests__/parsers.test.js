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

  // FASE 2 — GRUPO GRATIS: campos que ya vienen en `display ont info`.
  test('extrae temp/CPU/memoria/TR069/duración/timestamps/puertos (fixture 8_50)', () => {
    const r = adapter._parseOntDetailInfo(fixture('ont-info-8_50.txt'));
    expect(r.temperature).toBe(53);
    expect(r.cpu_pct).toBe(1);
    expect(r.mem_pct).toBe(78);
    expect(r.tr069_enabled).toBe(true);
    expect(r.tr069_ip_index).toBe(0);
    expect(r.online_duration).toBe('1 day(s), 14 hour(s), 49 minute(s), 11 second(s)');
    // pager-polluted line (`---- More ----` + ANSI) debe limpiarse igual
    expect(r.last_up.toISOString()).toBe('2026-06-11T20:50:59.000Z');
    expect(r.last_down.toISOString()).toBe('2026-06-11T20:50:01.000Z');
    expect(r.ports).toEqual({ pots: 1, eth: 4, vdsl: 0, tdm: 0, moca: 0, catv: 8 });
    expect(r.mgmt_ip).toBeUndefined(); // "ONT IP 0 address/mask : -"
  });

  test('"Last down time: -" → undefined y CATV 0 (fixture 43_25)', () => {
    const r = adapter._parseOntDetailInfo(fixture('ont-info-43_25.txt'));
    expect(r.temperature).toBe(50);
    expect(r.cpu_pct).toBe(2);
    expect(r.mem_pct).toBe(37);
    expect(r.tr069_enabled).toBe(true);
    expect(r.last_up.toISOString()).toBe('2026-06-07T01:46:11.000Z');
    expect(r.last_down).toBeUndefined();
    expect(r.ports).toEqual({ pots: 1, eth: 4, vdsl: 0, tdm: 0, moca: 0, catv: 0 });
  });
});

// FASE 2 — GRUPO 🔴: WAN/IP/PPPoE/MAC desde `display ont wan-info <port> <id>`.
describe('_parseWanInfo', () => {
  const adapter = new MA5800({ ip: '10.0.0.1', name: 'test' });

  test('extrae WAN IPoE/Static + escalares y array wan_info (fixture 15_1)', () => {
    const r = adapter._parseWanInfo(fixture('ont-wan-info-15_1.txt'));
    expect(r.wan_ip_source).toBe('Static');
    expect(r.wan_encap).toBe('IPoE');
    expect(r.ip_address).toBe('10.0.0.2');
    expect(r.wan_mask).toBe('255.255.255.0');
    expect(r.wan_gateway).toBe('10.0.0.1');
    expect(r.wan_vlan).toBe(10);
    expect(r.mac).toBe('aa:aa:bb:bb:cc:cc'); // Huawei DC21-... → colon-lower
    expect(r.wan_mode).toBe('IP routed');
    expect(r.pppoe_user).toBeUndefined(); // ONU Static, sin PPPoE
    expect(r.wan_info).toHaveLength(1);
    expect(r.wan_info[0].name).toBe('1_INTERNET_R_VID_10');
    expect(r.wan_info[0].service_type).toBe('Internet');
    expect(r.wan_info[0].ipv4_status).toBe('Connected');
  });

  test('sin bloques WAN → objeto vacío', () => {
    expect(adapter._parseWanInfo('  F/S/P : 0/1/1\n  ONT ID : 1\n  no wan here\n')).toEqual({});
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
