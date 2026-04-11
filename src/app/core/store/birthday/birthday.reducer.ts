import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Birthday } from '../../../shared/models/birthday.model';
import { BirthdayState, initialBirthdayFilters } from './birthday.state';
import * as BirthdayActions from './birthday.actions';

export const MAX_OPTIMISTIC_BACKUP_SIZE = 50;

/**
 * Adds an entry to the optimistic backup dictionary with two safety guards:
 * - Does NOT overwrite an existing backup for the same id (preserves the true
 *   pre-optimistic state across repeated updates on the same entity).
 * - Evicts the oldest entry when the dictionary reaches MAX_OPTIMISTIC_BACKUP_SIZE,
 *   bounding memory growth even if many operations fail in sequence.
 */
function addToBackup(
  backup: Record<string, Birthday>,
  id: string,
  entity: Birthday
): Record<string, Birthday> {
  if (id in backup) return backup;
  const keys = Object.keys(backup);
  if (keys.length >= MAX_OPTIMISTIC_BACKUP_SIZE) {
    const { [keys[0]]: _evicted, ...trimmed } = backup as Record<string, Birthday>;
    return { ...trimmed, [id]: entity };
  }
  return { ...backup, [id]: entity };
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
  optimisticBackup: {}
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

  // Optimistic update: apply changes immediately, backup previous version
  on(BirthdayActions.updateBirthday, (state, { birthday }) => {
    const previous = state.entities[birthday.id];
    const newState = birthdayAdapter.updateOne(
      { id: birthday.id, changes: birthday },
      {
        ...state,
        saving: true,
        error: null,
        optimisticBackup: previous
          ? addToBackup(state.optimisticBackup, birthday.id, previous)
          : state.optimisticBackup
      }
    );
    return newState;
  }),

  // Optimistic success: clear backup
  on(BirthdayActions.updateBirthdaySuccess, (state, { birthday }) => {
    const { [birthday.id]: _removed, ...remainingBackup } = state.optimisticBackup;
    return {
      ...state,
      saving: false,
      error: null,
      optimisticBackup: remainingBackup
    };
  }),

  // Optimistic rollback: restore previous version on failure
  on(BirthdayActions.updateBirthdayFailure, (state, { error, id }) => {
    if (id && state.optimisticBackup[id]) {
      const backup = state.optimisticBackup[id];
      const { [id]: _removed, ...remainingBackup } = state.optimisticBackup;
      return birthdayAdapter.updateOne(
        { id, changes: backup },
        { ...state, saving: false, error, optimisticBackup: remainingBackup }
      );
    }
    // id present but no backup: eviction or race — entity may be inconsistent
    const missingBackup = id != null && !(id in state.optimisticBackup);
    return {
      ...state,
      saving: false,
      error: missingBackup ? 'Le modifiche potrebbero non essere state salvate' : error
    };
  }),


  // Optimistic delete: remove immediately, backup for potential rollback
  on(BirthdayActions.deleteBirthday, (state, { id }) => {
    const entity = state.entities[id];
    return birthdayAdapter.removeOne(id, {
      ...state,
      deleting: true,
      error: null,
      optimisticBackup: entity
        ? addToBackup(state.optimisticBackup, id, entity)
        : state.optimisticBackup
    });
  }),

  // Optimistic delete success: clear backup
  on(BirthdayActions.deleteBirthdaySuccess, (state, { id }) => {
      const { [id]: _removed, ...remainingBackup } = state.optimisticBackup;
    return {
      ...state,
      deleting: false,
      error: null,
      optimisticBackup: remainingBackup
    };
  }),

  // Optimistic delete rollback: restore entity on failure
  on(BirthdayActions.deleteBirthdayFailure, (state, { error, id }) => {
    if (id && state.optimisticBackup[id]) {
      const backup = state.optimisticBackup[id];
      const { [id]: _removed, ...remainingBackup } = state.optimisticBackup;
      return birthdayAdapter.addOne(backup, {
        ...state,
        deleting: false,
        error,
        optimisticBackup: remainingBackup
      });
    }
    // id present but no backup: eviction or race — entity may be permanently gone
    const missingBackup = id != null && !(id in state.optimisticBackup);
    return {
      ...state,
      deleting: false,
      error: missingBackup ? 'Le modifiche potrebbero non essere state salvate' : error
    };
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
