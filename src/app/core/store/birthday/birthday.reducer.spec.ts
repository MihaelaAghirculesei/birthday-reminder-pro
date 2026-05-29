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
    it('should optimistically apply update immediately and push backup entry', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      const updated = { ...mockBirthday, name: 'Jane Doe' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated, operationId: 'op-1' }));

      expect(state.entities['1']?.name).toBe('Jane Doe');
      const entry = state.optimisticBackup.find(e => e.operationId === 'op-1');
      expect(entry?.snapshot).toEqual(mockBirthday);
      expect(entry?.entityId).toBe('1');
    });

    it('should remove only the matching entry on updateBirthdaySuccess', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      const updated = { ...mockBirthday, name: 'Jane Doe' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated, operationId: 'op-1' }));
      state = birthdayReducer(state, BirthdayActions.updateBirthdaySuccess({ birthday: updated, operationId: 'op-1' }));

      expect(state.entities['1']?.name).toBe('Jane Doe');
      expect(state.optimisticBackup.find(e => e.operationId === 'op-1')).toBeUndefined();
    });

    it('should rollback on updateBirthdayFailure using operationId', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      const updated = { ...mockBirthday, name: 'Jane Doe' };
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated, operationId: 'op-1' }));
      expect(state.entities['1']?.name).toBe('Jane Doe');

      state = birthdayReducer(state, BirthdayActions.updateBirthdayFailure({ error: 'Failed', operationId: 'op-1', id: '1' }));
      expect(state.entities['1']?.name).toBe('John Doe');
      expect(state.optimisticBackup.find(e => e.operationId === 'op-1')).toBeUndefined();
    });

    it('should not create backup when entity does not exist', () => {
      const state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.updateBirthday({ birthday: mockBirthday, operationId: 'op-1' })
      );

      expect(state.optimisticBackup.length).toBe(0);
    });

    it('should isolate backups across concurrent updates and clear only the confirmed one', () => {
      const b2: Birthday = { id: '2', name: 'Bob', birthDate: '1985-07-22' };
      let state = birthdayReducer(initialBirthdayState, BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));
      state = birthdayReducer(state, BirthdayActions.addBirthdaySuccess({ birthday: b2 }));

      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jane' }, operationId: 'op-1' }));
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...b2, name: 'Robert' }, operationId: 'op-2' }));
      state = birthdayReducer(state, BirthdayActions.updateBirthdaySuccess({ birthday: { ...mockBirthday, name: 'Jane' }, operationId: 'op-1' }));

      expect(state.optimisticBackup.find(e => e.operationId === 'op-1')).toBeUndefined();
      expect(state.optimisticBackup.find(e => e.operationId === 'op-2')?.snapshot).toEqual(b2);
    });

    it('should warn user when operationId has no matching backup (eviction)', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jane Doe' }, operationId: 'op-1' }));
      // Simulate eviction by manually clearing the log
      state = { ...state, optimisticBackup: [] };

      state = birthdayReducer(state, BirthdayActions.updateBirthdayFailure({ error: 'Failed', operationId: 'op-1', id: '1' }));

      expect(state.entities['1']?.name).toBe('Jane Doe');
      expect(state.error).toBe('Le modifiche potrebbero non essere state salvate');
      expect(state.saving).toBe(false);
    });

    it('should fix scenario B: update1 succeeds, update2 fails — rolls back to server-confirmed state', () => {
      // Scenario B: the critical race condition that the old dict-based backup could not handle.
      // op1: A → B  (succeeds)  → server has B
      // op2: B → C  (fails)     → must roll back to B, not A
      let state = birthdayReducer(initialBirthdayState, BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })); // A

      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'B' }, operationId: 'op-1' }));
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'C' }, operationId: 'op-2' }));

      // op1 succeeds: remove its backup entry — op2 backup (snapshot B) must still be there
      state = birthdayReducer(state, BirthdayActions.updateBirthdaySuccess({ birthday: { ...mockBirthday, name: 'B' }, operationId: 'op-1' }));
      expect(state.optimisticBackup.find(e => e.operationId === 'op-2')?.snapshot.name).toBe('B');

      // op2 fails: roll back to B (the state the server confirmed, not A)
      state = birthdayReducer(state, BirthdayActions.updateBirthdayFailure({ error: 'Failed', operationId: 'op-2', id: '1' }));
      expect(state.entities['1']?.name).toBe('B');
      expect(state.optimisticBackup.length).toBe(0);
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
      expect(state.optimisticBackup.find(e => e.operationId === '1')?.snapshot).toEqual(mockBirthday);
    });

    it('should clear backup on deleteBirthdaySuccess', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: '1' }));
      state = birthdayReducer(state, BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: mockBirthday }));

      expect(state.optimisticBackup.find(e => e.operationId === '1')).toBeUndefined();
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
      expect(state.optimisticBackup.find(e => e.operationId === '1')).toBeUndefined();
    });

    it('should not create backup when deleting a non-existent entity', () => {
      const state = birthdayReducer(initialBirthdayState, BirthdayActions.deleteBirthday({ id: 'ghost' }));

      expect(state.optimisticBackup.find(e => e.entityId === 'ghost')).toBeUndefined();
    });

    it('should warn user when delete failure carries id but backup is missing (race/eviction)', () => {
      // Entity was optimistically removed but backup was evicted before failure arrived
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );
      state = birthdayReducer(state, BirthdayActions.deleteBirthday({ id: '1' }));
      // Manually clear backup to simulate eviction/race
      state = { ...state, optimisticBackup: [] };

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
      for (const [i, entity] of entities.entries()) {
        state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...entity, name: 'Updated' }, operationId: `op-${i}` }));
      }

      expect(state.optimisticBackup.length).toBe(MAX_OPTIMISTIC_BACKUP_SIZE);
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

      expect(state.optimisticBackup.length).toBe(MAX_OPTIMISTIC_BACKUP_SIZE);
    });

    it('should store separate entries for concurrent updates on the same entity', () => {
      let state = birthdayReducer(
        initialBirthdayState,
        BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday })
      );

      // Two in-flight updates on the same entity each get their own snapshot
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jane Doe' }, operationId: 'op-1' }));
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: { ...mockBirthday, name: 'Jim Doe' }, operationId: 'op-2' }));

      // Entity reflects latest optimistic change
      expect(state.entities['1']?.name).toBe('Jim Doe');
      // Two independent backup entries exist
      expect(state.optimisticBackup.length).toBe(2);
      // op-1 snapshot is the true original
      expect(state.optimisticBackup.find(e => e.operationId === 'op-1')?.snapshot).toEqual(mockBirthday);
      // op-2 snapshot is the state after the first optimistic update
      expect(state.optimisticBackup.find(e => e.operationId === 'op-2')?.snapshot.name).toBe('Jane Doe');
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

      expect(state.optimisticBackup.length).toBe(MAX_OPTIMISTIC_BACKUP_SIZE);
      // Oldest entry (e0, operationId = 'e0') was evicted
      expect(state.optimisticBackup.find(e => e.operationId === 'e0')).toBeUndefined();
      // Newest entry is present
      expect(state.optimisticBackup.find(e => e.operationId === 'extra')).toBeDefined();
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
      // No entity in store + no id → no eviction warning, original error is preserved
      const action = BirthdayActions.updateBirthdayFailure({ error, operationId: 'op-x' });
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
      state = birthdayReducer(state, BirthdayActions.updateBirthday({ birthday: updated, operationId: 'op-1' }));

      expect(state.saving).toBe(true);
      expect(state.entities['1']?.name).toBe('Updated Name');
      expect(state.optimisticBackup.find(e => e.operationId === 'op-1')?.snapshot).toEqual(mockBirthday);
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
