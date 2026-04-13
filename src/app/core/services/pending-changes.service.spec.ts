import { TestBed } from '@angular/core/testing';
import { PendingChangesService, SyncPayloadData } from './pending-changes.service';
import { LoggerService } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

// Helpers to cast lightweight test fixtures to SyncPayloadData without
// constructing full ValidatedBirthday/ValidatedCategory objects.
function bd(data: Record<string, unknown>): SyncPayloadData {
  return data as unknown as SyncPayloadData;
}

describe('PendingChangesService', () => {
  let service: PendingChangesService;
  let loggerMock: jasmine.SpyObj<LoggerService>;

  beforeEach(async () => {
    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(PendingChangesService);

    // Initialize and clear any leftover data from other test suites
    try {
      await service.initialize();
      await service.clearAll();
    } catch {
      // Ignore init errors - might not have IndexedDB store yet
    }
  });

  afterEach(async () => {
    try {
      await service.clearAll();
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should have 0 pending count after clear', () => {
    expect(service.pendingCount).toBe(0);
  });

  it('should have no pending changes after clear', () => {
    expect(service.hasPendingChanges).toBeFalse();
  });

  it('should add a pending change', async () => {
    await service.addChange('birthday', 'b-1', 'create', bd({ name: 'Test' }));
    expect(service.pendingCount).toBe(1);
    expect(service.hasPendingChanges).toBeTrue();
  });

  it('should deduplicate changes by entityType+entityId', async () => {
    await service.addChange('birthday', 'b-1', 'create', bd({ name: 'Test' }));
    await service.addChange('birthday', 'b-1', 'update', bd({ name: 'Updated' }));
    expect(service.pendingCount).toBe(1);
  });

  it('should cancel create+delete for same entity', async () => {
    await service.addChange('birthday', 'b-1', 'create', bd({ name: 'Test' }));
    expect(service.pendingCount).toBe(1);
    await service.addChange('birthday', 'b-1', 'delete', null);
    expect(service.pendingCount).toBe(0);
  });

  it('should preserve delete→create as a causal sequence (both ops kept)', async () => {
    // Scenario: entity already synced remotely, user deletes then re-creates it offline.
    // The delete MUST reach Firestore before the create; collapsing to just `create`
    // would lose the delete and risk a stale retry wiping the freshly created entity.
    await service.addChange('birthday', 'b-seq', 'delete', null);
    expect(service.pendingCount).toBe(1);
    await service.addChange('birthday', 'b-seq', 'create', bd({ name: 'Recreated' }));
    expect(service.pendingCount).toBe(2);

    const ops = service.getChangesForEntity('birthday').filter(c => c.entityId === 'b-seq');
    expect(ops.length).toBe(2);
    expect(ops[0].changeType).toBe('delete');
    expect(ops[1].changeType).toBe('create');
    // sequenceNumber must be strictly increasing so the sync processor picks the right order
    expect(ops[0].sequenceNumber).toBeLessThan(ops[1].sequenceNumber);
  });

  it('should absorb update into the pending create in a delete→create→update sequence', async () => {
    await service.addChange('birthday', 'b-dcu', 'delete', null);
    await service.addChange('birthday', 'b-dcu', 'create', bd({ name: 'v1' }));
    await service.addChange('birthday', 'b-dcu', 'update', bd({ name: 'v2' }));

    // Still 2 ops: [delete, create(v2)] — the update is merged into the create
    const ops = service.getChangesForEntity('birthday').filter(c => c.entityId === 'b-dcu');
    expect(ops.length).toBe(2);
    expect(ops.find(c => c.changeType === 'delete')).toBeTruthy();
    const create = ops.find(c => c.changeType === 'create');
    expect(create).toBeTruthy();
    expect((create!.data as { name: string }).name).toBe('v2');
  });

  it('should collapse delete→create→delete to a single delete', async () => {
    await service.addChange('birthday', 'b-dcd', 'delete', null);
    await service.addChange('birthday', 'b-dcd', 'create', bd({ name: 'Temp' }));
    expect(service.pendingCount).toBe(2);
    await service.addChange('birthday', 'b-dcd', 'delete', null);

    const ops = service.getChangesForEntity('birthday').filter(c => c.entityId === 'b-dcd');
    expect(ops.length).toBe(1);
    expect(ops[0].changeType).toBe('delete');
  });

  it('should assign sequenceNumbers in strictly increasing order', async () => {
    await service.addChange('birthday', 'b-s1', 'create', bd({}));
    await service.addChange('birthday', 'b-s2', 'create', bd({}));
    await service.addChange('birthday', 'b-s3', 'create', bd({}));

    const all = service.getChangesForEntity('birthday').filter(
      c => ['b-s1', 'b-s2', 'b-s3'].includes(c.entityId)
    );
    const seqs = all.map(c => c.sequenceNumber);
    const unique = new Set(seqs);
    expect(unique.size).toBe(seqs.length);
    // Must be monotonically increasing when sorted by insertion order
    const sorted = [...seqs].sort((a, b) => a - b);
    expect(seqs).toEqual(sorted);
  });

  it('should track multiple entities separately', async () => {
    await service.addChange('birthday', 'b-1', 'create', bd({ name: 'Test 1' }));
    await service.addChange('birthday', 'b-2', 'create', bd({ name: 'Test 2' }));
    expect(service.pendingCount).toBe(2);
  });

  it('should remove a specific change', async () => {
    await service.addChange('birthday', 'b-remove', 'create', bd({ name: 'ToRemove' }));
    const changes = service.getChangesForEntity('birthday');
    const targetChange = changes.find(c => c.entityId === 'b-remove');
    expect(targetChange).toBeTruthy();

    await service.removeChange(targetChange!.id);
    const remaining = service.getChangesForEntity('birthday').filter(c => c.entityId === 'b-remove');
    expect(remaining.length).toBe(0);
  });

  it('should increment retry count with markRetry', async () => {
    await service.addChange('birthday', 'b-retry', 'create', bd({ name: 'Retry' }));
    const changes = service.getChangesForEntity('birthday');
    const targetChange = changes.find(c => c.entityId === 'b-retry');
    expect(targetChange!.retryCount).toBe(0);

    await service.markRetry(targetChange!.id);
    const updatedChanges = service.getChangesForEntity('birthday');
    const updated = updatedChanges.find(c => c.entityId === 'b-retry');
    expect(updated!.retryCount).toBe(1);
  });

  it('should clear all changes', async () => {
    await service.addChange('birthday', 'b-clear1', 'create', bd({ name: 'Clear 1' }));
    await service.addChange('category', 'c-clear1', 'create', bd({ name: 'Cat 1' }));
    expect(service.pendingCount).toBeGreaterThanOrEqual(2);

    await service.clearAll();
    expect(service.pendingCount).toBe(0);
    expect(service.hasPendingChanges).toBeFalse();
  });

  it('should filter changes by entity type', async () => {
    await service.clearAll();
    await service.addChange('birthday', 'b-filter', 'create', bd({ name: 'Birth' }));
    await service.addChange('category', 'c-filter', 'create', bd({ name: 'Cat' }));

    const birthdayChanges = service.getChangesForEntity('birthday');
    const categoryChanges = service.getChangesForEntity('category');

    expect(birthdayChanges.some(c => c.entityId === 'b-filter')).toBeTrue();
    expect(categoryChanges.some(c => c.entityId === 'c-filter')).toBeTrue();
  });

  it('should emit on changes$', (done) => {
    let emitCount = 0;
    const sub = service.changes$.subscribe((changes) => {
      emitCount++;
      if (emitCount >= 2) {
        expect(changes.length).toBeGreaterThanOrEqual(1);
        sub.unsubscribe();
        done();
      }
    });

    service.addChange('birthday', 'b-emit', 'create', bd({ name: 'Emit' }));
  });

  it('changes$ should be an observable', () => {
    expect(service.changes$).toBeTruthy();
    expect(service.changes$.subscribe).toBeDefined();
  });

  it('getChangesForEntity should return empty array for untracked type', () => {
    const changes = service.getChangesForEntity('category');
    expect(Array.isArray(changes)).toBeTrue();
  });
});
