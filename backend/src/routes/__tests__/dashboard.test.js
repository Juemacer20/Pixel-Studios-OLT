const { buildActivityFeed, buildPonOutage } = require('../dashboard.helpers');

describe('dashboard helpers', () => {
  describe('buildActivityFeed', () => {
    it('maps audit log rows to feed items with required fields', () => {
      const rows = [
        { id: '1', action: 'REBOOT_ONT', target: 'ont-abc', details: { sn: 'HWTC1234' }, user: 'admin', created_at: new Date('2026-06-16T10:00:00Z') },
        { id: '2', action: 'AUTHORIZE_ONT', target: 'ont-xyz', details: { name: 'Juan Garcia' }, user: 'noc1', created_at: new Date('2026-06-16T09:00:00Z') },
      ];
      const feed = buildActivityFeed(rows);
      expect(feed).toHaveLength(2);
      expect(feed[0]).toMatchObject({ id: '1', action: 'REBOOT_ONT', message: expect.any(String), created_at: expect.any(Date) });
      expect(feed[1].message).toContain('Juan Garcia');
    });

    it('generates human-readable message for REBOOT_ONT', () => {
      const rows = [{ id: '1', action: 'REBOOT_ONT', target: 'ont-1', details: { sn: 'HWTC9999', name: 'Cliente Test' }, user: 'admin', created_at: new Date() }];
      const [item] = buildActivityFeed(rows);
      expect(item.message).toMatch(/Reboot/i);
    });

    it('generates human-readable message for AUTHORIZE_ONT', () => {
      const rows = [{ id: '2', action: 'AUTHORIZE_ONT', target: 'ont-2', details: { name: 'Pepe Argento' }, user: 'noc1', created_at: new Date() }];
      const [item] = buildActivityFeed(rows);
      expect(item.message).toMatch(/Pepe Argento/);
    });

    it('falls back to action name when no specific template exists', () => {
      const rows = [{ id: '3', action: 'UNKNOWN_ACTION', target: 'x', details: {}, user: 'u', created_at: new Date() }];
      const [item] = buildActivityFeed(rows);
      expect(item.message).toBe('UNKNOWN_ACTION');
    });

    it('handles empty input', () => {
      expect(buildActivityFeed([])).toEqual([]);
    });
  });

  describe('buildPonOutage', () => {
    it('identifies PON with 100% offline subscribers as outage', () => {
      const onts = [
        { olt_id: 'olt-1', description: '0/1/0:1', status: 'OFFLINE', last_seen: new Date('2026-06-10T00:00:00Z') },
        { olt_id: 'olt-1', description: '0/1/0:2', status: 'OFFLINE', last_seen: new Date('2026-06-10T00:00:00Z') },
        { olt_id: 'olt-1', description: '0/1/0:3', status: 'OFFLINE', last_seen: new Date('2026-06-10T00:00:00Z') },
      ];
      const oltNames = { 'olt-1': 'Itelsa-Huawei' };
      const result = buildPonOutage(onts, oltNames);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].olt).toBe('Itelsa-Huawei');
      expect(result.rows[0].subscribers).toBe(3);
    });

    it('does not flag PON with fewer than 2 subscribers', () => {
      const onts = [
        { olt_id: 'olt-1', description: '0/2/0:1', status: 'OFFLINE', last_seen: new Date() },
      ];
      const result = buildPonOutage(onts, { 'olt-1': 'Itelsa' });
      expect(result.rows).toHaveLength(0);
    });

    it('does not flag PON where most subscribers are online', () => {
      const onts = [
        { olt_id: 'olt-1', description: '0/3/0:1', status: 'ONLINE', last_seen: new Date() },
        { olt_id: 'olt-1', description: '0/3/0:2', status: 'ONLINE', last_seen: new Date() },
        { olt_id: 'olt-1', description: '0/3/0:3', status: 'OFFLINE', last_seen: new Date() },
      ];
      const result = buildPonOutage(onts, { 'olt-1': 'Itelsa' });
      expect(result.rows).toHaveLength(0);
    });

    it('marks PON down > 7 days as stale', () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 3600 * 1000);
      const onts = [
        { olt_id: 'olt-1', description: '0/4/0:1', status: 'OFFLINE', last_seen: oldDate },
        { olt_id: 'olt-1', description: '0/4/0:2', status: 'OFFLINE', last_seen: oldDate },
      ];
      const result = buildPonOutage(onts, { 'olt-1': 'Itelsa' });
      expect(result.stale.pons).toBe(1);
      expect(result.stale.subs).toBe(2);
    });

    it('returns empty result for no onts', () => {
      const result = buildPonOutage([], {});
      expect(result.rows).toHaveLength(0);
      expect(result.active).toEqual({ pons: 0, subs: 0 });
      expect(result.stale).toEqual({ pons: 0, subs: 0 });
    });
  });
});
