import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { PLATFORM_ID } from '@angular/core';
import { of, throwError } from 'rxjs';

import { SyncQueueProcessorService } from '../../core/services/sync-queue-processor.service';
import { PendingChangesService, PendingChange } from '../../core/services/pending-changes.service';
import { FirebaseAuthService } from '../../core/services/firebase-auth.service';
import { FirestoreService } from '../../core/services/firestore.service';
import { NetworkService } from '../../core/services/network.service';
import { LoggerService, SILENT_LOGGING } from '../../core/services/logger.service';
import { Birthday } from '../../shared/models/birthday.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal Birthday that satisfies the Zod schema used by the sync processor. */
function makeBirthday(id: string, name = 'Test'): Birthday {
  return { id, name, birthDate: '1990-06-15', category: 'friends', updatedAt: Date.now(), syncStatus: 'pending' };
}

/** Build a PendingChange with sensible defaults for test use. */
function makeChange(
  overrides: Partial<PendingChange> & Pick<PendingChange, 'id' | 'entityType' | 'entityId' | 'changeType' | 'data'>
): PendingChange {
  return { timestamp: Date.now(), retryCount: 0, sequenceNumber: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Offline→Online Sync Integration', () => {
  let service: SyncQueueProcessorService;
  let pendingChangesSpy: jasmine.SpyObj<PendingChangesService>;
  let firestoreSpy: jasmine.SpyObj<FirestoreService>;
  let authSpy: jasmine.SpyObj<FirebaseAuthService>;
  let networkSpy: jasmine.SpyObj<NetworkService>;

  /** In-memory queue backed by the pendingChangesSpy. */
  let queue: PendingChange[];

  beforeEach(() => {
    queue = [];

    // --- PendingChangesService: in-memory stand-in ---
    pendingChangesSpy = jasmine.createSpyObj<PendingChangesService>('PendingChangesService', [
      'addChange', 'removeChange', 'markRetry', 'getChangesForEntity'
    ]);
    Object.defineProperty(pendingChangesSpy, 'pendingCount', { get: () => queue.length, configurable: true });

    pendingChangesSpy.getChangesForEntity.and.callFake((entityType: string) =>
      queue.filter(c => c.entityType === entityType)
    );
    pendingChangesSpy.removeChange.and.callFake(async (id: string) => {
      queue = queue.filter(c => c.id !== id);
    });
    pendingChangesSpy.markRetry.and.callFake(async (id: string) => {
      queue = queue.map(c => c.id === id ? { ...c, retryCount: c.retryCount + 1 } : c);
    });
    pendingChangesSpy.addChange.and.returnValue(Promise.resolve());

    // --- FirestoreService ---
    firestoreSpy = jasmine.createSpyObj<FirestoreService>('FirestoreService', [
      'saveBirthday', 'deleteBirthday', 'saveCategory', 'deleteCategory'
    ]);
    firestoreSpy.saveBirthday.and.returnValue(of(undefined as unknown as void));
    firestoreSpy.deleteBirthday.and.returnValue(of(undefined as unknown as void));

    // --- FirebaseAuthService: authenticated user ---
    authSpy = jasmine.createSpyObj<FirebaseAuthService>('FirebaseAuthService', [], {
      currentUser: { uid: 'user-123' } as FirebaseAuthService['currentUser'],
      isAuthenticated: true
    });

    // --- NetworkService: online ---
    networkSpy = jasmine.createSpyObj<NetworkService>('NetworkService', [], { isOnline: true });

    TestBed.configureTestingModule({
      providers: [
        SyncQueueProcessorService,
        LoggerService,
        { provide: SILENT_LOGGING, useValue: true },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: PendingChangesService, useValue: pendingChangesSpy },
        { provide: FirestoreService, useValue: firestoreSpy },
        { provide: FirebaseAuthService, useValue: authSpy },
        { provide: NetworkService, useValue: networkSpy },
        provideMockStore()
      ]
    });

    service = TestBed.inject(SyncQueueProcessorService);
  });

  // -------------------------------------------------------------------------
  // Test 1 — Happy path: all queued changes reach Firestore when back online
  // -------------------------------------------------------------------------
  it('should flush all queued changes to Firestore when the device comes back online', async () => {
    const birthdayA = makeBirthday('bday-a', 'Alice');
    const birthdayB = makeBirthday('bday-b', 'Bob');
    queue = [
      makeChange({ id: 'c1', entityType: 'birthday', entityId: 'bday-a', changeType: 'create', data: birthdayA, sequenceNumber: 0 }),
      makeChange({ id: 'c2', entityType: 'birthday', entityId: 'bday-b', changeType: 'update', data: birthdayB, sequenceNumber: 1 })
    ];

    const syncedCount = await service.processPendingChanges();

    expect(syncedCount).toBe(2);
    expect(firestoreSpy.saveBirthday).toHaveBeenCalledTimes(2);
    expect(firestoreSpy.saveBirthday).toHaveBeenCalledWith('user-123', jasmine.objectContaining({ id: 'bday-a' }));
    expect(firestoreSpy.saveBirthday).toHaveBeenCalledWith('user-123', jasmine.objectContaining({ id: 'bday-b' }));
    expect(pendingChangesSpy.removeChange).toHaveBeenCalledWith('c1');
    expect(pendingChangesSpy.removeChange).toHaveBeenCalledWith('c2');
    expect(queue.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 2 — Causal ordering: delete must reach Firestore before re-create
  // -------------------------------------------------------------------------
  it('should process delete before create for the same entity regardless of insertion order', async () => {
    // The create was added to queue AFTER the delete (higher sequenceNumber),
    // but the spy returns them in reversed insertion order to validate sorting.
    const birthday = makeBirthday('bday-x', 'Xavier');
    queue = [
      makeChange({ id: 'c-create', entityType: 'birthday', entityId: 'bday-x', changeType: 'create', data: birthday, sequenceNumber: 1 }),
      makeChange({ id: 'c-delete', entityType: 'birthday', entityId: 'bday-x', changeType: 'delete', data: null,    sequenceNumber: 0 })
    ];

    const callOrder: string[] = [];
    firestoreSpy.deleteBirthday.and.callFake(() => { callOrder.push('delete'); return of(undefined as unknown as void); });
    firestoreSpy.saveBirthday.and.callFake(()  => { callOrder.push('create'); return of(undefined as unknown as void); });

    const syncedCount = await service.processPendingChanges();

    expect(syncedCount).toBe(2);
    expect(callOrder).toEqual(['delete', 'create'],
      'A stale delete retry after a re-create would silently wipe the new entity — causal order is critical');
  });

  // -------------------------------------------------------------------------
  // Test 3 — Entity-level blocking: a failed op for entity A must not block entity B
  // -------------------------------------------------------------------------
  it('should block subsequent ops for a failed entity while letting other entities sync', async () => {
    const birthdayA = makeBirthday('bday-a', 'Alice');
    const birthdayB = makeBirthday('bday-b', 'Bob');
    queue = [
      makeChange({ id: 'c-a1', entityType: 'birthday', entityId: 'bday-a', changeType: 'update', data: birthdayA, sequenceNumber: 0 }),
      makeChange({ id: 'c-a2', entityType: 'birthday', entityId: 'bday-a', changeType: 'delete', data: null,     sequenceNumber: 1 }),
      makeChange({ id: 'c-b1', entityType: 'birthday', entityId: 'bday-b', changeType: 'create', data: birthdayB, sequenceNumber: 2 })
    ];

    // First saveBirthday call (bday-a update) simulates a transient network error;
    // subsequent calls (bday-b create) succeed.
    let saveCallCount = 0;
    firestoreSpy.saveBirthday.and.callFake(() => {
      saveCallCount++;
      return saveCallCount === 1
        ? throwError(() => new Error('Network timeout'))
        : of(undefined as unknown as void);
    });

    const syncedCount = await service.processPendingChanges();

    // Only bday-b create succeeded
    expect(syncedCount).toBe(1);

    // bday-a update failed → retried; bday-a delete was never attempted
    expect(pendingChangesSpy.markRetry).toHaveBeenCalledWith('c-a1');
    expect(pendingChangesSpy.removeChange).not.toHaveBeenCalledWith('c-a1');
    expect(pendingChangesSpy.removeChange).not.toHaveBeenCalledWith('c-a2');
    expect(firestoreSpy.deleteBirthday).not.toHaveBeenCalled();

    // bday-b was unaffected by bday-a's failure
    expect(pendingChangesSpy.removeChange).toHaveBeenCalledWith('c-b1');
  });

  // -------------------------------------------------------------------------
  // Test 4 — Max retries exceeded: permanently failed op is silently skipped
  // -------------------------------------------------------------------------
  it('should permanently skip a change that has exhausted all retry attempts', async () => {
    const birthday = makeBirthday('bday-x', 'Xavier');
    queue = [
      makeChange({ id: 'c1', entityType: 'birthday', entityId: 'bday-x', changeType: 'update', data: birthday, sequenceNumber: 0, retryCount: 3 }),
      makeChange({ id: 'c2', entityType: 'birthday', entityId: 'bday-x', changeType: 'delete', data: null,     sequenceNumber: 1, retryCount: 0 })
    ];

    const syncedCount = await service.processPendingChanges();

    // Max-retry change is skipped and poisons the entity's causal chain —
    // the subsequent delete for the same entity must also be blocked.
    expect(syncedCount).toBe(0);
    expect(firestoreSpy.saveBirthday).not.toHaveBeenCalled();
    expect(firestoreSpy.deleteBirthday).not.toHaveBeenCalled();
    expect(pendingChangesSpy.markRetry).not.toHaveBeenCalled();
    expect(pendingChangesSpy.removeChange).not.toHaveBeenCalled();
  });
});
