const { parsePresetFields, formatPresetForDisplay } = require('../autoActions.helpers');

describe('autoActions helpers', () => {
  describe('parsePresetFields', () => {
    it('parses olts JSON string into array', () => {
      const result = parsePresetFields({ name: 'Test', olts: '["olt-1","olt-2"]' });
      expect(result.olts).toEqual(['olt-1', 'olt-2']);
    });

    it('keeps olts as array if already parsed', () => {
      const result = parsePresetFields({ name: 'Test', olts: ['olt-1'] });
      expect(result.olts).toEqual(['olt-1']);
    });

    it('handles null/undefined olts as null', () => {
      const result = parsePresetFields({ name: 'Test', olts: null });
      expect(result.olts).toBeNull();
    });

    it('parses boards and ports the same way', () => {
      const result = parsePresetFields({ name: 'T', boards: '[0,1]', ports: '[0,1,2]' });
      expect(result.boards).toEqual([0, 1]);
      expect(result.ports).toEqual([0, 1, 2]);
    });

    it('sets isActive true by default when not provided', () => {
      const result = parsePresetFields({ name: 'Test' });
      expect(result.isActive).toBe(true);
    });

    it('preserves isActive false when explicitly set', () => {
      const result = parsePresetFields({ name: 'Test', isActive: false });
      expect(result.isActive).toBe(false);
    });
  });

  describe('formatPresetForDisplay', () => {
    it('formats OLT list as "All OLTs" when null', () => {
      const preset = { name: 'Test', olts: null, isActive: true };
      const display = formatPresetForDisplay(preset);
      expect(display.oltLabel).toBe('All OLTs');
    });

    it('shows count when multiple OLTs selected', () => {
      const preset = { name: 'Test', olts: '["a","b","c"]', isActive: true };
      const display = formatPresetForDisplay(preset);
      expect(display.oltLabel).toContain('3');
    });

    it('shows active/inactive status', () => {
      expect(formatPresetForDisplay({ name: 'T', isActive: true }).statusLabel).toBe('Active');
      expect(formatPresetForDisplay({ name: 'T', isActive: false }).statusLabel).toBe('Inactive');
    });
  });
});
