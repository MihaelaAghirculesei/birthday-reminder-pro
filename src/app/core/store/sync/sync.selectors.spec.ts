import * as SyncSelectors from './sync.selectors';
import { SyncStatus } from './sync.state';

describe('Sync Selectors', () => {
  const idleStatus: SyncStatus = {
    state: 'idle',
    lastSyncAt: 1700000000000,
    pendingChanges: 0,
    error: null,
    isOnline: true,
    batchProgress: null
  };

  const syncingStatus: SyncStatus = {
    state: 'syncing',
    lastSyncAt: null,
    pendingChanges: 3,
    error: null,
    isOnline: true,
    batchProgress: { completed: 50, total: 200 }
  };

  const errorStatus: SyncStatus = {
    state: 'error',
    lastSyncAt: 1700000000000,
    pendingChanges: 2,
    error: 'Network error',
    isOnline: true,
    batchProgress: null
  };

  const offlineStatus: SyncStatus = {
    state: 'offline',
    lastSyncAt: 1700000000000,
    pendingChanges: 1,
    error: null,
    isOnline: false,
    batchProgress: null
  };

  it('selectSyncState should return the sync state', () => {
    expect(SyncSelectors.selectSyncState.projector(idleStatus)).toBe('idle');
    expect(SyncSelectors.selectSyncState.projector(syncingStatus)).toBe('syncing');
    expect(SyncSelectors.selectSyncState.projector(errorStatus)).toBe('error');
    expect(SyncSelectors.selectSyncState.projector(offlineStatus)).toBe('offline');
  });

  it('selectLastSyncAt should return timestamp', () => {
    expect(SyncSelectors.selectLastSyncAt.projector(idleStatus)).toBe(1700000000000);
    expect(SyncSelectors.selectLastSyncAt.projector(syncingStatus)).toBeNull();
  });

  it('selectPendingChanges should return count', () => {
    expect(SyncSelectors.selectPendingChanges.projector(idleStatus)).toBe(0);
    expect(SyncSelectors.selectPendingChanges.projector(syncingStatus)).toBe(3);
  });

  it('selectSyncError should return error', () => {
    expect(SyncSelectors.selectSyncError.projector(errorStatus)).toBe('Network error');
    expect(SyncSelectors.selectSyncError.projector(idleStatus)).toBeNull();
  });

  it('selectIsOnline should return online status', () => {
    expect(SyncSelectors.selectIsOnline.projector(idleStatus)).toBeTrue();
    expect(SyncSelectors.selectIsOnline.projector(offlineStatus)).toBeFalse();
  });

  it('selectIsSyncing should return true when syncing', () => {
    expect(SyncSelectors.selectIsSyncing.projector('syncing')).toBeTrue();
    expect(SyncSelectors.selectIsSyncing.projector('idle')).toBeFalse();
  });

  it('selectHasPendingChanges should return true when count > 0', () => {
    expect(SyncSelectors.selectHasPendingChanges.projector(3)).toBeTrue();
    expect(SyncSelectors.selectHasPendingChanges.projector(0)).toBeFalse();
  });

  it('selectSyncSummary should return summary object', () => {
    const summary = SyncSelectors.selectSyncSummary.projector(idleStatus);
    expect(summary.state).toBe('idle');
    expect(summary.isOnline).toBeTrue();
    expect(summary.pendingCount).toBe(0);
    expect(summary.lastSync).toEqual(new Date(1700000000000));
    expect(summary.hasError).toBeFalse();
  });

  it('selectSyncSummary should return null lastSync when no timestamp', () => {
    const summary = SyncSelectors.selectSyncSummary.projector(syncingStatus);
    expect(summary.lastSync).toBeNull();
  });

  it('selectSyncSummary should detect error', () => {
    const summary = SyncSelectors.selectSyncSummary.projector(errorStatus);
    expect(summary.hasError).toBeTrue();
  });

  it('selectBatchSyncProgress should return batchProgress when syncing in batches', () => {
    expect(SyncSelectors.selectBatchSyncProgress.projector(syncingStatus)).toEqual({ completed: 50, total: 200 });
    expect(SyncSelectors.selectBatchSyncProgress.projector(idleStatus)).toBeNull();
  });
});
