import { formatDaysUntil, getDaysUntilBirthday, getNextBirthdayDate, parseLocalDate, toDateString } from './date.utils';

describe('Date Utils', () => {

  describe('getNextBirthdayDate', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should return birthday in current year if not yet passed', () => {
      const mockToday = new Date(2024, 0, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return birthday in next year if already passed this year', () => {
      const mockToday = new Date(2024, 11, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-01-15';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should return birthday today if it is today', () => {
      const mockToday = new Date(2024, 5, 15, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
    });

    it('should handle leap year birthdays', () => {
      const mockToday = new Date(2024, 0, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '2000-02-29';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(29);
    });

    it('should use Feb 28 for Feb 29 birthday in a non-leap year (before Feb 28)', () => {
      // 2025 is not a leap year; today is Jan 1 2025
      const mockToday = new Date(2025, 0, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '2000-02-29';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(28);
    });

    it('should advance to next year using Feb 29 when Feb 28 has passed and next year is a leap year', () => {
      // Today is Mar 1 2027 (non-leap); 2028 is a leap year
      const mockToday = new Date(2027, 2, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '2000-02-29';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2028);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(29);
    });

    it('should advance to next year using Feb 28 when Feb 28 has passed and next year is also non-leap', () => {
      // Today is Mar 1 2025 (non-leap); 2026 is also non-leap
      const mockToday = new Date(2025, 2, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '2000-02-29';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(28);
    });

    it('should handle end of year transition', () => {
      const mockToday = new Date(2024, 11, 31, 23, 59, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-01-01';
      const result = getNextBirthdayDate(birthDate);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });
  });

  describe('getDaysUntilBirthday', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should return 0 when birthday is today', () => {
      const mockToday = new Date(2024, 5, 15, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const result = getDaysUntilBirthday(birthDate);

      expect(result).toBe(0);
    });

    it('should return 1 when birthday is tomorrow', () => {
      const mockToday = new Date(2024, 5, 14, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const result = getDaysUntilBirthday(birthDate);

      expect(result).toBe(1);
    });

    it('should calculate days until birthday in same year', () => {
      const mockToday = new Date(2024, 0, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-01-11';
      const result = getDaysUntilBirthday(birthDate);

      expect(result).toBe(10);
    });

    it('should calculate days until birthday in next year', () => {
      const mockToday = new Date(2024, 11, 25, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-01-01';
      const result = getDaysUntilBirthday(birthDate);

      expect(result).toBe(7);
    });

    it('should calculate days for birthday several months away', () => {
      const mockToday = new Date(2024, 0, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const result = getDaysUntilBirthday(birthDate);

      expect(result).toBe(166);
    });

    it('should handle different times of day correctly', () => {
      const mockToday = new Date(2024, 5, 14, 23, 59, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const result = getDaysUntilBirthday(birthDate);

      expect(result).toBe(1);
    });
  });

  describe('formatDaysUntil', () => {
    it('should return "Today!" when days is 0', () => {
      expect(formatDaysUntil(0)).toBe('Today!');
    });

    it('should return "Tomorrow!" when days is 1', () => {
      expect(formatDaysUntil(1)).toBe('Tomorrow!');
    });

    it('should return "In X days" for 2 days', () => {
      expect(formatDaysUntil(2)).toBe('In 2 days');
    });

    it('should return "In X days" for 10 days', () => {
      expect(formatDaysUntil(10)).toBe('In 10 days');
    });

    it('should return "In X days" for 365 days', () => {
      expect(formatDaysUntil(365)).toBe('In 365 days');
    });

    it('should handle large numbers correctly', () => {
      expect(formatDaysUntil(1000)).toBe('In 1000 days');
    });
  });

  describe('Integration tests', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should format birthday message for today', () => {
      const mockToday = new Date(2024, 5, 15, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const days = getDaysUntilBirthday(birthDate);
      const message = formatDaysUntil(days);

      expect(message).toBe('Today!');
    });

    it('should format birthday message for tomorrow', () => {
      const mockToday = new Date(2024, 5, 14, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const days = getDaysUntilBirthday(birthDate);
      const message = formatDaysUntil(days);

      expect(message).toBe('Tomorrow!');
    });

    it('should format birthday message for future date', () => {
      const mockToday = new Date(2024, 5, 1, 12, 30, 0);
      jasmine.clock().mockDate(mockToday);

      const birthDate = '1990-06-15';
      const days = getDaysUntilBirthday(birthDate);
      const message = formatDaysUntil(days);

      expect(message).toBe('In 14 days');
    });
  });

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
