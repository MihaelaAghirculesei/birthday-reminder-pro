import { birthdayReducer, initialBirthdayState } from './birthday.reducer';
import * as BirthdayActions from './birthday.actions';
import { Birthday } from '../../../shared/models/birthday.model';

describe('Birthday Reducer', () => {
  const mockBirthday: Birthday = {
    id: '1',
    name: 'John Doe',
    birthDate: new Date(1990, 4, 15),
    category: 'friends'
  };

  it('should return initial state', () => {
    const action = { type: 'Unknown' };
    const state = birthdayReducer(undefined, action);

    expect(state).toBe(initialBirthdayState);
  });

  describe('Load Actions', () => {
    it('should set loading on loadBirthdays', () => {
      const action = BirthdayActions.loadBirthdays();
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should load birthdays on success', () => {
      const birthdays = [mockBirthday];
      const action = BirthdayActions.loadBirthdaysSuccess({ birthdays });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.entities['1']).toEqual(mockBirthday);
      expect(state.ids).toEqual(['1']);
      expect(state.loading).toBe(false);
    });

    it('should set error on loadBirthdaysFailure', () => {
      const error = 'Load error';
      const action = BirthdayActions.loadBirthdaysFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });
  });

  describe('Add Actions', () => {
    it('should add birthday on success', () => {
      const action = BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.entities['1']).toEqual(mockBirthday);
      expect(state.loading).toBe(false);
    });
  });

  describe('Update Actions (Optimistic)', () => {
    it('should optimistically apply update immediately', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      const updated = { ...mockBirthday, name: 'Jane Doe' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated }));

      expect(state.entities['1']?.name).toBe('Jane Doe');
      expect(state.optimisticBackup['1']).toEqual(mockBirthday);
    });

    it('should clear backup on updateBirthdaySuccess', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      const updated = { ...mockBirthday, name: 'Jane Doe' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated }));
      state = birthdayReducer(state, BirthdayActions.updateBirthdaySuccess({ birthday: updated }));

      expect(state.entities['1']?.name).toBe('Jane Doe');
      expect(state.optimisticBackup['1']).toBeUndefined();
    });

    it('should rollback on updateBirthdayFailure', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      const updated = { ...mockBirthday, name: 'Jane Doe' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated }));
      expect(state.entities['1']?.name).toBe('Jane Doe');

      state = birthdayReducer(state, BirthdayActions.updateBirthdayFailure({ error: 'Failed', id: '1' }));
      expect(state.entities['1']?.name).toBe('John Doe');
      expect(state.optimisticBackup['1']).toBeUndefined();
    });
  });

  describe('Delete Actions (Optimistic)', () => {
    it('should optimistically remove birthday on deleteBirthday action', () => {
      const initialState = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      const action = BirthdayActions.deleteBirthday({ id: '1' });
      const state = birthdayReducer(initialState, action);

      expect(state.entities['1']).toBeUndefined();
      expect(state.ids.length).toBe(0);
      expect(state.optimisticBackup['1']).toEqual(mockBirthday);
    });

    it('should clear backup on deleteBirthdaySuccess', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: '1' }));
      state = birthdayReducer(state, BirthdayActions.deleteBirthdaySuccess({ id: '1' }));

      expect(state.optimisticBackup['1']).toBeUndefined();
    });

    it('should rollback on deleteBirthdayFailure', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: '1' }));
      expect(state.entities['1']).toBeUndefined();

      state = birthdayReducer(state, BirthdayActions.deleteBirthdayFailure({ error: 'Failed', id: '1' }));
      expect(state.entities['1']).toEqual(mockBirthday);
      expect(state.optimisticBackup['1']).toBeUndefined();
    });

    it('should clear selectedId if deleted birthday was selected', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.selectBirthday({ id: '1' }));

      const action = BirthdayActions.deleteBirthday({ id: '1' });
      const newState = birthdayReducer(state, action);

      expect(newState.selectedId).toBeNull();
    });
  });

  describe('Filter Actions', () => {
    it('should update filters', () => {
      let state = birthdayReducer(initialBirthdayState, BirthdayActions.setSearchTerm({ searchTerm: 'John' }));
      expect(state.filters.searchTerm).toBe('John');

      state = birthdayReducer(state, BirthdayActions.setSelectedMonth({ month: 4 }));
      expect(state.filters.selectedMonth).toBe(4);

      state = birthdayReducer(state, BirthdayActions.setSelectedCategory({ category: 'family' }));
      expect(state.filters.selectedCategory).toBe('family');

      state = birthdayReducer(state, BirthdayActions.setSortOrder({ sortOrder: 'age' }));
      expect(state.filters.sortOrder).toBe('age');
    });

    it('should clear filters', () => {
      let state = birthdayReducer(initialBirthdayState, BirthdayActions.setSearchTerm({ searchTerm: 'test' }));
      state = birthdayReducer(state, BirthdayActions.clearFilters());
      expect(state.filters.searchTerm).toBe('');
    });
  });

  it('should select birthday', () => {
    const state = birthdayReducer(initialBirthdayState, BirthdayActions.selectBirthday({ id: '1' }));
    expect(state.selectedId).toBe('1');
  });

  it('should clear all birthdays', () => {
    let state = birthdayReducer(initialBirthdayState, BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));
    state = birthdayReducer(state, BirthdayActions.clearAllBirthdaysSuccess());
    expect(state.ids.length).toBe(0);
    expect(state.selectedId).toBeNull();
  });

  describe('Failure Actions', () => {
    it('should handle addBirthdayFailure', () => {
      const error = 'Add failed';
      const action = BirthdayActions.addBirthdayFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });

    it('should handle updateBirthdayFailure', () => {
      const error = 'Update failed';
      const action = BirthdayActions.updateBirthdayFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });

    it('should handle deleteBirthdayFailure', () => {
      const error = 'Delete failed';
      const action = BirthdayActions.deleteBirthdayFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });

    it('should handle clearAllBirthdaysFailure', () => {
      const error = 'Clear failed';
      const action = BirthdayActions.clearAllBirthdaysFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });
  });

  describe('Loading Actions', () => {
    it('should set loading on addBirthday', () => {
      const action = BirthdayActions.addBirthday({ birthday: mockBirthday });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should optimistically apply update on updateBirthday (no loading)', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      const updated = { ...mockBirthday, name: 'Updated Name' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated }));

      expect(state.loading).toBe(false);
      expect(state.entities['1']?.name).toBe('Updated Name');
      expect(state.optimisticBackup['1']).toEqual(mockBirthday);
    });

    it('should optimistically remove on deleteBirthday (no loading)', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: '1' }));

      expect(state.loading).toBe(false);
      expect(state.entities['1']).toBeUndefined();
    });

    it('should set loading on clearAllBirthdays', () => {
      const action = BirthdayActions.clearAllBirthdays();
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('Message Actions', () => {
    const mockMessage = {
      id: 'msg1',
      birthdayId: '1',
      title: 'Test',
      message: 'Test message',
      scheduledTime: '10:00',
      priority: 'normal' as const,
      active: true,
      messageType: 'text' as const,
      createdDate: new Date()
    };

    it('should add message to birthday', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      const action = BirthdayActions.addMessageToBirthdaySuccess({
        birthdayId: '1',
        message: mockMessage
      });
      state = birthdayReducer(state, action);

      expect(state.entities['1']?.scheduledMessages?.length).toBe(1);
      expect(state.entities['1']?.scheduledMessages?.[0]).toEqual(mockMessage);
    });

    it('should return same state when adding message to non-existent birthday', () => {
      const action = BirthdayActions.addMessageToBirthdaySuccess({
        birthdayId: 'non-existent',
        message: mockMessage
      });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state).toBe(initialBirthdayState);
    });

    it('should update message in birthday', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      state = birthdayReducer(
        state,
        BirthdayActions.addMessageToBirthdaySuccess({ birthdayId: '1', message: mockMessage })
      );

      const action = BirthdayActions.updateMessageInBirthdaySuccess({
        birthdayId: '1',
        messageId: 'msg1',
        updates: { title: 'Updated Title', active: false }
      });
      state = birthdayReducer(state, action);

      expect(state.entities['1']?.scheduledMessages?.[0].title).toBe('Updated Title');
      expect(state.entities['1']?.scheduledMessages?.[0].active).toBe(false);
    });

    it('should return same state when updating message in non-existent birthday', () => {
      const action = BirthdayActions.updateMessageInBirthdaySuccess({
        birthdayId: 'non-existent',
        messageId: 'msg1',
        updates: { title: 'Updated' }
      });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state).toBe(initialBirthdayState);
    });

    it('should delete message from birthday', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      state = birthdayReducer(
        state,
        BirthdayActions.addMessageToBirthdaySuccess({ birthdayId: '1', message: mockMessage })
      );

      const action = BirthdayActions.deleteMessageFromBirthdaySuccess({
        birthdayId: '1',
        messageId: 'msg1'
      });
      state = birthdayReducer(state, action);

      expect(state.entities['1']?.scheduledMessages?.length).toBe(0);
    });

    it('should return same state when deleting message from non-existent birthday', () => {
      const action = BirthdayActions.deleteMessageFromBirthdaySuccess({
        birthdayId: 'non-existent',
        messageId: 'msg1'
      });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state).toBe(initialBirthdayState);
    });
  });

  describe('updateFilters action', () => {
    it('should update multiple filters at once', () => {
      const filters = { searchTerm: 'John', selectedMonth: 5, selectedCategory: 'family' };
      const action = BirthdayActions.updateFilters({ filters });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.filters.searchTerm).toBe('John');
      expect(state.filters.selectedMonth).toBe(5);
      expect(state.filters.selectedCategory).toBe('family');
    });

    it('should preserve existing filters when updating partial filters', () => {
      let state = birthdayReducer(initialBirthdayState, BirthdayActions.setSearchTerm({ searchTerm: 'Test' }));
      state = birthdayReducer(state, BirthdayActions.updateFilters({ filters: { selectedMonth: 3 } }));

      expect(state.filters.searchTerm).toBe('Test');
      expect(state.filters.selectedMonth).toBe(3);
    });
  });

  describe('Test Data Actions', () => {
    it('should set loading on loadTestData', () => {
      const action = BirthdayActions.loadTestData();
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadTestDataSuccess', () => {
      const action = BirthdayActions.loadTestDataSuccess({ birthdays: [mockBirthday] });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadTestDataFailure', () => {
      const error = 'Test data load failed';
      const action = BirthdayActions.loadTestDataFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });
  });
});
