import { LocalDatePipe } from './local-date.pipe';

describe('LocalDatePipe', () => {
  let pipe: LocalDatePipe;

  beforeEach(() => {
    pipe = new LocalDatePipe();
  });

  it('should parse a YYYY-MM-DD string to a local Date', () => {
    const result = pipe.transform('2024-06-15');
    expect(result instanceof Date).toBeTrue();
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(5); // June = 5
    expect(result.getDate()).toBe(15);
  });

  it('should not shift date due to UTC offset', () => {
    // Using new Date('2024-01-01') would be midnight UTC and could shift to Dec 31 in some timezones.
    // LocalDatePipe must return Jan 1 locally.
    const result = pipe.transform('2024-01-01');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(1);
  });

  it('should parse leap day correctly', () => {
    const result = pipe.transform('2024-02-29');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it('should parse end-of-year date correctly', () => {
    const result = pipe.transform('2023-12-31');
    expect(result.getFullYear()).toBe(2023);
    expect(result.getMonth()).toBe(11);
    expect(result.getDate()).toBe(31);
  });
});
