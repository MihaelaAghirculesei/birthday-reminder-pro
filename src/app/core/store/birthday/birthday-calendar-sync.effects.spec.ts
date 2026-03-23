import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { BirthdayCalendarSyncEffects } from './birthday-calendar-sync.effects';
import * as BirthdayActions from './birthday.actions';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { Birthday } from '../../../shared/models/birthday.model';

describe('BirthdayCalendarSyncEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayCalendarSyncEffects;
  let store: MockStore;
  let calendarIntegrationMock: jasmine.SpyObj<CalendarIntegrationService>;
  let offlineStorageMock: jasmine.SpyObj<IndexedDBStorageService>;

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
      optimisticBackup: {}
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
        { provide: IndexedDBStorageService, useValue: offlineStorageMock }
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

    it('should swallow errors without crashing the stream', (done) => {
      calendarIntegrationMock.syncToCalendar.and.returnValue(Promise.resolve('event-x'));
      offlineStorageMock.updateBirthday.and.returnValue(Promise.reject(new Error('DB error')));

      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      let emitted = false;
      effects.syncToCalendar$.subscribe({ next: () => { emitted = true; }, error: () => fail('should not error') });

      setTimeout(() => {
        expect(emitted).toBeFalse();
        done();
      }, 50);
    });
  });

  describe('updateInCalendar$', () => {
    it('should call updateInCalendar when updateBirthday is dispatched', (done) => {
      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent }));

      effects.updateInCalendar$.subscribe(() => {
        expect(calendarIntegrationMock.updateInCalendar).toHaveBeenCalledWith(birthdayWithEvent);
        done();
      });
    });

    it('should not throw when updateInCalendar fails', (done) => {
      calendarIntegrationMock.updateInCalendar.and.returnValue(Promise.reject(new Error('Calendar error')));

      actions$ = of(BirthdayActions.updateBirthday({ birthday: birthdayWithEvent }));

      let threw = false;
      effects.updateInCalendar$.subscribe({ error: () => { threw = true; } });

      setTimeout(() => {
        expect(threw).toBeFalse();
        done();
      }, 50);
    });
  });

  describe('deleteFromCalendar$', () => {
    it('should call deleteFromCalendar when birthday has a calendarEventId in optimisticBackup', (done) => {
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: { 'b1': birthdayWithEvent }
        }
      });

      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      effects.deleteFromCalendar$.subscribe(() => {
        expect(calendarIntegrationMock.deleteFromCalendar).toHaveBeenCalledWith('cal-event-99');
        done();
      });
    });

    it('should not call deleteFromCalendar when birthday has no calendarEventId', (done) => {
      store.setState({
        birthdays: {
          ...initialState.birthdays,
          optimisticBackup: { 'b1': mockBirthday } // no googleCalendarEventId
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
      // optimisticBackup is empty (default initialState)
      actions$ = of(BirthdayActions.deleteBirthday({ id: 'b1' }));

      let emitted = false;
      effects.deleteFromCalendar$.subscribe(() => { emitted = true; });

      setTimeout(() => {
        expect(emitted).toBeFalse();
        expect(calendarIntegrationMock.deleteFromCalendar).not.toHaveBeenCalled();
        done();
      }, 50);
    });
  });
});
