import { calculateAge, calculateAgeOrNull } from './age.util';

describe('age.util', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('calculateAge', () => {
    it('returns correct age after birthday has passed this year', () => {
      vi.setSystemTime(new Date('2026-07-01'));
      expect(calculateAge('1990-06-15')).toBe(36);
    });

    it('returns correct age on the birthday itself', () => {
      vi.setSystemTime(new Date('2026-06-15'));
      expect(calculateAge('1990-06-15')).toBe(36);
    });

    it('returns age minus one before birthday this year', () => {
      vi.setSystemTime(new Date('2026-06-14'));
      expect(calculateAge('1990-06-15')).toBe(35);
    });

    it('returns a negative number for a future birthDate', () => {
      vi.setSystemTime(new Date('2020-01-01'));
      expect(calculateAge('2025-06-15')).toBeLessThan(0);
    });
  });

  describe('calculateAgeOrNull', () => {
    it('returns the age when the birth date has already occurred', () => {
      vi.setSystemTime(new Date('2026-06-15'));
      expect(calculateAgeOrNull('1990-06-15')).toBe(36);
    });

    it('returns null for a future birthDate', () => {
      vi.setSystemTime(new Date('2020-01-01'));
      expect(calculateAgeOrNull('2025-06-15')).toBeNull();
    });
  });
});
