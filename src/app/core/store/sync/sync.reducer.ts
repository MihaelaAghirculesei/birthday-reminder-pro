import { createReducer, on } from '@ngrx/store';

import * as SyncActions from './sync.actions';
import { initialSyncStatus,type SyncStatus } from './sync.state';

export const syncReducer = createReducer(
  initialSyncStatus,

  on(SyncActions.setSyncState, (state, { state: syncState }): SyncStatus => ({
    ...state,
    state: syncState,
    error: syncState === 'error' ? state.error : null
  })),

  on(SyncActions.setOnlineStatus, (state, { isOnline }): SyncStatus => ({
    ...state,
    isOnline,
    state: isOnline ? (state.pendingChanges > 0 ? 'syncing' : 'idle') : 'offline'
  })),

  on(SyncActions.updatePendingCount, (state, { count }): SyncStatus => ({
    ...state,
    pendingChanges: count
  })),

  on(SyncActions.startSync, (state): SyncStatus => ({
    ...state,
    state: 'syncing',
    error: null
  })),

  on(SyncActions.syncSuccess, (state, { timestamp }): SyncStatus => ({
    ...state,
    state: 'idle',
    lastSyncAt: timestamp,
    error: null
  })),

  on(SyncActions.syncFailure, (state, { error }): SyncStatus => ({
    ...state,
    state: 'error',
    error
  })),

  on(SyncActions.pushPendingChanges, (state): SyncStatus => ({
    ...state,
    state: 'syncing'
  })),

  on(SyncActions.pushChangesSuccess, (state, { syncedCount }): SyncStatus => ({
    ...state,
    state: 'idle',
    pendingChanges: Math.max(0, state.pendingChanges - syncedCount),
    lastSyncAt: Date.now(),
    batchProgress: null
  })),

  on(SyncActions.batchSyncProgress, (state, { completed, total }): SyncStatus => ({
    ...state,
    batchProgress: { completed, total }
  })),

  on(SyncActions.pushChangesFailure, (state, { error }): SyncStatus => ({
    ...state,
    state: 'error',
    error
  })),

  on(SyncActions.pullFromCloud, (state): SyncStatus => ({
    ...state,
    state: 'syncing'
  })),

  on(SyncActions.pullBirthdaysSuccess, SyncActions.pullCategoriesSuccess, (state): SyncStatus => ({
    ...state,
    state: 'idle',
    lastSyncAt: Date.now()
  })),

  on(SyncActions.pullFailure, (state, { error }): SyncStatus => ({
    ...state,
    state: 'error',
    error
  })),

  on(SyncActions.migrateLocalToCloud, (state): SyncStatus => ({
    ...state,
    state: 'syncing'
  })),

  on(SyncActions.migrationSuccess, (state): SyncStatus => ({
    ...state,
    state: 'idle',
    lastSyncAt: Date.now()
  })),

  on(SyncActions.migrationFailure, (state, { error }): SyncStatus => ({
    ...state,
    state: 'error',
    error
  })),

  on(SyncActions.clearSyncError, (state): SyncStatus => ({
    ...state,
    error: null,
    state: state.state === 'error' ? 'idle' : state.state
  }))
);
