import { birthdayReducer, initialBirthdayState, MAX_OPTIMISTIC_BACKUP_SIZE } from './birthday.reducer';
import * as BirthdayActions from './birthday.actions';
import { Birthday } from '../../../shared/models/birthday.model';
import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';

describe('Birthday Reducer', () => {
  const mockBirthday = createMockBirthday({ id: '1', name: 'John Doe', birthDate: '1990-05-15', category: 'friends' });

  it('should return initial state', () => {
    const action = { type: 'Unknown' };
    const state = birthdayReducer(undefined, action);

    expect(state).toBe(initialBirthdayState);
  });

  describe('Load Actions', () => {
    it('should set syncing on loadBirthdays', () => {
      const action = BirthdayActions.loadBirthdays();
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.syncing).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should load birthdays on success', () => {
      const birthdays = [mockBirthday];
      const action = BirthdayActions.loadBirthdaysSuccess({ birthdays });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.entities['1']).toEqual(mockBirthday);
      expect(state.ids).toEqual(['1']);
      expect(state.syncing).toBe(false);
    });

    it('should set error on loadBirthdaysFailure', () => {
      const error = 'Load error';
      const action = BirthdayActions.loadBirthdaysFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.syncing).toBe(false);
    });
  });

  describe('Add Actions', () => {
    it('should add birthday on success', () => {
      const action = BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.entities['1']).toEqual(mockBirthday);
      expect(state.saving).toBe(false);
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

    it('should not create backup when entity does not exist', () => {
      const state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.updateBirthday({ birthday: mockBirthday })
      );

      expect(state.optimisticBackup['1']).toBeUndefined();
    });

    it('should isolate backups across concurrent updates and clear only the confirmed one', () => {
      const b2: Birthday = { id: '2', name: 'Bob', birthDate: '1985-07-22' };
      let state = birthdayReducer(initialBirthdayState, BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));
      state = birthdayReducer(state, BirthdayActions.addBirthdaySuccess({ birthday: b2 }));

      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jane' } }));
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...b2, name: 'Robert' } }));
      state = birthdayReducer(state, BirthdayActions.updateBirthdaySuccess({ birthday: { ...mockBirthday, name: 'Jane' } }));

      expect(state.optimisticBackup['1']).toBeUndefined();
      expect(state.optimisticBackup['2']).toEqual(b2);
    });

    it('should not rollback when failure carries no id', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jane Doe' } }));
      state = birthdayReducer(state, BirthdayActions.updateBirthdayFailure({ error: 'Network error' }));

      expect(state.entities['1']?.name).toBe('Jane Doe');
      expect(state.optimisticBackup['1']).toEqual(mockBirthday);
      expect(state.error).toBe('Network error');
    });

    it('should warn user when failure carries id but backup is missing (race/eviction)', () => {
      // Simulate evicted backup: entity is in optimistic state but no backup exists
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      // Apply optimistic update so entity is in a "dirty" state
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jane Doe' } }));
      // Manually clear the backup to simulate eviction/race
      state = { ...state, optimisticBackup: {} };

      state = birthdayReducer(state, BirthdayActions.updateBirthdayFailure({ error: 'Failed', id: '1' }));

      // Entity stays inconsistent (no backup to restore from)
      expect(state.entities['1']?.name).toBe('Jane Doe');
      // But error warns the user
      expect(state.error).toBe('Le modifiche potrebbero non essere state salvate');
      expect(state.saving).toBe(false);
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

    it('should not create backup when deleting a non-existent entity', () => {
      const state = birthdayReducer(initialBirthdayState, BirthdayActions.deleteBirthday({ id: 'ghost' }));

      expect(state.optimisticBackup['ghost']).toBeUndefined();
    });

    it('should warn user when delete failure carries id but backup is missing (race/eviction)', () => {
      // Entity was optimistically removed but backup was evicted before failure arrived
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: '1' }));
      // Manually clear backup to simulate eviction/race
      state = { ...state, optimisticBackup: {} };

      state = birthdayReducer(state, BirthdayActions.deleteBirthdayFailure({ error: 'Failed', id: '1' }));

      // Entity cannot be restored (no backup)
      expect(state.entities['1']).toBeUndefined();
      // But error warns the user
      expect(state.error).toBe('Le modifiche potrebbero non essere state salvate');
      expect(state.deleting).toBe(false);
    });

  });

  describe('optimisticBackup bounds', () => {
    it('should not exceed MAX_OPTIMISTIC_BACKUP_SIZE entries on repeated failures (update)', () => {
      // Seed MAX+1 entities
      const count = MAX_OPTIMISTIC_BACKUP_SIZE + 1;
      const entities: Birthday[] = Array.from({ length: count }, (_, i) => ({
        id: `b${i}`,
        name: `Person ${i}`,
        birthDate: '1990-01-01'
      }));

      let state = initialBirthdayState;
      for (const entity of entities) {
        state = birthdayReducer(state, BirthdayActions.addBirthdaySuccess({ birthday: entity }));
      }

      // Optimistically update all — none succeed (no success/failure dispatched)
      for (const entity of entities) {
        state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...entity, name: 'Updated' } }));
      }

      expect(Object.keys(state.optimisticBackup).length).toBe(MAX_OPTIMISTIC_BACKUP_SIZE);
    });

    it('should not exceed MAX_OPTIMISTIC_BACKUP_SIZE entries on repeated failures (delete)', () => {
      const count = MAX_OPTIMISTIC_BACKUP_SIZE + 1;
      const entities: Birthday[] = Array.from({ length: count }, (_, i) => ({
        id: `d${i}`,
        name: `Person ${i}`,
        birthDate: '1990-01-01'
      }));

      let state = initialBirthdayState;
      for (const entity of entities) {
        state = birthdayReducer(state, BirthdayActions.addBirthdaySuccess({ birthday: entity }));
      }

      for (const entity of entities) {
        state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: entity.id }));
      }

      expect(Object.keys(state.optimisticBackup).length).toBe(MAX_OPTIMISTIC_BACKUP_SIZE);
    });

    it('should preserve original value when the same entity is updated twice without resolution', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      // First optimistic update: backup = original (John Doe)
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jane Doe' } }));
      // Second optimistic update on same entity: backup must NOT be overwritten
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jim Doe' } }));

      // Entity reflects latest optimistic change
      expect(state.entities['1']?.name).toBe('Jim Doe');
      // Backup still holds the original pre-optimistic value
      expect(state.optimisticBackup['1']).toEqual(mockBirthday);
    });

    it('should evict the oldest entry when cap is reached', () => {
      const count = MAX_OPTIMISTIC_BACKUP_SIZE;
      const entities: Birthday[] = Array.from({ length: count }, (_, i) => ({
        id: `e${i}`,
        name: `Person ${i}`,
        birthDate: '1990-01-01'
      }));

      let state = initialBirthdayState;
      for (const entity of entities) {
        state = birthdayReducer(state, BirthdayActions.addBirthdaySuccess({ birthday: entity }));
      }
      for (const entity of entities) {
        state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: entity.id }));
      }

      // Backup is exactly at MAX — add one more entity and delete it
      const extra: Birthday = { id: 'extra', name: 'Extra', birthDate: '2000-01-01' };
      state = birthdayReducer(state, BirthdayActions.addBirthdaySuccess({ birthday: extra }));
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: 'extra' }));

      expect(Object.keys(state.optimisticBackup).length).toBe(MAX_OPTIMISTIC_BACKUP_SIZE);
      // Oldest entry (e0) was evicted
      expect(state.optimisticBackup['e0']).toBeUndefined();
      // Newest entry is present
      expect(state.optimisticBackup['extra']).toBeDefined();
    });
  });

  describe('Filter Actions', () => {
    it('should update search term', () => {
      const state = birthdayReducer(initialBirthdayState, BirthdayActions.setSearchTerm({ searchTerm: 'John' }));
      expect(state.filters.searchTerm).toBe('John');
    });

    it('should update selected category', () => {
      const state = birthdayReducer(initialBirthdayState, BirthdayActions.setSelectedCategory({ category: 'family' }));
      expect(state.filters.selectedCategory).toBe('family');
    });

});

  it('should clear all birthdays', () => {
    let state = birthdayReducer(initialBirthdayState, BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));
    state = birthdayReducer(state, BirthdayActions.clearAllBirthdaysSuccess());
    expect(state.ids.length).toBe(0);
  });

  describe('Failure Actions', () => {
    it('should handle addBirthdayFailure', () => {
      const error = 'Add failed';
      const action = BirthdayActions.addBirthdayFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.saving).toBe(false);
    });

    it('should handle updateBirthdayFailure', () => {
      const error = 'Update failed';
      const action = BirthdayActions.updateBirthdayFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.saving).toBe(false);
    });

    it('should handle deleteBirthdayFailure', () => {
      const error = 'Delete failed';
      const action = BirthdayActions.deleteBirthdayFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.deleting).toBe(false);
    });

    it('should handle clearAllBirthdaysFailure', () => {
      const error = 'Clear failed';
      const action = BirthdayActions.clearAllBirthdaysFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.syncing).toBe(false);
    });
  });

  describe('Loading Actions', () => {
    it('should set saving on addBirthday', () => {
      const action = BirthdayActions.addBirthday({ birthday: mockBirthday });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.saving).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should optimistically apply update on updateBirthday and set saving', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      const updated = { ...mockBirthday, name: 'Updated Name' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated }));

      expect(state.saving).toBe(true);
      expect(state.entities['1']?.name).toBe('Updated Name');
      expect(state.optimisticBackup['1']).toEqual(mockBirthday);
    });

    it('should optimistically remove on deleteBirthday and set deleting', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: '1' }));

      expect(state.deleting).toBe(true);
      expect(state.entities['1']).toBeUndefined();
    });

    it('should set syncing on clearAllBirthdays', () => {
      const action = BirthdayActions.clearAllBirthdays();
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.syncing).toBe(true);
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

  describe('Import Actions', () => {
    it('should set saving on importBirthdays', () => {
      const action = BirthdayActions.importBirthdays({ birthdays: [mockBirthday] });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.saving).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add many birthdays on importBirthdaysSuccess', () => {
      const action = BirthdayActions.importBirthdaysSuccess({ birthdays: [mockBirthday] });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.entities['1']).toEqual(mockBirthday);
      expect(state.saving).toBe(false);
    });

    it('should set error on importBirthdaysFailure', () => {
      const action = BirthdayActions.importBirthdaysFailure({ error: 'Import failed' });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe('Import failed');
      expect(state.saving).toBe(false);
    });
  });

  it('should set googleCalendarEventId on calendarEventIdSet', () => {
    let state = birthdayReducer(
      initialBirthdayState,
      BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
    );
    state = birthdayReducer(
      state,
      BirthdayActions.calendarEventIdSet({ id: '1', calendarEventId: 'cal-event-123' })
    );

    expect(state.entities['1']?.googleCalendarEventId).toBe('cal-event-123');
  });

  describe('Test Data Actions', () => {
    it('should set syncing on loadTestData', () => {
      const action = BirthdayActions.loadTestData();
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.syncing).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle loadTestDataSuccess', () => {
      const action = BirthdayActions.loadTestDataSuccess({ birthdays: [mockBirthday] });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.syncing).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loadTestDataFailure', () => {
      const error = 'Test data load failed';
      const action = BirthdayActions.loadTestDataFailure({ error });
      const state = birthdayReducer(initialBirthdayState, action);

      expect(state.error).toBe(error);
      expect(state.syncing).toBe(false);
    });
  });
});
