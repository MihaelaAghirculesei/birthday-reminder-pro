import { syncReducer } from './sync.reducer';
import { SyncStatus, initialSyncStatus } from './sync.state';
import * as SyncActions from './sync.actions';

describe('Sync Reducer', () => {
  it('should return initial state', () => {
    const action = { type: 'NOOP' } as unknown as ReturnType<typeof import('./sync.actions').clearSyncError>;
    const state = syncReducer(undefined, action);
    expect(state).toEqual(initialSyncStatus);
  });

  describe('setSyncState', () => {
    it('should set sync state', () => {
      const action = SyncActions.setSyncState({ state: 'syncing' });
      const state = syncReducer(initialSyncStatus, action);
      expect(state.state).toBe('syncing');
    });

    it('should preserve error when transitioning to error state', () => {
      const stateWithError: SyncStatus = { ...initialSyncStatus, error: 'existing error' };
      const action = SyncActions.setSyncState({ state: 'error' });
      const state = syncReducer(stateWithError, action);
      expect(state.error).toBe('existing error');
    });

    it('should clear error when transitioning to non-error state', () => {
      const stateWithError: SyncStatus = { ...initialSyncStatus, error: 'existing error' };
      const action = SyncActions.setSyncState({ state: 'idle' });
      const state = syncReducer(stateWithError, action);
      expect(state.error).toBeNull();
    });
  });

  describe('setOnlineStatus', () => {
    it('should set online status', () => {
      const action = SyncActions.setOnlineStatus({ isOnline: false });
      const state = syncReducer(initialSyncStatus, action);
      expect(state.isOnline).toBeFalse();
      expect(state.state).toBe('offline');
    });

    it('should set state to idle when coming online with no pending', () => {
      const offlineState: SyncStatus = { ...initialSyncStatus, isOnline: false, state: 'offline', pendingChanges: 0 };
      const action = SyncActions.setOnlineStatus({ isOnline: true });
      const state = syncReducer(offlineState, action);
      expect(state.isOnline).toBeTrue();
      expect(state.state).toBe('idle');
    });

    it('should set state to syncing when coming online with pending changes', () => {
      const offlineState: SyncStatus = { ...initialSyncStatus, isOnline: false, state: 'offline', pendingChanges: 3 };
      const action = SyncActions.setOnlineStatus({ isOnline: true });
      const state = syncReducer(offlineState, action);
      expect(state.state).toBe('syncing');
    });
  });

  describe('updatePendingCount', () => {
    it('should update pending changes count', () => {
      const action = SyncActions.updatePendingCount({ count: 5 });
      const state = syncReducer(initialSyncStatus, action);
      expect(state.pendingChanges).toBe(5);
    });
  });

  describe('startSync', () => {
    it('should set state to syncing and clear error', () => {
      const action = SyncActions.startSync();
      const state = syncReducer({ ...initialSyncStatus, error: 'old' }, action);
      expect(state.state).toBe('syncing');
      expect(state.error).toBeNull();
    });
  });

  describe('syncSuccess', () => {
    it('should set idle state and record timestamp', () => {
      const timestamp = Date.now();
      const action = SyncActions.syncSuccess({ timestamp });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('idle');
      expect(state.lastSyncAt).toBe(timestamp);
      expect(state.error).toBeNull();
    });
  });

  describe('syncFailure', () => {
    it('should set error state', () => {
      const action = SyncActions.syncFailure({ error: 'Sync failed' });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('error');
      expect(state.error).toBe('Sync failed');
    });
  });

  describe('pushPendingChanges', () => {
    it('should set state to syncing', () => {
      const action = SyncActions.pushPendingChanges();
      const state = syncReducer(initialSyncStatus, action);
      expect(state.state).toBe('syncing');
    });
  });

  describe('pushChangesSuccess', () => {
    it('should set idle, reduce pending count, update timestamp', () => {
      const stateWithPending: SyncStatus = { ...initialSyncStatus, state: 'syncing', pendingChanges: 5 };
      const action = SyncActions.pushChangesSuccess({ syncedCount: 3 });
      const state = syncReducer(stateWithPending, action);
      expect(state.state).toBe('idle');
      expect(state.pendingChanges).toBe(2);
      expect(state.lastSyncAt).toBeTruthy();
    });

    it('should not go below 0 pending changes', () => {
      const stateWithPending: SyncStatus = { ...initialSyncStatus, state: 'syncing', pendingChanges: 1 };
      const action = SyncActions.pushChangesSuccess({ syncedCount: 5 });
      const state = syncReducer(stateWithPending, action);
      expect(state.pendingChanges).toBe(0);
    });
  });

  describe('pushChangesFailure', () => {
    it('should set error state', () => {
      const action = SyncActions.pushChangesFailure({ error: 'Push failed' });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('error');
      expect(state.error).toBe('Push failed');
    });
  });

  describe('pullFromCloud', () => {
    it('should set state to syncing', () => {
      const action = SyncActions.pullFromCloud();
      const state = syncReducer(initialSyncStatus, action);
      expect(state.state).toBe('syncing');
    });
  });

  describe('pullBirthdaysSuccess / pullCategoriesSuccess', () => {
    it('should set idle and update timestamp on birthday pull', () => {
      const action = SyncActions.pullBirthdaysSuccess({ birthdays: [] });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('idle');
      expect(state.lastSyncAt).toBeTruthy();
    });

    it('should set idle and update timestamp on category pull', () => {
      const action = SyncActions.pullCategoriesSuccess({ categories: [] });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('idle');
      expect(state.lastSyncAt).toBeTruthy();
    });
  });

  describe('pullFailure', () => {
    it('should set error state', () => {
      const action = SyncActions.pullFailure({ error: 'Pull failed' });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('error');
      expect(state.error).toBe('Pull failed');
    });
  });

  describe('migrateLocalToCloud', () => {
    it('should set state to syncing', () => {
      const action = SyncActions.migrateLocalToCloud();
      const state = syncReducer(initialSyncStatus, action);
      expect(state.state).toBe('syncing');
    });
  });

  describe('migrationSuccess', () => {
    it('should set idle and update timestamp', () => {
      const action = SyncActions.migrationSuccess({ migratedCount: 10 });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('idle');
      expect(state.lastSyncAt).toBeTruthy();
    });
  });

  describe('migrationFailure', () => {
    it('should set error state', () => {
      const action = SyncActions.migrationFailure({ error: 'Migration failed' });
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing' }, action);
      expect(state.state).toBe('error');
      expect(state.error).toBe('Migration failed');
    });
  });

  describe('clearSyncError', () => {
    it('should clear error and reset to idle if in error state', () => {
      const action = SyncActions.clearSyncError();
      const state = syncReducer({ ...initialSyncStatus, state: 'error', error: 'some error' }, action);
      expect(state.error).toBeNull();
      expect(state.state).toBe('idle');
    });

    it('should clear error but preserve state if not in error state', () => {
      const action = SyncActions.clearSyncError();
      const state = syncReducer({ ...initialSyncStatus, state: 'syncing', error: 'some error' }, action);
      expect(state.error).toBeNull();
      expect(state.state).toBe('syncing');
    });
  });
});
