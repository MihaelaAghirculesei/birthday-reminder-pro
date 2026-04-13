import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Birthday } from '../../../shared/models/birthday.model';
import { BirthdayState, initialBirthdayFilters, OptimisticBackupEntry } from './birthday.state';
import * as BirthdayActions from './birthday.actions';

export const MAX_OPTIMISTIC_BACKUP_SIZE = 50;

/**
 * Appends a new entry to the versioned backup log.
 *
 * Unlike the old dict-based addToBackup, every call produces a new entry —
 * even for the same entityId — so concurrent in-flight operations each own
 * an independent snapshot.  The log is bounded to MAX_OPTIMISTIC_BACKUP_SIZE
 * entries; when the cap is reached the oldest entry is evicted.
 */
function pushToBackup(
  backup: OptimisticBackupEntry[],
  entry: OptimisticBackupEntry
): OptimisticBackupEntry[] {
  const next = [...backup, entry];
  return next.length > MAX_OPTIMISTIC_BACKUP_SIZE ? next.slice(1) : next;
}

export const birthdayAdapter: EntityAdapter<Birthday> = createEntityAdapter<Birthday>({
  selectId: (birthday: Birthday) => birthday.id,
  sortComparer: false
});

export const initialBirthdayState: BirthdayState = birthdayAdapter.getInitialState({
  filters: initialBirthdayFilters,
  saving: false,
  deleting: false,
  syncing: false,
  error: null,
  optimisticBackup: []
});

