const { buildActivityFeed, buildPonOutage } = require('../dashboard.helpers');

describe('dashboard helpers', () => {
  describe('buildActivityFeed', () => {
    it('maps audit log rows to feed items with required fields', () => {
      const rows = [
        { id: '1', action: 'REBOOT_ONT', target: 'ont-abc', details: { sn: 'HWTC1234' }, user_id: 'admin', created_at: new Date('2026-06-16T10:00:00Z') },
        { id: '2', action: 'AUTHORIZE_ONT', target: 'ont-xyz', details: { name: 'Juan Garcia' }, user_id: 'noc1', created_at: new Date('2026-06-16T09:00:00Z') },
      ];
      const feed = buildActivityFeed(rows);
      expect(feed).toHaveLength(2);
      expect(feed[0]).toMatchObject({ id: '1', action: 'REBOOT_ONT', message: expect.any(String), created_at: expect.any(Date) });
      expect(feed[1].message).toContain('Juan Garcia');
    });

    it('exposes user_id as user in output', () => {
      const rows = [{ id: '1', action: 'REBOOT_ONT', target: 'ont-1', details: {}, user_id: 'admin', created_at: new Date() }];
      const [item] = buildActivityFeed(rows);
      expect(item.user).toBe('admin');
    });

    it('generates human-readable message for REBOOT_ONT', () => {
      const rows = [{ id: '1', action: 'REBOOT_ONT', target: 'ont-1', details: { sn: 'HWTC9999', name: 'Cliente Test' }, user_id: 'admin', created_at: new Date() }];
      const [item] = buildActivityFeed(rows);
      expect(item.message).toMatch(/Reboot/i);
    });

    it('generates human-readable message for AUTHORIZE_ONT', () => {
      const rows = [{ id: '2', action: 'AUTHORIZE_ONT', target: 'ont-2', details: { name: 'Pepe Argento' }, user_id: 'noc1', created_at: new Date() }];
      const [item] = buildActivityFeed(rows);
      expect(item.message).toMatch(/Pepe Argento/);
    });

    it('falls back to action name when no specific template exists', () => {
      const rows = [{ id: '3', action: 'UNKNOWN_ACTION', target: 'x', details: {}, user_id: 'u', created_at: new Date() }];
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
        { olt_id: 'olt-1', board: 0, port: 1, status: 'OFFLINE', last_seen: new Date('2026-06-10T00:00:00Z') },
        { olt_id: 'olt-1', board: 0, port: 1, status: 'OFFLINE', last_seen: new Date('2026-06-10T00:00:00Z') },
        { olt_id: 'olt-1', board: 0, port: 1, status: 'OFFLINE', last_seen: new Date('2026-06-10T00:00:00Z') },
      ];
      const oltNames = { 'olt-1': 'Itelsa-Huawei' };
      const result = buildPonOutage(onts, oltNames);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].olt).toBe('Itelsa-Huawei');
      expect(result.rows[0].subscribers).toBe(3);
    });

    it('does not flag PON with fewer than 2 subscribers', () => {
      const onts = [
        { olt_id: 'olt-1', board: 0, port: 2, status: 'OFFLINE', last_seen: new Date() },
      ];
      const result = buildPonOutage(onts, { 'olt-1': 'Itelsa' });
      expect(result.rows).toHaveLength(0);
    });

    it('skips ONTs without board or port', () => {
      const onts = [
        { olt_id: 'olt-1', board: null, port: null, status: 'OFFLINE', last_seen: new Date() },
        { olt_id: 'olt-1', board: null, port: null, status: 'OFFLINE', last_seen: new Date() },
      ];
      const result = buildPonOutage(onts, { 'olt-1': 'Itelsa' });
      expect(result.rows).toHaveLength(0);
    });

    it('does not flag PON where most subscribers are online', () => {
      const onts = [
        { olt_id: 'olt-1', board: 0, port: 3, status: 'ONLINE', last_seen: new Date() },
        { olt_id: 'olt-1', board: 0, port: 3, status: 'ONLINE', last_seen: new Date() },
        { olt_id: 'olt-1', board: 0, port: 3, status: 'OFFLINE', last_seen: new Date() },
      ];
      const result = buildPonOutage(onts, { 'olt-1': 'Itelsa' });
      expect(result.rows).toHaveLength(0);
    });

    it('marks PON down > 7 days as stale', () => {
      const oldDate = new Date(Date.now() - 8 * 24 * 3600 * 1000);
      const onts = [
        { olt_id: 'olt-1', board: 0, port: 4, status: 'OFFLINE', last_seen: oldDate },
        { olt_id: 'olt-1', board: 0, port: 4, status: 'OFFLINE', last_seen: oldDate },
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
