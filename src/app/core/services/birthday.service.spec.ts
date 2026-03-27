import { TestBed } from '@angular/core/testing';
import { BirthdayService } from './birthday.service';
import { Birthday } from '../../shared/models/birthday.model';
import { DEFAULT_CATEGORY } from '../../shared';

describe('BirthdayService', () => {
  let service: BirthdayService;

  const baseBirthday: Omit<Birthday, 'id'> = {
    name: 'Mario Rossi',
    birthDate: '1990-05-15',
    category: 'friends'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BirthdayService);
  });

  describe('prepareBirthdayForCreate', () => {
    it('should assign a non-empty id', () => {
      const result = service.prepareBirthdayForCreate(baseBirthday, null);
      expect(result.id).toBeTruthy();
    });

    it('should set syncStatus to local-only when userId is null', () => {
      const result = service.prepareBirthdayForCreate(baseBirthday, null);
      expect(result.syncStatus).toBe('local-only');
      expect(result.ownerId).toBeNull();
    });

    it('should set syncStatus to pending when userId is provided', () => {
      const result = service.prepareBirthdayForCreate(baseBirthday, 'user-123');
      expect(result.syncStatus).toBe('pending');
      expect(result.ownerId).toBe('user-123');
    });

    it('should fall back to DEFAULT_CATEGORY when category is absent', () => {
      const result = service.prepareBirthdayForCreate({ name: 'Luca', birthDate: '1985-01-10' }, null);
      expect(result.category).toBe(DEFAULT_CATEGORY);
    });

    it('should normalize a legacy capitalized category', () => {
      const result = service.prepareBirthdayForCreate({ ...baseBirthday, category: 'Family' }, null);
      expect(result.category).toBe('family');
    });

    it('should derive zodiacSign via normalization', () => {
      const result = service.prepareBirthdayForCreate(baseBirthday, null);
      expect(result.zodiacSign).toBeTruthy();
    });

    it('should set updatedAt timestamp', () => {
      const before = Date.now();
      const result = service.prepareBirthdayForCreate(baseBirthday, null);
      expect(result.updatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('prepareBirthdayForUpdate', () => {
    const existing: Birthday = {
      id: 'b-1',
      name: 'Mario Rossi',
      birthDate: '1990-05-15',
      category: 'friends',
      syncStatus: 'local-only',
      ownerId: null,
      updatedAt: 1000
    };

    it('should update updatedAt to a newer timestamp', () => {
      const result = service.prepareBirthdayForUpdate(existing, null);
      expect(result.updatedAt).toBeGreaterThan(existing.updatedAt!);
    });

    it('should set syncStatus to pending when userId is provided', () => {
      const result = service.prepareBirthdayForUpdate(existing, 'user-123');
      expect(result.syncStatus).toBe('pending');
      expect(result.ownerId).toBe('user-123');
    });

    it('should keep syncStatus local-only when userId remains null', () => {
      const result = service.prepareBirthdayForUpdate(existing, null);
      expect(result.syncStatus).toBe('local-only');
    });

    it('should preserve existing ownerId when userId is null', () => {
      const withOwner = { ...existing, ownerId: 'user-abc', syncStatus: 'synced' as const };
      const result = service.prepareBirthdayForUpdate(withOwner, null);
      expect(result.ownerId).toBe('user-abc');
    });

    it('should normalize category', () => {
      const result = service.prepareBirthdayForUpdate({ ...existing, category: 'Friends' }, null);
      expect(result.category).toBe('friends');
    });
  });

  describe('processTestBirthdays', () => {
    it('should assign unique ids to each birthday', () => {
      const input: Birthday[] = [
        { id: '', name: 'A', birthDate: '1990-01-01' },
        { id: '', name: 'B', birthDate: '1991-02-02' }
      ];
      const result = service.processTestBirthdays(input);
      expect(result[0].id).not.toBe(result[1].id);
    });

    it('should set syncStatus to local-only for all items', () => {
      const input: Birthday[] = [{ id: '', name: 'A', birthDate: '1990-01-01' }];
      const result = service.processTestBirthdays(input);
      expect(result[0].syncStatus).toBe('local-only');
    });

    it('should fall back to DEFAULT_CATEGORY when category is missing', () => {
      const input: Birthday[] = [{ id: '', name: 'A', birthDate: '1990-01-01' }];
      const result = service.processTestBirthdays(input);
      expect(result[0].category).toBe(DEFAULT_CATEGORY);
    });

    it('should return an empty array for empty input', () => {
      expect(service.processTestBirthdays([])).toEqual([]);
    });
  });

  describe('generateId', () => {
    it('should return a non-empty unique string', () => {
      const id1 = service.generateId();
      const id2 = service.generateId();
      expect(id1).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });
});
