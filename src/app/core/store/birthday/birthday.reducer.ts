import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { Birthday } from '../../../shared/models/birthday.model';
import { BirthdayState, initialBirthdayFilters } from './birthday.state';
import * as BirthdayActions from './birthday.actions';

export const birthdayAdapter: EntityAdapter<Birthday> = createEntityAdapter<Birthday>({
  selectId: (birthday: Birthday) => birthday.id,
  sortComparer: false
});

export const initialBirthdayState: BirthdayState = birthdayAdapter.getInitialState({
  filters: initialBirthdayFilters,
  loading: false,
  error: null,
  optimisticBackup: {}
});

export const birthdayReducer = createReducer(
  initialBirthdayState,

  on(BirthdayActions.loadBirthdays, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BirthdayActions.loadBirthdaysSuccess, (state, { birthdays }) =>
    birthdayAdapter.setAll(birthdays, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(BirthdayActions.loadBirthdaysFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(BirthdayActions.addBirthday, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BirthdayActions.addBirthdaySuccess, (state, { birthday }) =>
    birthdayAdapter.addOne(birthday, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(BirthdayActions.addBirthdayFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Optimistic update: apply changes immediately, backup previous version
  on(BirthdayActions.updateBirthday, (state, { birthday }) => {
    const previous = state.entities[birthday.id];
    const newState = birthdayAdapter.updateOne(
      { id: birthday.id, changes: birthday },
      {
        ...state,
        loading: false,
        error: null,
        optimisticBackup: previous
          ? { ...state.optimisticBackup, [birthday.id]: previous }
          : state.optimisticBackup
      }
    );
    return newState;
  }),

  // Optimistic success: clear backup
  on(BirthdayActions.updateBirthdaySuccess, (state, { birthday }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [birthday.id]: _removed, ...remainingBackup } = state.optimisticBackup;
    return {
      ...state,
      loading: false,
      error: null,
      optimisticBackup: remainingBackup
    };
  }),

  // Optimistic rollback: restore previous version on failure
  on(BirthdayActions.updateBirthdayFailure, (state, { error, id }) => {
    if (id && state.optimisticBackup[id]) {
      const backup = state.optimisticBackup[id];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...remainingBackup } = state.optimisticBackup;
      return birthdayAdapter.updateOne(
        { id, changes: backup },
        { ...state, loading: false, error, optimisticBackup: remainingBackup }
      );
    }
    return { ...state, loading: false, error };
  }),


  // Optimistic delete: remove immediately, backup for potential rollback
  on(BirthdayActions.deleteBirthday, (state, { id }) => {
    const entity = state.entities[id];
    return birthdayAdapter.removeOne(id, {
      ...state,
      loading: false,
      error: null,
      optimisticBackup: entity
        ? { ...state.optimisticBackup, [id]: entity }
        : state.optimisticBackup
    });
  }),

  // Optimistic delete success: clear backup
  on(BirthdayActions.deleteBirthdaySuccess, (state, { id }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...remainingBackup } = state.optimisticBackup;
    return {
      ...state,
      loading: false,
      error: null,
      optimisticBackup: remainingBackup
    };
  }),

  // Optimistic delete rollback: restore entity on failure
  on(BirthdayActions.deleteBirthdayFailure, (state, { error, id }) => {
    if (id && state.optimisticBackup[id]) {
      const backup = state.optimisticBackup[id];
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...remainingBackup } = state.optimisticBackup;
      return birthdayAdapter.addOne(backup, {
        ...state,
        loading: false,
        error,
        optimisticBackup: remainingBackup
      });
    }
    return { ...state, loading: false, error };
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
    loading: true,
    error: null
  })),

  on(BirthdayActions.clearAllBirthdaysSuccess, (state) =>
    birthdayAdapter.removeAll({
      ...state,
      loading: false,
      error: null
    })
  ),

  on(BirthdayActions.clearAllBirthdaysFailure, (state, { error }) => ({
    ...state,
    loading: false,
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

  on(BirthdayActions.loadTestData, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(BirthdayActions.loadTestDataSuccess, (state, { birthdays }) =>
    birthdayAdapter.setAll(birthdays, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(BirthdayActions.loadTestDataFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
