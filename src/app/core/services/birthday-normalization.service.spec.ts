import { TestBed } from '@angular/core/testing';
import { BirthdayNormalizationService } from './birthday-normalization.service';
import { Birthday } from '../../shared/models/birthday.model';
import { DEFAULT_CATEGORY } from '../../shared';

const BASE: Birthday = { id: '1', name: 'Alice', birthDate: '1990-03-21' };

describe('BirthdayNormalizationService', () => {
  let service: BirthdayNormalizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BirthdayNormalizationService);
  });

  describe('normalizeCategoryId', () => {
    it('returns DEFAULT_CATEGORY when undefined', () =>
      expect(service.normalizeCategoryId(undefined)).toBe(DEFAULT_CATEGORY));

    it('returns DEFAULT_CATEGORY when empty string', () =>
      expect(service.normalizeCategoryId('')).toBe(DEFAULT_CATEGORY));

    it('passes through already-lowercase values unchanged', () =>
      expect(service.normalizeCategoryId('friends')).toBe('friends'));

    const mappings: [string, string][] = [
      ['Family',        'family'],
      ['Friends',       'friends'],
      ['Work',          'colleagues'],
      ['Colleagues',    'colleagues'],
      ['Other',         'other'],
      ['Partner/Ex',    'romantic'],
      ['Romantic',      'romantic'],
      ['Acquaintances', 'acquaintances'],
    ];

    mappings.forEach(([input, expected]) =>
      it(`maps legacy "${input}" → "${expected}"`, () =>
        expect(service.normalizeCategoryId(input)).toBe(expected))
    );

    it('lowercases unknown capitalized values', () =>
      expect(service.normalizeCategoryId('Custom')).toBe('custom'));
  });

  describe('normalize', () => {
    it('derives zodiacSign when absent', () => {
      const result = service.normalize({ ...BASE, birthDate: '1990-03-21' });
      expect(result.zodiacSign).toBe('Aries');
    });

    it('preserves an existing zodiacSign', () => {
      const result = service.normalize({ ...BASE, zodiacSign: 'Taurus' });
      expect(result.zodiacSign).toBe('Taurus');
    });

    it('normalizes legacy category', () => {
      const result = service.normalize({ ...BASE, category: 'Family' });
      expect(result.category).toBe('family');
    });

    it('falls back to DEFAULT_CATEGORY when category is absent', () => {
      const result = service.normalize({ ...BASE });
      expect(result.category).toBe(DEFAULT_CATEGORY);
    });

    it('preserves all other fields unchanged', () => {
      const input: Birthday = { ...BASE, notes: 'note', reminderDays: 3, email: 'a@b.com' };
      const result = service.normalize(input);
      expect(result.notes).toBe('note');
      expect(result.reminderDays).toBe(3);
      expect(result.email).toBe('a@b.com');
    });
  });
});
