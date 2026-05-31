import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslateTesting } from '../../../testing/translate-testing';
import { LocaleDatePipe } from './locale-date.pipe';

describe('LocaleDatePipe', () => {
  let pipe: LocaleDatePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LocaleDatePipe,
        provideTranslateTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    pipe = TestBed.inject(LocaleDatePipe);
  });

  it('should format a Date with the default mediumDate format in en-US', () => {
    const date = new Date(2024, 5, 15); // June 15, 2024
    const result = pipe.transform(date);
    // en-US mediumDate: Jun 15, 2024
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });

  it('should return null for null input', () => {
    expect(pipe.transform(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('should apply a custom format', () => {
    const date = new Date(2024, 0, 5); // Jan 5, 2024
    const result = pipe.transform(date, 'yyyy-MM-dd');
    expect(result).toBe('2024-01-05');
  });

  it('should accept a timestamp number', () => {
    const ts = new Date(2024, 5, 15).getTime();
    const result = pipe.transform(ts, 'yyyy');
    expect(result).toBe('2024');
  });

  it('should accept an ISO string', () => {
    const result = pipe.transform('2024-06-15', 'yyyy');
    expect(result).toBe('2024');
  });
});
