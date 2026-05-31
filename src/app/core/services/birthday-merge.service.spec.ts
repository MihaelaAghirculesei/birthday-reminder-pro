import { type Birthday } from '../../shared/models/birthday.model';
import { BirthdayMergeService } from './birthday-merge.service';

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

    it('near-simultaneous: merged result goes to toUpload so cloud receives the combined data', () => {
      // Device A (local) added a category 800ms before Device B (cloud) added a note
      const local = [makeBirthday({ id: 'b-1', notes: '', category: 'friends', updatedAt: 1000 })];
      const cloud = [makeBirthday({ id: 'b-1', notes: 'Birthday party', category: '', updatedAt: 1800 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      // Both fields preserved in the merged result
      expect(result.merged[0].category).toBe('friends');
      expect(result.merged[0].notes).toBe('Birthday party');
      // Merged result must be uploaded so cloud gains the 'friends' category
      expect(result.toUpload.length).toBe(1);
      expect(result.toUpload[0].category).toBe('friends');
      expect(result.toUpload[0].notes).toBe('Birthday party');
    });

    it('near-simultaneous: toUpload contains the merged object with syncStatus synced, not raw local', () => {
      const local = [makeBirthday({ id: 'b-1', category: 'family', syncStatus: 'pending', updatedAt: 1000 })];
      const cloud = [makeBirthday({ id: 'b-1', category: '', syncStatus: 'synced', updatedAt: 1900 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.toUpload.length).toBe(1);
      // Uploaded item is the merged object: syncStatus synced, max updatedAt, merged category
      expect(result.toUpload[0].syncStatus).toBe('synced');
      expect(result.toUpload[0].updatedAt).toBe(1900);
      expect(result.toUpload[0].category).toBe('family');
    });

    it('near-simultaneous: two devices edit the same field — newer value wins and result is uploaded to cloud', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Old Name', updatedAt: 1000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'New Name', updatedAt: 1500 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged[0].name).toBe('New Name');
      // Uploaded because it is a merged object that cloud should confirm
      expect(result.toUpload.length).toBe(1);
    });

    it('strictly newer cloud (>1s diff): cloud version wins entirely, no upload needed', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 1000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 5000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged[0].name).toBe('Cloud');
      // Cloud already has this version — no upload needed
      expect(result.toUpload.length).toBe(0);
    });

    it('equal timestamps: cloud wins by convention, no upload needed', () => {
      const local = [makeBirthday({ id: 'b-1', name: 'Local', updatedAt: 2000 })];
      const cloud = [makeBirthday({ id: 'b-1', name: 'Cloud', updatedAt: 2000 })];

      const result = service.merge(local, cloud, { strategy: 'latest-wins' });

      expect(result.merged[0].name).toBe('Cloud');
      expect(result.toUpload.length).toBe(0);
    });
  });

  describe('offline conflict scenario — same birthday edited on two devices', () => {
    /**
     * These tests model the end-to-end conflict case:
     *   1. Two devices go offline with the same birthday record.
     *   2. Both make edits locally (different or overlapping fields).
     *   3. Device B syncs first — its version is now in cloud.
     *   4. Device A syncs: merge() is called with Device A's local vs Device B's cloud.
     *
     * The outcome depends on how far apart the edits happened (updatedAt diff).
     */

    it('strictly newer edit wins entirely (>1s diff): earlier device changes are discarded', () => {
      // Device A renamed the birthday and added a note 4 seconds before Device B renamed it again.
      // Device B synced first → cloud has Device B's version.
      // When Device A syncs, cloud is strictly newer → cloud wins in full; Device A's note is lost.
      const deviceA = [makeBirthday({ id: 'b-1', name: 'Old Name', notes: 'A note', updatedAt: 1000 })];
      const deviceB = [makeBirthday({ id: 'b-1', name: 'New Name', notes: '', updatedAt: 5000 })];

      const result = service.merge(deviceA, deviceB, { strategy: 'latest-wins' });

      expect(result.merged[0].name).toBe('New Name');
      expect(result.merged[0].notes).toBe('');  // Device A's note is silently discarded — cloud wins entirely
      expect(result.toUpload.length).toBe(0);   // Cloud already has the winning version
    });

    it('near-simultaneous edits on different fields both survive (≤1s diff): field-level merge', () => {
      // Device A went offline and set category='family' at t=1000.
      // Device B went offline and added notes='Call mum' at t=1800 (800 ms later).
      // Device B synced first → cloud has notes but no category.
      // Device A syncs: near-simultaneous → field-merge preserves both changes.
      const deviceA = [makeBirthday({ id: 'b-1', notes: '', category: 'family', updatedAt: 1000 })];
      const deviceB = [makeBirthday({ id: 'b-1', notes: 'Call mum', category: '', updatedAt: 1800 })];

      const result = service.merge(deviceA, deviceB, { strategy: 'latest-wins' });
      const merged = result.merged[0];

      expect(merged.notes).toBe('Call mum');    // From Device B (winner — higher updatedAt)
      expect(merged.category).toBe('family');   // From Device A (loser fallback — winner's was empty)
      expect(result.toUpload.length).toBe(1);   // Re-upload so cloud gains Device A's category
      expect(result.toUpload[0].notes).toBe('Call mum');
      expect(result.toUpload[0].category).toBe('family');
    });

    it('near-simultaneous conflict on the same field: strictly newer value wins, result is uploaded', () => {
      // Both devices changed the name within 1 second of each other — no field-level merge possible.
      // The newer timestamp wins the field; the result is re-uploaded to cloud.
      const deviceA = [makeBirthday({ id: 'b-1', name: 'Device A Name', updatedAt: 1000 })];
      const deviceB = [makeBirthday({ id: 'b-1', name: 'Device B Name', updatedAt: 1900 })];

      const result = service.merge(deviceA, deviceB, { strategy: 'latest-wins' });

      expect(result.merged[0].name).toBe('Device B Name'); // Newer timestamp wins
      expect(result.toUpload.length).toBe(1);              // Merged object must be re-uploaded
      expect(result.toUpload[0].name).toBe('Device B Name');
      expect(result.toUpload[0].syncStatus).toBe('synced');
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
