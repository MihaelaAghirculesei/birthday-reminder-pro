import { getZodiacSign, ZODIAC_SIGNS } from './zodiac.util';

describe('zodiac.util', () => {
  describe('getZodiacSign', () => {
    it('returns Aquarius for a date within its range', () => {
      expect(getZodiacSign('1990-01-25').name).toBe('Aquarius');
    });

    it('returns Pisces for a date within its range', () => {
      expect(getZodiacSign('1990-03-01').name).toBe('Pisces');
    });

    it('returns Capricorn for a date in December', () => {
      expect(getZodiacSign('1990-12-25').name).toBe('Capricorn');
    });

    it('returns Capricorn for a date in January before the 20th', () => {
      expect(getZodiacSign('1990-01-10').name).toBe('Capricorn');
    });

    it('returns a sign for every start date boundary', () => {
      for (const sign of ZODIAC_SIGNS) {
        const { month, day } = sign.startDate;
        const dateStr = `1990-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        expect(getZodiacSign(dateStr).name).toBe(sign.name);
      }
    });
  });
});
