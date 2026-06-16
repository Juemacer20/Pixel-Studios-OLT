const { buildApiLogsSummary } = require('../settings.helpers');

const mkRow = (action, minsAgo = 10) => ({
  action,
  created_at: new Date(Date.now() - minsAgo * 60 * 1000),
});

describe('buildApiLogsSummary', () => {
  it('returns totalAll from all rows count', () => {
    const all  = [mkRow('REBOOT_ONT', 90), mkRow('REBOOT_ONT', 90)];
    const hour = [];
    const result = buildApiLogsSummary(all, hour);
    expect(result.totalAll).toBe(2);
  });

  it('returns totalLastHour from last-hour rows count', () => {
    const all  = [mkRow('REBOOT_ONT', 90), mkRow('AUTHORIZE_ONT', 20)];
    const hour = [mkRow('AUTHORIZE_ONT', 20)];
    const result = buildApiLogsSummary(all, hour);
    expect(result.totalLastHour).toBe(1);
  });

  it('aggregates action counts per method', () => {
    const hour = [
      mkRow('REBOOT_ONT', 5),
      mkRow('REBOOT_ONT', 15),
      mkRow('AUTHORIZE_ONT', 10),
    ];
    const result = buildApiLogsSummary([], hour);
    const reboot = result.methods.find(m => m.method === 'REBOOT_ONT');
    const auth   = result.methods.find(m => m.method === 'AUTHORIZE_ONT');
    expect(reboot.current).toBe(2);
    expect(auth.current).toBe(1);
  });

  it('sorts methods by current count descending', () => {
    const hour = [
      mkRow('DELETE_ONT', 5),
      mkRow('REBOOT_ONT', 5),
      mkRow('REBOOT_ONT', 6),
      mkRow('REBOOT_ONT', 7),
    ];
    const result = buildApiLogsSummary([], hour);
    expect(result.methods[0].method).toBe('REBOOT_ONT');
    expect(result.methods[0].current).toBe(3);
    expect(result.methods[1].current).toBe(1);
  });

  it('each method includes maxPerHour field', () => {
    const hour = [mkRow('REBOOT_ONT', 5)];
    const result = buildApiLogsSummary([], hour);
    expect(typeof result.methods[0].maxPerHour).toBe('number');
    expect(result.methods[0].maxPerHour).toBeGreaterThan(0);
  });

  it('returns empty methods array when no last-hour rows', () => {
    const result = buildApiLogsSummary([mkRow('REBOOT_ONT', 90)], []);
    expect(result.methods).toEqual([]);
    expect(result.totalAll).toBe(1);
    expect(result.totalLastHour).toBe(0);
  });
});
