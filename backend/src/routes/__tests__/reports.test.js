const { buildExportRow, EXPORT_FIELDS, getFieldsByCategory } = require('../reports.helpers');

const SAMPLE_ONT = {
  serial_number: 'HWTC12345678',
  description: 'Cliente García',
  mac: 'AA:BB:CC:DD:EE:FF',
  model: 'EG8145V5',
  contact: 'Juan García',
  olt: { name: 'OLT-Norte' },
  board: 0,
  port: 1,
  onu_id: 42,
  channel: null,
  protocol: 'GPON',
  zone: 'Zona Norte',
  odb: 'ODB-01',
  status: 'ONLINE',
  last_seen: new Date('2024-06-16T10:00:00Z'),
  last_up: new Date('2024-06-16T08:00:00Z'),
  last_down: new Date('2024-06-15T12:00:00Z'),
  rx_power: -21.5,
  tx_power: 3.2,
  olt_rx_power: -20.8,
  distance: 850,
  temperature: 42,
  voltage: 3.3,
  bias_current: 18,
  ip_address: '192.168.10.100',
  vlan: 100,
  wan_mode: 'DHCP',
  pppoe_user: null,
  mgmt_ip: '10.0.0.1',
  cpu_pct: 15,
  mem_pct: 40,
  uptime: BigInt(86400),
  firmware: 'V5R020C10S110',
  sw_version: 'V5R020C10S110',
  speed_profile: { name: 'Plan 100MB' },
  line_profile: 'LINE_DEFAULT',
  srv_profile: 'SRV_DEFAULT',
  download_mbps: 100,
  upload_mbps: 20,
  has_iptv: false,
  created_at: new Date('2024-01-15T09:30:00Z'),
};

describe('EXPORT_FIELDS', () => {
  it('exports an array of field definitions', () => {
    expect(Array.isArray(EXPORT_FIELDS)).toBe(true);
    expect(EXPORT_FIELDS.length).toBeGreaterThan(30);
  });

  it('each field has key, label, category', () => {
    for (const f of EXPORT_FIELDS) {
      expect(typeof f.key).toBe('string');
      expect(typeof f.label).toBe('string');
      expect(typeof f.category).toBe('string');
    }
  });

  it('includes at minimum serial_number, olt_name, status, rx_power', () => {
    const keys = EXPORT_FIELDS.map(f => f.key);
    expect(keys).toContain('serial_number');
    expect(keys).toContain('olt_name');
    expect(keys).toContain('status');
    expect(keys).toContain('rx_power');
  });

  it('has no duplicate keys', () => {
    const keys = EXPORT_FIELDS.map(f => f.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

describe('getFieldsByCategory', () => {
  it('returns an object grouping fields by category', () => {
    const grouped = getFieldsByCategory();
    expect(typeof grouped).toBe('object');
    const categories = Object.keys(grouped);
    expect(categories.length).toBeGreaterThan(3);
  });

  it('each category is an array of field definitions', () => {
    const grouped = getFieldsByCategory();
    for (const fields of Object.values(grouped)) {
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
    }
  });
});

describe('buildExportRow', () => {
  it('returns only the requested fields as an object', () => {
    const row = buildExportRow(SAMPLE_ONT, ['serial_number', 'status']);
    expect(Object.keys(row)).toEqual(['Serial Number', 'Status']);
  });

  it('maps olt_name from nested olt relation', () => {
    const row = buildExportRow(SAMPLE_ONT, ['olt_name']);
    expect(row['OLT']).toBe('OLT-Norte');
  });

  it('maps speed_profile from nested relation', () => {
    const row = buildExportRow(SAMPLE_ONT, ['speed_profile_name']);
    expect(row['Speed Profile']).toBe('Plan 100MB');
  });

  it('returns em-dash for null/undefined fields', () => {
    const row = buildExportRow(SAMPLE_ONT, ['pppoe_user', 'channel']);
    expect(row['PPPoE User']).toBe('—');
    expect(row['Channel']).toBe('—');
  });

  it('formats datetime fields as ISO string', () => {
    const row = buildExportRow(SAMPLE_ONT, ['last_seen']);
    expect(typeof row['Last Seen']).toBe('string');
    expect(row['Last Seen']).toContain('2024-06-16');
  });

  it('formats uptime BigInt as seconds number', () => {
    const row = buildExportRow(SAMPLE_ONT, ['uptime']);
    expect(row['Uptime (s)']).toBe(86400);
  });

  it('returns empty object for empty field list', () => {
    const row = buildExportRow(SAMPLE_ONT, []);
    expect(row).toEqual({});
  });

  it('handles missing olt relation gracefully', () => {
    const ont = { ...SAMPLE_ONT, olt: null };
    const row = buildExportRow(ont, ['olt_name']);
    expect(row['OLT']).toBe('—');
  });

  it('handles missing speed_profile relation gracefully', () => {
    const ont = { ...SAMPLE_ONT, speed_profile: null };
    const row = buildExportRow(ont, ['speed_profile_name']);
    expect(row['Speed Profile']).toBe('—');
  });

  it('maps numeric signal fields directly', () => {
    const row = buildExportRow(SAMPLE_ONT, ['rx_power', 'distance']);
    expect(row['Rx Power (dBm)']).toBe(-21.5);
    expect(row['Distance (m)']).toBe(850);
  });

  it('includes only requested fields, not all fields', () => {
    const row = buildExportRow(SAMPLE_ONT, ['serial_number']);
    expect(Object.keys(row).length).toBe(1);
  });
});
