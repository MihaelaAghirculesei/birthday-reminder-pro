import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { type Observable, of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { type Birthday } from '../../../shared/models/birthday.model';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';
import { NotificationService } from '../../services/notification.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import * as BirthdayActions from './birthday.actions';
import { BirthdayCalendarSyncEffects } from './birthday-calendar-sync.effects';

describe('BirthdayCalendarSyncEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayCalendarSyncEffects;
  let store: MockStore;
  let calendarIntegrationMock: MockedObject<CalendarIntegrationService>;
  let offlineStorageMock: MockedObject<IndexedDBStorageService>;
  let notificationMock: MockedObject<NotificationService>;

  const mockBirthday: Birthday = {
    id: 'b1',
    name: 'Jane Doe',
    birthDate: '1990-06-15',
    category: 'friends',
    zodiacSign: 'Gemini'
  };

  const birthdayWithEvent: Birthday = {
    ...mockBirthday,
    googleCalendarEventId: 'cal-event-99'
  };

  const initialState = {
    birthdays: {
      ids: [],
      entities: {},
      filters: { searchTerm: '', selectedCategory: null },
      loading: false,
      error: null,
      optimisticBackup: []
    }
  };

  beforeEach(() => {
    calendarIntegrationMock = {
      syncToCalendar: vi.fn().mockName('CalendarIntegrationService.syncToCalendar'),
      updateInCalendar: vi.fn().mockName('CalendarIntegrationService.updateInCalendar'),
      deleteFromCalendar: vi.fn().mockName('CalendarIntegrationService.deleteFromCalendar')
    } as unknown as MockedObject<CalendarIntegrationService>;
    offlineStorageMock = {
      updateBirthday: vi.fn().mockName('IndexedDBStorageService.updateBirthday')
    } as unknown as MockedObject<IndexedDBStorageService>;
    notificationMock = {
      show: vi.fn().mockName('NotificationService.show')
    } as unknown as MockedObject<NotificationService>;

    calendarIntegrationMock.syncToCalendar.mockReturnValue(Promise.resolve(null));
    calendarIntegrationMock.updateInCalendar.mockReturnValue(Promise.resolve());
    calendarIntegrationMock.deleteFromCalendar.mockReturnValue(Promise.resolve());
    offlineStorageMock.updateBirthday.mockReturnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        BirthdayCalendarSyncEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState }),
        { provide: CalendarIntegrationService, useValue: calendarIntegrationMock },
        { provide: IndexedDBStorageService, useValue: offlineStorageMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    });

    effects = TestBed.inject(BirthdayCalendarSyncEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('syncToCalendar$', () => {
    it('should dispatch calendarEventIdSet and update IndexedDB when event ID is returned', async () => {
      calendarIntegrationMock.syncToCalendar.mockReturnValue(Promise.resolve('event-123'));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.syncToCalendar$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.calendarEventIdSet({ id: 'b1', calendarEventId: 'event-123' }));
        expect(offlineStorageMock.updateBirthday).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1', googleCalendarEventId: 'event-123' }));
      });
    });

    it('should emit nothing when calendar sync returns null (not enabled)', async () => {
      calendarIntegrationMock.syncToCalendar.mockReturnValue(Promise.resolve(null));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      let emitted = false;
      effects.syncToCalendar$.subscribe(() => { emitted = true; });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(emitted).toBe(false);
      expect(offlineStorageMock.updateBirthday).not.toHaveBeenCalled();
    });

    it('should dispatch calendarSyncFailed when IndexedDB update fails', async () => {
      calendarIntegrationMock.syncToCalendar.mockReturnValue(Promise.resolve('event-x'));
      offlineStorageMock.updateBirthday.mockRejectedValue(new Error('DB error'));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.syncToCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'add', error: 'DB error', isAuthError: false }));
        },
        error: () => expect.unreachable('should not error')
      });
    });

    it('should dispatch calendarSyncFailed when syncToCalendar throws', async () => {
      calendarIntegrationMock.syncToCalendar.mockRejectedValue(new Error('Network error'));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.syncToCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'add', error: 'Network error', isAuthError: false }));
        },
        error: () => expect.unreachable('should not error')
      });
    });
  });

  describe('updateInCalendar$', () => {
    it('should call updateInCalendar when updateBirthday is dispatched', async () => {
      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      effects.updateInCalendar$.subscribe();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(calendarIntegrationMock.updateInCalendar).toHaveBeenCalledWith(birthdayWithEvent);
    });

    it('should not emit on success', async () => {
      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      let emitted = false;
      effects.updateInCalendar$.subscribe(() => { emitted = true; });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(emitted).toBe(false);
    });

    it('should dispatch calendarSyncFailed when updateInCalendar fails', async () => {
      calendarIntegrationMock.updateInCalendar.mockRejectedValue(new Error('Calendar error'));

      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      effects.updateInCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'update', error: 'Calendar error', isAuthError: false }));
        },
        error: () => expect.unreachable('should not error')
      });
    });
  });

  describe('deleteFromCalendar$', () => {
    it('should call deleteFromCalendar when birthday has a calendarEventId in optimisticBackup', async () => {
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: [{ operationId: 'b1', entityId: 'b1', snapshot: birthdayWithEvent }]
        }
      });

      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      effects.deleteFromCalendar$.subscribe();

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(calendarIntegrationMock.deleteFromCalendar).toHaveBeenCalledWith('cal-event-99');
    });

    it('should not call deleteFromCalendar when birthday has no calendarEventId', async () => {
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: [{ operationId: 'b1', entityId: 'b1', snapshot: mockBirthday }]
        }
      });

      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      let emitted = false;
      effects.deleteFromCalendar$.subscribe(() => { emitted = true; });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(emitted).toBe(false);
      expect(calendarIntegrationMock.deleteFromCalendar).not.toHaveBeenCalled();
    });

    it('should not call deleteFromCalendar when birthday is not in optimisticBackup', async () => {
      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      let emitted = false;
      effects.deleteFromCalendar$.subscribe(() => { emitted = true; });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(emitted).toBe(false);
      expect(calendarIntegrationMock.deleteFromCalendar).not.toHaveBeenCalled();
    });

    it('should dispatch calendarSyncFailed when deleteFromCalendar fails', async () => {
      calendarIntegrationMock.deleteFromCalendar.mockRejectedValue(new Error('Delete error'));
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: [{ operationId: 'b1', entityId: 'b1', snapshot: birthdayWithEvent }]
        }
      });

      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      effects.deleteFromCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'delete', error: 'Delete error', isAuthError: false }));
        },
        error: () => expect.unreachable('should not error')
      });
    });
  });

  describe('notifyCalendarSyncFailed$', () => {
    it('should show a warning notification for operation "add"', async () => {
      actions$ = of(BirthdayActions.calendarSyncFailed({ operation: 'add', error: 'err', isAuthError: false }));

      effects.notifyCalendarSyncFailed$.subscribe(() => {
        expect(notificationMock.show).toHaveBeenCalledWith('Google Calendar event could not be created. Birthday saved locally.', 'warning');
      });
    });

    it('should show a warning notification for operation "update"', async () => {
      actions$ = of(BirthdayActions.calendarSyncFailed({ operation: 'update', error: 'err', isAuthError: false }));

      effects.notifyCalendarSyncFailed$.subscribe(() => {
        expect(notificationMock.show).toHaveBeenCalledWith('Google Calendar event could not be updated. Changes saved locally.', 'warning');
      });
    });

    it('should show a warning notification for operation "delete"', async () => {
      actions$ = of(BirthdayActions.calendarSyncFailed({ operation: 'delete', error: 'err', isAuthError: false }));

      effects.notifyCalendarSyncFailed$.subscribe(() => {
        expect(notificationMock.show).toHaveBeenCalledWith('Google Calendar event could not be deleted.', 'warning');
      });
    });

    it('should show a distinct reconnect notification when the failure is an auth error, regardless of operation', async () => {
      actions$ = of(BirthdayActions.calendarSyncFailed({ operation: 'update', error: 'Authentication expired. Please sign in again.', isAuthError: true }));

      effects.notifyCalendarSyncFailed$.subscribe(() => {
        expect(notificationMock.show).toHaveBeenCalledWith('Google Calendar connection expired. Reconnect in Settings to resume syncing.', 'error', 8000);
      });
    });
  });

  describe('isAuthError classification', () => {
    it('dispatches isAuthError: true when the thrown error carries a 401 googleApiDetails code', async () => {
      const authError = Object.assign(new Error('Authentication expired. Please sign in again.'), {
        googleApiDetails: { code: 401 }
      });
      calendarIntegrationMock.updateInCalendar.mockRejectedValue(authError);

      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      effects.updateInCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({
            operation: 'update',
            error: 'Authentication expired. Please sign in again.',
            isAuthError: true
          }));
        },
        error: () => expect.unreachable('should not error')
      });
    });

    it('dispatches isAuthError: false for a non-auth error even if it happens to carry a googleApiDetails code', async () => {
      const rateLimitError = Object.assign(new Error('Too many requests.'), {
        googleApiDetails: { code: 429 }
      });
      calendarIntegrationMock.updateInCalendar.mockRejectedValue(rateLimitError);

      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      effects.updateInCalendar$.subscribe({
        next: action => {
          expect(action.isAuthError).toBe(false);
        },
        error: () => expect.unreachable('should not error')
      });
    });
  });
});
