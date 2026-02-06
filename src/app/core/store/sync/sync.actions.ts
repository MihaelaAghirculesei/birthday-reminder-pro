import { createAction, props } from '@ngrx/store';
import { Birthday, Category } from '../../../shared/models/birthday.model';

// Sync State
export const setSyncState = createAction(
  '[Sync] Set State',
  props<{ state: 'idle' | 'syncing' | 'error' | 'offline' }>()
);

export const setOnlineStatus = createAction(
  '[Sync] Set Online Status',
  props<{ isOnline: boolean }>()
);

export const updatePendingCount = createAction(
  '[Sync] Update Pending Count',
  props<{ count: number }>()
);

// Sync Operations
export const startSync = createAction('[Sync] Start');

export const syncSuccess = createAction(
  '[Sync] Success',
  props<{ timestamp: number }>()
);

export const syncFailure = createAction(
  '[Sync] Failure',
  props<{ error: string }>()
);

// Push Changes to Cloud
export const pushPendingChanges = createAction('[Sync] Push Pending Changes');

export const pushChangesSuccess = createAction(
  '[Sync] Push Changes Success',
  props<{ syncedCount: number }>()
);

export const pushChangesFailure = createAction(
  '[Sync] Push Changes Failure',
  props<{ error: string }>()
);

// Pull Changes from Cloud
export const pullFromCloud = createAction('[Sync] Pull From Cloud');

export const pullBirthdaysSuccess = createAction(
  '[Sync] Pull Birthdays Success',
  props<{ birthdays: Birthday[] }>()
);

export const pullCategoriesSuccess = createAction(
  '[Sync] Pull Categories Success',
  props<{ categories: Category[] }>()
);

export const pullFailure = createAction(
  '[Sync] Pull Failure',
  props<{ error: string }>()
);

// Cloud Real-time Updates
export const cloudBirthdaysUpdated = createAction(
  '[Sync] Cloud Birthdays Updated',
  props<{ birthdays: Birthday[] }>()
);

export const cloudCategoriesUpdated = createAction(
  '[Sync] Cloud Categories Updated',
  props<{ categories: Category[] }>()
);

// Migration (first login)
export const migrateLocalToCloud = createAction('[Sync] Migrate Local To Cloud');

export const migrationSuccess = createAction(
  '[Sync] Migration Success',
  props<{ migratedCount: number }>()
);

export const migrationFailure = createAction(
  '[Sync] Migration Failure',
  props<{ error: string }>()
);

// Clear Error
export const clearSyncError = createAction('[Sync] Clear Error');
