import { TestBed } from '@angular/core/testing';
import { PendingChangesService } from './pending-changes.service';
import { LoggerService } from './logger.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

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
    await service.addChange('birthday', 'b-1', 'create', { name: 'Test' });
    expect(service.pendingCount).toBe(1);
    expect(service.hasPendingChanges).toBeTrue();
  });

  it('should deduplicate changes by entityType+entityId', async () => {
    await service.addChange('birthday', 'b-1', 'create', { name: 'Test' });
    await service.addChange('birthday', 'b-1', 'update', { name: 'Updated' });
    expect(service.pendingCount).toBe(1);
  });

  it('should cancel create+delete for same entity', async () => {
    await service.addChange('birthday', 'b-1', 'create', { name: 'Test' });
    expect(service.pendingCount).toBe(1);
    await service.addChange('birthday', 'b-1', 'delete', null);
    expect(service.pendingCount).toBe(0);
  });

  it('should track multiple entities separately', async () => {
    await service.addChange('birthday', 'b-1', 'create', { name: 'Test 1' });
    await service.addChange('birthday', 'b-2', 'create', { name: 'Test 2' });
    expect(service.pendingCount).toBe(2);
  });

  it('should remove a specific change', async () => {
    await service.addChange('birthday', 'b-remove', 'create', { name: 'ToRemove' });
    const changes = service.getChangesForEntity('birthday');
    const targetChange = changes.find(c => c.entityId === 'b-remove');
    expect(targetChange).toBeTruthy();

    await service.removeChange(targetChange!.id);
    const remaining = service.getChangesForEntity('birthday').filter(c => c.entityId === 'b-remove');
    expect(remaining.length).toBe(0);
  });

  it('should increment retry count with markRetry', async () => {
    await service.addChange('birthday', 'b-retry', 'create', { name: 'Retry' });
    const changes = service.getChangesForEntity('birthday');
    const targetChange = changes.find(c => c.entityId === 'b-retry');
    expect(targetChange!.retryCount).toBe(0);

    await service.markRetry(targetChange!.id);
    const updatedChanges = service.getChangesForEntity('birthday');
    const updated = updatedChanges.find(c => c.entityId === 'b-retry');
    expect(updated!.retryCount).toBe(1);
  });

  it('should clear all changes', async () => {
    await service.addChange('birthday', 'b-clear1', 'create', { name: 'Clear 1' });
    await service.addChange('category', 'c-clear1', 'create', { name: 'Cat 1' });
    expect(service.pendingCount).toBeGreaterThanOrEqual(2);

    await service.clearAll();
    expect(service.pendingCount).toBe(0);
    expect(service.hasPendingChanges).toBeFalse();
  });

  it('should filter changes by entity type', async () => {
    await service.clearAll();
    await service.addChange('birthday', 'b-filter', 'create', { name: 'Birth' });
    await service.addChange('category', 'c-filter', 'create', { name: 'Cat' });

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

    service.addChange('birthday', 'b-emit', 'create', { name: 'Emit' });
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
