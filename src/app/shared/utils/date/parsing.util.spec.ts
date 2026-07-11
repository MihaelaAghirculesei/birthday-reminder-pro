import { parseLocalDate, toDateString } from './parsing.util';

describe('parsing.util', () => {
  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD to local Date', () => {
      const date = parseLocalDate('1990-06-15');
      expect(date.getFullYear()).toBe(1990);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(15);
    });
  });

  describe('toDateString', () => {
    it('should return YYYY-MM-DD string as-is', () => {
      expect(toDateString('1990-06-15')).toBe('1990-06-15');
    });

    it('should convert Date to YYYY-MM-DD', () => {
      expect(toDateString(new Date(1990, 5, 15))).toBe('1990-06-15');
    });

    it('should convert ISO string to YYYY-MM-DD', () => {
      const result = toDateString('1990-06-15T00:00:00.000Z');
      expect(result).toMatch(/^1990-06-1[45]$/);
    });
  });
});
