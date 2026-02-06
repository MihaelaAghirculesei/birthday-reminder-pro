import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SyncStatus, initialSyncStatus } from './sync.state';

export const selectSyncStatus = createFeatureSelector<SyncStatus>('sync');

const selectSyncStatusOrDefault = createSelector(
  selectSyncStatus,
  (status) => status ?? initialSyncStatus
);

export const selectSyncState = createSelector(
  selectSyncStatusOrDefault,
  (status) => status.state
);

export const selectLastSyncAt = createSelector(
  selectSyncStatusOrDefault,
  (status) => status.lastSyncAt
);

export const selectPendingChanges = createSelector(
  selectSyncStatusOrDefault,
  (status) => status.pendingChanges
);

export const selectSyncError = createSelector(
  selectSyncStatusOrDefault,
  (status) => status.error
);

export const selectIsOnline = createSelector(
  selectSyncStatusOrDefault,
  (status) => status.isOnline
);

export const selectIsSyncing = createSelector(
  selectSyncState,
  (state) => state === 'syncing'
);

export const selectHasPendingChanges = createSelector(
  selectPendingChanges,
  (count) => count > 0
);

export const selectSyncSummary = createSelector(
  selectSyncStatusOrDefault,
  (status) => ({
    state: status.state,
    isOnline: status.isOnline,
    pendingCount: status.pendingChanges,
    lastSync: status.lastSyncAt ? new Date(status.lastSyncAt) : null,
    hasError: status.error !== null
  })
);
