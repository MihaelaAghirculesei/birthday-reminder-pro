import { BirthdayMergeService } from './birthday-merge.service';
import { Birthday } from '../../shared/models/birthday.model';

describe('BirthdayMergeService', () => {
  let service: BirthdayMergeService;

  function makeBirthday(overrides: Partial<Birthday> = {}): Birthday {
    return {
      id: 'b-1',
      name: 'Mario Rossi',
      birthDate: '1990-05-15',
      zodiacSign: 'Taurus',
      ...overrides
    } as Birthday;
  }

  beforeEach(() => {
    service = new BirthdayMergeService();
  });

  describe('merge with latest-wins strategy', () => {
    it('should keep cloud-only items', () => {
      const cloud = [makeBirthday({ id: 'cloud-1', name: 'Cloud Only' })];
      const result = service.merge([], cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Cloud Only');
      expect(result.toUpload.length).toBe(0);
    });

    it('should keep local-only items and add them to toUpload', () => {
      const local = [makeBirthday({ id: 'local-1', name: 'Local Only' })];
      const result = service.merge(local, [], { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Local Only');
      expect(result.toUpload.length).toBe(1);
      expect(result.toUpload[0].id).toBe('local-1');
    });

    it('should resolve conflict with cloud winning (newer timestamp)', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 2000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 5000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Cloud');
      expect(result.toUpload.length).toBe(0);
    });

    it('should resolve conflict with local winning (newer timestamp) and add to toUpload', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 5000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 2000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Local');
      expect(result.toUpload.length).toBe(1);
      expect(result.toUpload[0].id).toBe('b-1');
    });

    it('should handle mixed scenario (cloud-only + local-only + conflicts)', () => {
      const cloud = [
        makeBirthday({ id: 'cloud-only', name: 'Cloud Only' }),
        makeBirthday({ id: 'shared-1', name: 'Cloud Version', updatedAt: 3000 })
      ];
      const local = [
        makeBirthday({ id: 'local-only', name: 'Local Only' }),
        makeBirthday({ id: 'shared-1', name: 'Local Version', updatedAt: 5000 })
      ];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(3);
      const names = result.merged.map((b) => b.name);
      expect(names).toContain('Cloud Only');
      expect(names).toContain('Local Only');
      expect(names).toContain('Local Version');
    });

    it('should deduplicate by name+date by default', () => {
      const local = [makeBirthday({ id: 'b-local', name: 'Mario Rossi', birthDate: '1990-05-15', updatedAt: 1000 })];
      const cloud = [makeBirthday({ id: 'b-cloud', name: 'Mario Rossi', birthDate: '1990-05-15', updatedAt: 2000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].updatedAt).toBe(2000);
    });

    it('should not deduplicate when deduplicate is false', () => {
      const local = [makeBirthday({ id: 'b-local', name: 'Mario Rossi', birthDate: '1990-05-15', updatedAt: 1000 })];
      const cloud = [makeBirthday({ id: 'b-cloud', name: 'Mario Rossi', birthDate: '1990-05-15', updatedAt: 2000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins', deduplicate: false });

      expect(result.merged.length).toBe(2);
    });
  });

  describe('merge with cloud-wins strategy', () => {
    it('should use cloud version for items without local counterpart', () => {
      const cloud = [makeBirthday({ id: 'cloud-1', name: 'Cloud Only' })];

      const result = service.merge([], cloud, { strategy: 'cloud-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Cloud Only');
      expect(result.merged[0].syncStatus).toBe('synced');
    });

    it('should use cloud version when local is synced', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', syncStatus: 'synced' })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud' })];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Cloud');
      expect(result.merged[0].syncStatus).toBe('synced');
    });

    it('should use cloud version when local syncStatus is undefined', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', syncStatus: undefined })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud' })];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Cloud');
    });

    it('should preserve local version when syncStatus is pending', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local Pending', syncStatus: 'pending' })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud' })];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Local Pending');
      expect(result.merged[0].syncStatus).toBe('pending');
    });

    it('should keep local-only items (not in cloud)', () => {
      const local = [makeBirthday({ id: 'local-only', name: 'Local Only' })];
      const cloud = [makeBirthday({ id: 'cloud-1', name: 'Cloud' })];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins' });

      expect(result.merged.length).toBe(2);
      const localOnly = result.merged.find((b) => b.id === 'local-only');
      expect(localOnly).toBeTruthy();
      expect(localOnly!.name).toBe('Local Only');
    });

    it('should always return empty toUpload', () => {
      const local = [makeBirthday({ id: 'b-1', syncStatus: 'pending' })];
      const cloud = [makeBirthday({ id: 'cloud-1' })];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins' });

      expect(result.toUpload.length).toBe(0);
    });

    it('should not deduplicate by default', () => {
      const local = [makeBirthday({ id: 'b-local', name: 'Mario Rossi', birthDate: '1990-05-15' })];
      const cloud = [makeBirthday({ id: 'b-cloud', name: 'Mario Rossi', birthDate: '1990-05-15' })];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins' });

      expect(result.merged.length).toBe(2);
    });

    it('should use cloud when local has unknown syncStatus', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', syncStatus: 'conflict' })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud' })];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].name).toBe('Cloud');
      expect(result.merged[0].syncStatus).toBe('synced');
    });
  });

  describe('resolveConflict (via latest-wins merge)', () => {
    it('should prefer cloud when timestamps are equal', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 1000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 1000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      expect(result.merged[0].name).toBe('Cloud');
    });

    it('should prefer local when local timestamp is newer (>1s diff)', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 5000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 2000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      expect(result.merged[0].name).toBe('Local');
    });

    it('should prefer cloud when cloud timestamp is newer (>1s diff)', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 2000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 5000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      expect(result.merged[0].name).toBe('Cloud');
    });

    it('should merge fields for near-simultaneous edits (<1s diff)', () => {
      const local = [makeBirthday({
        id: 'b-1', name: 'Local', notes: '', category: 'friends', updatedAt: 1000
      })];
      const cloud = [makeBirthday({
        id: 'b-1', name: 'Cloud', notes: 'Important note', category: '', updatedAt: 1500
      })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      const merged = result.merged[0];

      expect(merged.name).toBe('Cloud');
      expect(merged.notes).toBe('Important note');
      expect(merged.category).toBe('friends');
      expect(merged.updatedAt).toBe(1500);
      expect(merged.syncStatus).toBe('synced');
    });

    it('should preserve notes from loser when winner has none', () => {
      const local = [makeBirthday({ id: 'b-1', notes: 'My note', updatedAt: 1200 })];
      const cloud = [makeBirthday({ id: 'b-1', notes: '', updatedAt: 1100 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      expect(result.merged[0].notes).toBe('My note');
    });

    it('should preserve category from loser when winner has none', () => {
      const local = [makeBirthday({ id: 'b-1', category: '', updatedAt: 1100 })];
      const cloud = [makeBirthday({ id: 'b-1', category: 'family', updatedAt: 1200 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      expect(result.merged[0].category).toBe('family');
    });

    it('should handle undefined updatedAt (treat as 0)', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: undefined })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: undefined })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      expect(result.merged[0].name).toBe('Cloud');
    });

    it('should use max timestamp for near-simultaneous edits', () => {
      const local = [makeBirthday({ id: 'b-1', updatedAt: 1300 })];
      const cloud = [makeBirthday({ id: 'b-1', updatedAt: 1800 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });
      expect(result.merged[0].updatedAt).toBe(1800);
    });
  });

  describe('deduplication (deduplicateByNameAndDate)', () => {
    it('should deduplicate by name+birthDate keeping the newer one', () => {
      const local = [
        makeBirthday({ id: 'b-1', name: 'mario rossi', birthDate: '1990-05-15', updatedAt: 3000 })
      ];
      const cloud = [
        makeBirthday({ id: 'b-2', name: 'Mario Rossi', birthDate: '1990-05-15', updatedAt: 1000 })
      ];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].id).toBe('b-1');
    });

    it('should not deduplicate entries with same name but different birth dates (treated as different people)', () => {
      const local = [
        makeBirthday({ id: 'b-1', name: 'Mario Rossi', birthDate: '1990-05-15' })
      ];
      const cloud = [
        makeBirthday({ id: 'b-2', name: 'Mario Rossi', birthDate: '1991-05-15' })
      ];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(2);
    });

    it('should handle trimmed names and case-insensitive comparison', () => {
      const local = [
        makeBirthday({ id: 'b-1', name: '  Mario Rossi  ', birthDate: '1990-05-15', updatedAt: 5000 })
      ];
      const cloud = [
        makeBirthday({ id: 'b-2', name: 'mario rossi', birthDate: '1990-05-15', updatedAt: 1000 })
      ];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].id).toBe('b-1');
    });

    it('should keep the cloud entry when it is newer', () => {
      const local = [
        makeBirthday({ id: 'b-1', name: 'LUIGI BIANCHI', birthDate: '1985-03-10', updatedAt: 500 })
      ];
      const cloud = [
        makeBirthday({ id: 'b-2', name: 'Luigi Bianchi', birthDate: '1985-03-10', updatedAt: 9000 })
      ];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(1);
      expect(result.merged[0].id).toBe('b-2');
      expect(result.merged[0].updatedAt).toBe(9000);
    });

    it('should not perform partial name matching (partial names stay as separate entries)', () => {
      const local = [
        makeBirthday({ id: 'b-1', name: 'Mario', birthDate: '1990-05-15' })
      ];
      const cloud = [
        makeBirthday({ id: 'b-2', name: 'Mario Rossi', birthDate: '1990-05-15' })
      ];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged.length).toBe(2);
    });

    it('should deduplicate via cloud-wins strategy when explicitly requested', () => {
      const local = [
        makeBirthday({ id: 'b-local', name: 'Anna Verdi', birthDate: '2000-01-01' })
      ];
      const cloud = [
        makeBirthday({ id: 'b-cloud', name: 'anna verdi', birthDate: '2000-01-01' })
      ];

      const result = service.merge(local, cloud, { strategy: 'cloud-wins', deduplicate: true });

      expect(result.merged.length).toBe(1);
    });
  });
});
