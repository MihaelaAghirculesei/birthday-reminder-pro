export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncStatus {
  state: SyncState;
  lastSyncAt: number | null;
  pendingChanges: number;
  error: string | null;
  isOnline: boolean;
}

export const initialSyncStatus: SyncStatus = {
  state: 'idle',
  lastSyncAt: null,
  pendingChanges: 0,
  error: null,
  isOnline: true
};
