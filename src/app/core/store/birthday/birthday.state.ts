import { EntityState } from '@ngrx/entity';
import { Birthday } from '../../../shared/models/birthday.model';

/**
 * A single slot in the versioned optimistic-backup log.
 * Keyed by operationId (not entityId) so concurrent updates on the
 * same entity each have their own independently-resolvable snapshot.
 */
export interface OptimisticBackupEntry {
  /** Unique id generated at action-dispatch time (crypto.randomUUID()). */
  operationId: string;
  /** The entity this backup belongs to. */
  entityId: string;
  /** The entity state captured *before* the optimistic change was applied. */
  snapshot: Birthday;
}

export interface BirthdayState extends EntityState<Birthday> {
  filters: BirthdayFilters;
  saving: boolean;
  deleting: boolean;
  syncing: boolean;
  error: string | null;
  /** Ordered log of in-flight optimistic operations, oldest first. */
  optimisticBackup: OptimisticBackupEntry[];
}

export interface BirthdayFilters {
  searchTerm: string;
  selectedCategory: string | null;
}

export const initialBirthdayFilters: BirthdayFilters = {
  searchTerm: '',
  selectedCategory: null
};