export const birthdayReducer = createReducer(
  initialBirthdayState,

  on(BirthdayActions.loadBirthdays, (state) => ({
    ...state,
    syncing: true,
    error: null
  })),

  on(BirthdayActions.loadBirthdaysSuccess, (state, { birthdays }) =>
    birthdayAdapter.setAll(birthdays, {
      ...state,
      syncing: false,
      error: null
    })
  ),

  on(BirthdayActions.loadBirthdaysFailure, (state, { error }) => ({
    ...state,
    syncing: false,
    error
  })),

  on(BirthdayActions.addBirthday, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(BirthdayActions.addBirthdaySuccess, (state, { birthday }) =>
    birthdayAdapter.addOne(birthday, {
      ...state,
      saving: false,
      error: null
    })
  ),

  on(BirthdayActions.addBirthdayFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  // Optimistic update: apply changes immediately, push per-operation snapshot
  on(BirthdayActions.updateBirthday, (state, { birthday, operationId }) => {
    const previous = state.entities[birthday.id];
    return birthdayAdapter.updateOne(
      { id: birthday.id, changes: birthday },
      {
        ...state,
        saving: true,
        error: null,
        optimisticBackup: previous
          ? pushToBackup(state.optimisticBackup, { operationId, entityId: birthday.id, snapshot: previous })
          : state.optimisticBackup
      }
    );
  }),

  // Optimistic success: remove the entry for this specific operation
  on(BirthdayActions.updateBirthdaySuccess, (state, { operationId }) => ({
    ...state,
    saving: false,
    error: null,
    optimisticBackup: state.optimisticBackup.filter(e => e.operationId !== operationId)
  })),

  // Optimistic rollback: restore the snapshot captured for this exact operation
  on(BirthdayActions.updateBirthdayFailure, (state, { error, operationId, id }) => {
    const entry = state.optimisticBackup.find(e => e.operationId === operationId);
    if (!entry) {
      // No backup found — distinguish two cases:
      //   • id provided and entity still in store → backup was evicted while the entity
      //     is in an unknown optimistic state; warn the user.
      //   • any other case (no id, entity not found) → plain failure, propagate error.
      const entityIsDirty = id != null && id in state.entities;
      return {
        ...state,
        saving: false,
        error: entityIsDirty ? 'Le modifiche potrebbero non essere state salvate' : error
      };
    }
    return birthdayAdapter.updateOne(
      { id: entry.entityId, changes: entry.snapshot },
      {
        ...state,
        saving: false,
        error,
        optimisticBackup: state.optimisticBackup.filter(e => e.operationId !== operationId)
      }
    );
  }),


  // Optimistic delete: remove immediately, backup for potential rollback.
  // Delete operations are never concurrent on the same entity (the entity
  // disappears from the UI after the first optimistic remove), so using the
  // entityId as the operationId is safe and avoids adding a new action prop.
  on(BirthdayActions.deleteBirthday, (state, { id }) => {
    const entity = state.entities[id];
    return birthdayAdapter.removeOne(id, {
      ...state,
      deleting: true,
      error: null,
      optimisticBackup: entity
        ? pushToBackup(state.optimisticBackup, { operationId: id, entityId: id, snapshot: entity })
        : state.optimisticBackup
    });
  }),

  // Optimistic delete success: remove the backup entry for this entity
  on(BirthdayActions.deleteBirthdaySuccess, (state, { id }) => ({
    ...state,
    deleting: false,
    error: null,
    optimisticBackup: state.optimisticBackup.filter(e => e.operationId !== id)
  })),

  // Optimistic delete rollback: restore entity from its backup snapshot
  on(BirthdayActions.deleteBirthdayFailure, (state, { error, id }) => {
    if (!id) {
      return { ...state, deleting: false, error };
    }
    const entry = state.optimisticBackup.find(e => e.operationId === id);
    if (!entry) {
      return {
        ...state,
        deleting: false,
        error: 'Le modifiche potrebbero non essere state salvate'
      };
    }
    return birthdayAdapter.addOne(entry.snapshot, {
      ...state,
      deleting: false,
      error,
      optimisticBackup: state.optimisticBackup.filter(e => e.operationId !== id)
    });
  }),

  on(BirthdayActions.setSearchTerm, (state, { searchTerm }) => ({
    ...state,
    filters: {
      ...state.filters,
      searchTerm
    }
  })),

  on(BirthdayActions.setSelectedCategory, (state, { category }) => ({
    ...state,
    filters: {
      ...state.filters,
      selectedCategory: category
    }
  })),

  on(BirthdayActions.clearAllBirthdays, (state) => ({
    ...state,
    syncing: true,
    error: null
  })),

  on(BirthdayActions.clearAllBirthdaysSuccess, (state) =>
    birthdayAdapter.removeAll({
      ...state,
      syncing: false,
      error: null
    })
  ),

  on(BirthdayActions.clearAllBirthdaysFailure, (state, { error }) => ({
    ...state,
    syncing: false,
    error
  })),

  on(BirthdayActions.addMessageToBirthdaySuccess, (state, { birthdayId, message }) => {
    const birthday = state.entities[birthdayId];
    if (!birthday) return state;

    const updatedBirthday = {
      ...birthday,
      scheduledMessages: [...(birthday.scheduledMessages || []), message]
    };

    return birthdayAdapter.updateOne(
      { id: birthdayId, changes: updatedBirthday },
      state
    );
  }),

  on(BirthdayActions.updateMessageInBirthdaySuccess, (state, { birthdayId, messageId, updates }) => {
    const birthday = state.entities[birthdayId];
    if (!birthday?.scheduledMessages) return state;

    const updatedMessages = birthday.scheduledMessages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    );

    const updatedBirthday = {
      ...birthday,
      scheduledMessages: updatedMessages
    };

    return birthdayAdapter.updateOne(
      { id: birthdayId, changes: updatedBirthday },
      state
    );
  }),

  on(BirthdayActions.deleteMessageFromBirthdaySuccess, (state, { birthdayId, messageId }) => {
    const birthday = state.entities[birthdayId];
    if (!birthday?.scheduledMessages) return state;

    const updatedMessages = birthday.scheduledMessages.filter(msg => msg.id !== messageId);

    const updatedBirthday = {
      ...birthday,
      scheduledMessages: updatedMessages
    };

    return birthdayAdapter.updateOne(
      { id: birthdayId, changes: updatedBirthday },
      state
    );
  }),

  on(BirthdayActions.importBirthdays, (state) => ({
    ...state,
    saving: true,
    error: null
  })),

  on(BirthdayActions.importBirthdaysSuccess, (state, { birthdays }) =>
    birthdayAdapter.addMany(birthdays, {
      ...state,
      saving: false,
      error: null
    })
  ),

  on(BirthdayActions.importBirthdaysFailure, (state, { error }) => ({
    ...state,
    saving: false,
    error
  })),

  on(BirthdayActions.loadTestData, (state) => ({
    ...state,
    syncing: true,
    error: null
  })),

  on(BirthdayActions.loadTestDataSuccess, (state, { birthdays }) =>
    birthdayAdapter.setAll(birthdays, {
      ...state,
      syncing: false,
      error: null
    })
  ),

  on(BirthdayActions.loadTestDataFailure, (state, { error }) => ({
    ...state,
    syncing: false,
    error
  })),

  on(BirthdayActions.calendarEventIdSet, (state, { id, calendarEventId }) =>
    birthdayAdapter.updateOne({ id, changes: { googleCalendarEventId: calendarEventId } }, state)
  )
);
