export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'local-only';

export interface SyncMetadata {
  updatedAt?: number;
  ownerId?: string | null;
  syncStatus?: SyncStatus;
  lastSyncedAt?: number;
}

export interface Birthday extends SyncMetadata {
  id: string;
  name: string;
  birthDate: Date;
  notes?: string;
  reminderDays?: number;
  photo?: string;
  rememberPhoto?: string;
  zodiacSign?: string;
  googleCalendarEventId?: string;
  category?: string;
  scheduledMessages?: ScheduledMessage[];
}

export interface ScheduledMessage {
  id: string;
  title: string;
  message: string;
  scheduledTime: string;
  active: boolean;
  createdDate: Date;
  lastSentDate?: Date;
  messageType: 'text' | 'html';
  priority: 'low' | 'normal' | 'high';
  sentCount?: number;
  nextScheduledDate?: Date;
  notificationSent?: boolean;
  lastNotificationId?: string;
  birthdayId?: string;
}

export interface Category extends SyncMetadata {
  id: string;
  name: string;
  icon: string;
  color: string;
  isCustom?: boolean;
}

export function createSyncMetadata(ownerId: string | null = null): SyncMetadata {
  return {
    updatedAt: Date.now(),
    ownerId,
    syncStatus: ownerId ? 'pending' : 'local-only'
  };
}

export function updateSyncMetadata(existing: SyncMetadata, ownerId: string | null = null): SyncMetadata {
  return {
    ...existing,
    updatedAt: Date.now(),
    ownerId: ownerId ?? existing.ownerId,
    syncStatus: (ownerId ?? existing.ownerId) ? 'pending' : 'local-only'
  };
}

export function ensureSyncMetadata(birthday: Birthday, ownerId: string | null = null): Birthday {
  if (birthday.updatedAt !== undefined) {
    return birthday;
  }
  return {
    ...birthday,
    ...createSyncMetadata(ownerId)
  };
}
