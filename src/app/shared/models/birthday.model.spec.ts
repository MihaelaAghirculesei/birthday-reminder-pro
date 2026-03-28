import {
  createSyncMetadata,
  updateSyncMetadata,
  ensureSyncMetadata,
  type Birthday,
} from './birthday.model';

describe('birthday.model', () => {
  describe('createSyncMetadata', () => {
    it('sets syncStatus to local-only when ownerId is null', () => {
      const meta = createSyncMetadata(null);
      expect(meta.syncStatus).toBe('local-only');
      expect(meta.ownerId).toBeNull();
    });

    it('sets syncStatus to pending when ownerId is provided', () => {
      const meta = createSyncMetadata('user-1');
      expect(meta.syncStatus).toBe('pending');
      expect(meta.ownerId).toBe('user-1');
    });

    it('sets updatedAt to a recent timestamp', () => {
      const before = Date.now();
      const meta = createSyncMetadata();
      expect(meta.updatedAt).toBeGreaterThanOrEqual(before);
      expect(meta.updatedAt).toBeLessThanOrEqual(Date.now());
    });

    it('defaults ownerId to null', () => {
      const meta = createSyncMetadata();
      expect(meta.ownerId).toBeNull();
      expect(meta.syncStatus).toBe('local-only');
    });
  });

  describe('updateSyncMetadata', () => {
    const base = { updatedAt: 1000, ownerId: 'user-1', syncStatus: 'synced' as const };

    it('preserves existing fields and updates timestamp', () => {
      const result = updateSyncMetadata(base, 'user-1');
      expect(result.ownerId).toBe('user-1');
      expect(result.syncStatus).toBe('pending');
      expect(result.updatedAt).toBeGreaterThan(base.updatedAt);
    });

    it('falls back to existing ownerId when new ownerId is null', () => {
      const result = updateSyncMetadata(base, null);
      expect(result.ownerId).toBe('user-1');
      expect(result.syncStatus).toBe('pending');
    });

    it('sets local-only when both ownerIds are null', () => {
      const result = updateSyncMetadata({ ...base, ownerId: null }, null);
      expect(result.syncStatus).toBe('local-only');
    });

    it('spreads existing metadata', () => {
      const extended = { ...base, lastSyncedAt: 999 };
      const result = updateSyncMetadata(extended, 'user-1');
      expect(result.lastSyncedAt).toBe(999);
    });
  });

  describe('ensureSyncMetadata', () => {
    const minimal: Birthday = { id: '1', name: 'Alice', birthDate: '1990-06-15' };

    it('adds sync metadata when missing', () => {
      const result = ensureSyncMetadata(minimal);
      expect(result.updatedAt).toBeDefined();
      expect(result.syncStatus).toBe('local-only');
    });

    it('returns the same object when updatedAt is already set', () => {
      const stamped = { ...minimal, updatedAt: 42 };
      const result = ensureSyncMetadata(stamped);
      expect(result).toBe(stamped);
    });

    it('respects provided ownerId when adding metadata', () => {
      const result = ensureSyncMetadata(minimal, 'user-2');
      expect(result.ownerId).toBe('user-2');
      expect(result.syncStatus).toBe('pending');
    });

    it('preserves all original birthday fields', () => {
      const result = ensureSyncMetadata({ ...minimal, notes: 'test', reminderDays: 7 });
      expect(result.notes).toBe('test');
      expect(result.reminderDays).toBe(7);
    });
  });
});
