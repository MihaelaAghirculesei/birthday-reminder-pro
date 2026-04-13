import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { BirthdayCalendarSyncEffects } from './birthday-calendar-sync.effects';
import * as BirthdayActions from './birthday.actions';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';
import { Birthday } from '../../../shared/models/birthday.model';

describe('BirthdayCalendarSyncEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayCalendarSyncEffects;
  let store: MockStore;
  let calendarIntegrationMock: jasmine.SpyObj<CalendarIntegrationService>;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;
  let notificationMock: jasmine.SpyObj<NotificationService>;

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
    calendarIntegrationMock = jasmine.createSpyObj('CalendarIntegrationService', [
      'syncToCalendar',
      'updateInCalendar',
      'deleteFromCalendar'
    ]);
    offlineStorageMock = jasmine.createSpyObj('IndexedDBStorageService', [
      'updateBirthday'
    ]);
    notificationMock = jasmine.createSpyObj('NotificationService', ['show']);

    calendarIntegrationMock.syncToCalendar.and.returnValue(Promise.resolve(null));
    calendarIntegrationMock.updateInCalendar.and.returnValue(Promise.resolve());
    calendarIntegrationMock.deleteFromCalendar.and.returnValue(Promise.resolve());
    offlineStorageMock.updateBirthday.and.returnValue(Promise.resolve());

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
    it('should dispatch calendarEventIdSet and update IndexedDB when event ID is returned', (done) => {
      calendarIntegrationMock.syncToCalendar.and.returnValue(Promise.resolve('event-123'));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.syncToCalendar$.subscribe(action => {
        expect(action).toEqual(BirthdayActions.calendarEventIdSet({ id: 'b1', calendarEventId: 'event-123' }));
        expect(offlineStorageMock.updateBirthday).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'b1', googleCalendarEventId: 'event-123' })
        );
        done();
      });
    });

    it('should emit nothing when calendar sync returns null (not enabled)', (done) => {
      calendarIntegrationMock.syncToCalendar.and.returnValue(Promise.resolve(null));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      let emitted = false;
      effects.syncToCalendar$.subscribe(() => { emitted = true; });

      setTimeout(() => {
        expect(emitted).toBeFalse();
        expect(offlineStorageMock.updateBirthday).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should dispatch calendarSyncFailed when IndexedDB update fails', (done) => {
      calendarIntegrationMock.syncToCalendar.and.returnValue(Promise.resolve('event-x'));
      offlineStorageMock.updateBirthday.and.returnValue(Promise.reject(new Error('DB error')));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.syncToCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'add', error: 'DB error' }));
          done();
        },
        error: () => fail('should not error')
      });
    });

    it('should dispatch calendarSyncFailed when syncToCalendar throws', (done) => {
      calendarIntegrationMock.syncToCalendar.and.returnValue(Promise.reject(new Error('Network error')));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.syncToCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'add', error: 'Network error' }));
          done();
        },
        error: () => fail('should not error')
      });
    });
  });

  describe('updateInCalendar$', () => {
    it('should call updateInCalendar when updateBirthday is dispatched', (done) => {
      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      effects.updateInCalendar$.subscribe();

      setTimeout(() => {
        expect(calendarIntegrationMock.updateInCalendar).toHaveBeenCalledWith(birthdayWithEvent);
        done();
      }, 50);
    });

    it('should not emit on success', (done) => {
      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      let emitted = false;
      effects.updateInCalendar$.subscribe(() => { emitted = true; });

      setTimeout(() => {
        expect(emitted).toBeFalse();
        done();
      }, 50);
    });

    it('should dispatch calendarSyncFailed when updateInCalendar fails', (done) => {
      calendarIntegrationMock.updateInCalendar.and.returnValue(Promise.reject(new Error('Calendar error')));

      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent, operationId: 'op-cal-1' }));

      effects.updateInCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'update', error: 'Calendar error' }));
          done();
        },
        error: () => fail('should not error')
      });
    });
  });

  describe('deleteFromCalendar$', () => {
    it('should call deleteFromCalendar when birthday has a calendarEventId in optimisticBackup', (done) => {
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: [{ operationId: 'b1', entityId: 'b1', snapshot: birthdayWithEvent }]
        }
      });

      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      effects.deleteFromCalendar$.subscribe();

      setTimeout(() => {
        expect(calendarIntegrationMock.deleteFromCalendar).toHaveBeenCalledWith('cal-event-99');
        done();
      }, 50);
    });

    it('should not call deleteFromCalendar when birthday has no calendarEventId', (done) => {
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: [{ operationId: 'b1', entityId: 'b1', snapshot: mockBirthday }]
        }
      });

      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      let emitted = false;
      effects.deleteFromCalendar$.subscribe(() => { emitted = true; });

      setTimeout(() => {
        expect(emitted).toBeFalse();
        expect(calendarIntegrationMock.deleteFromCalendar).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should not call deleteFromCalendar when birthday is not in optimisticBackup', (done) => {
      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      let emitted = false;
      effects.deleteFromCalendar$.subscribe(() => { emitted = true; });

      setTimeout(() => {
        expect(emitted).toBeFalse();
        expect(calendarIntegrationMock.deleteFromCalendar).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should dispatch calendarSyncFailed when deleteFromCalendar fails', (done) => {
      calendarIntegrationMock.deleteFromCalendar.and.returnValue(Promise.reject(new Error('Delete error')));
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: [{ operationId: 'b1', entityId: 'b1', snapshot: birthdayWithEvent }]
        }
      });

      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      effects.deleteFromCalendar$.subscribe({
        next: action => {
          expect(action).toEqual(BirthdayActions.calendarSyncFailed({ operation: 'delete', error: 'Delete error' }));
          done();
        },
        error: () => fail('should not error')
      });
    });
  });

  describe('notifyCalendarSyncFailed$', () => {
    it('should show a warning notification for operation "add"', (done) => {
      actions$ = of(BirthdayActions.calendarSyncFailed({ operation: 'add', error: 'err' }));

      effects.notifyCalendarSyncFailed$.subscribe(() => {
        expect(notificationMock.show).toHaveBeenCalledWith(
          'Google Calendar event could not be created. Birthday saved locally.',
          'warning'
        );
        done();
      });
    });

    it('should show a warning notification for operation "update"', (done) => {
      actions$ = of(BirthdayActions.calendarSyncFailed({ operation: 'update', error: 'err' }));

      effects.notifyCalendarSyncFailed$.subscribe(() => {
        expect(notificationMock.show).toHaveBeenCalledWith(
          'Google Calendar event could not be updated. Changes saved locally.',
          'warning'
        );
        done();
      });
    });

    it('should show a warning notification for operation "delete"', (done) => {
      actions$ = of(BirthdayActions.calendarSyncFailed({ operation: 'delete', error: 'err' }));

      effects.notifyCalendarSyncFailed$.subscribe(() => {
        expect(notificationMock.show).toHaveBeenCalledWith(
          'Google Calendar event could not be deleted.',
          'warning'
        );
        done();
      });
    });
  });
});
