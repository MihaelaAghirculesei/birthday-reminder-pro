import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { BirthdayNotificationEffects } from './birthday-notification.effects';
import * as BirthdayActions from './birthday.actions';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { NotificationService, NotificationAction } from '../../services/notification.service';
import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';

describe('BirthdayNotificationEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayNotificationEffects;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let store: MockStore;

  const mockBirthday = createMockBirthday({ id: '1', name: 'John Doe', category: 'Family' });

  beforeEach(() => {
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['show']);

    TestBed.configureTestingModule({
      providers: [
        BirthdayNotificationEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: NotificationService, useValue: notificationServiceMock },
        provideTranslateTesting()
      ]
    });

    effects = TestBed.inject(BirthdayNotificationEffects);
    store = TestBed.inject(MockStore);
  });

  describe('addBirthdaySuccess$', () => {
    it('should show success notification', (done) => {
      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.addBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('John Doe added successfully!', 'success');
        done();
      });
    });
  });

  describe('updateBirthdaySuccess$', () => {
    it('should show success notification', (done) => {
      actions$ = of(BirthdayActions.updateBirthdaySuccess({ birthday: mockBirthday, operationId: 'op-x' }));

      effects.updateBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('John Doe updated successfully!', 'success');
        done();
      });
    });
  });

  describe('deleteBirthdaySuccess$', () => {
    it('should show success notification with UNDO action', (done) => {
      actions$ = of(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: mockBirthday }));

      effects.deleteBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Birthday deleted successfully!',
          'success',
          5000,
          { label: 'UNDO', callback: jasmine.any(Function) }
        );
        done();
      });
    });
  });

  describe('addBirthdayFailure$', () => {
    it('should show error notification without retry when no birthday', (done) => {
      actions$ = of(BirthdayActions.addBirthdayFailure({ error: 'Save failed' }));

      effects.addBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to save birthday: Save failed',
          'error',
          undefined,
          undefined
        );
        done();
      });
    });

    it('should show error notification with retry action when birthday is provided', (done) => {
      actions$ = of(BirthdayActions.addBirthdayFailure({ error: 'Save failed', birthday: mockBirthday }));

      effects.addBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to save birthday: Save failed',
          'error',
          undefined,
          jasmine.objectContaining({ label: 'Retry' })
        );
        done();
      });
    });

    it('should dispatch addBirthday when retry callback is invoked', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.addBirthdayFailure({ error: 'Save failed', birthday: mockBirthday }));

      notificationServiceMock.show.and.callFake((_msg: string, _type: 'success' | 'error' | 'warning' | 'info', _dur: number | undefined, action: NotificationAction | undefined) => {
        if (action?.callback) { action.callback(); }
      });

      effects.addBirthdayFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.addBirthday({ birthday: mockBirthday }));
        done();
      });
    });
  });

  describe('updateBirthdayFailure$', () => {
    it('should show error notification without retry when no birthday', (done) => {
      actions$ = of(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-x' }));

      effects.updateBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to update birthday: Update failed',
          'error',
          undefined,
          undefined
        );
        done();
      });
    });

    it('should show error notification with retry action when birthday is provided', (done) => {
      actions$ = of(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-x', birthday: mockBirthday }));

      effects.updateBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to update birthday: Update failed',
          'error',
          undefined,
          jasmine.objectContaining({ label: 'Retry' })
        );
        done();
      });
    });

    it('should dispatch updateBirthday when retry callback is invoked', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-x', birthday: mockBirthday }));

      notificationServiceMock.show.and.callFake((_msg: string, _type: 'success' | 'error' | 'warning' | 'info', _dur: number | undefined, action: NotificationAction | undefined) => {
        if (action?.callback) { action.callback(); }
      });

      effects.updateBirthdayFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          jasmine.objectContaining({ birthday: mockBirthday })
        );
        done();
      });
    });
  });

  describe('deleteBirthdayFailure$', () => {
    it('should show error notification without retry when no id', (done) => {
      actions$ = of(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed' }));

      effects.deleteBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to delete birthday: Delete failed',
          'error',
          undefined,
          undefined
        );
        done();
      });
    });

    it('should show error notification with retry action when id is provided', (done) => {
      actions$ = of(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed', id: '1' }));

      effects.deleteBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to delete birthday: Delete failed',
          'error',
          undefined,
          jasmine.objectContaining({ label: 'Retry' })
        );
        done();
      });
    });

    it('should dispatch deleteBirthday when retry callback is invoked', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed', id: '1' }));

      notificationServiceMock.show.and.callFake((_msg: string, _type: 'success' | 'error' | 'warning' | 'info', _dur: number | undefined, action: NotificationAction | undefined) => {
        if (action?.callback) { action.callback(); }
      });

      effects.deleteBirthdayFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.deleteBirthday({ id: '1' }));
        done();
      });
    });
  });

  describe('addMessageToBirthdayFailure$', () => {
    it('should show error notification', (done) => {
      actions$ = of(BirthdayActions.addMessageToBirthdayFailure({ error: 'Failed' }));

      effects.addMessageToBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to add message: Failed', 'error');
        done();
      });
    });
  });

  describe('updateMessageInBirthdayFailure$', () => {
    it('should show error notification', (done) => {
      actions$ = of(BirthdayActions.updateMessageInBirthdayFailure({ error: 'Failed' }));

      effects.updateMessageInBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to update message: Failed', 'error');
        done();
      });
    });
  });

  describe('deleteMessageFromBirthdayFailure$', () => {
    it('should show error notification', (done) => {
      actions$ = of(BirthdayActions.deleteMessageFromBirthdayFailure({ error: 'Failed' }));

      effects.deleteMessageFromBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to delete message: Failed', 'error');
        done();
      });
    });
  });

  describe('loadBirthdaysFailure$', () => {
    it('should show error notification with retry action', (done) => {
      actions$ = of(BirthdayActions.loadBirthdaysFailure({ error: 'Load failed' }));

      effects.loadBirthdaysFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to load birthdays',
          'error',
          undefined,
          jasmine.objectContaining({ label: 'Retry' })
        );
        done();
      });
    });

    it('should dispatch loadBirthdays when retry callback is invoked', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.loadBirthdaysFailure({ error: 'Load failed' }));

      notificationServiceMock.show.and.callFake((_msg: string, _type: 'success' | 'error' | 'warning' | 'info', _dur: number | undefined, action: NotificationAction | undefined) => {
        if (action?.callback) { action.callback(); }
      });

      effects.loadBirthdaysFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.loadBirthdays());
        done();
      });
    });
  });

  describe('clearAllBirthdaysFailure$', () => {
    it('should show error notification with retry action', (done) => {
      actions$ = of(BirthdayActions.clearAllBirthdaysFailure({ error: 'Clear failed' }));

      effects.clearAllBirthdaysFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to clear all birthdays',
          'error',
          undefined,
          jasmine.objectContaining({ label: 'Retry' })
        );
        done();
      });
    });

    it('should dispatch clearAllBirthdays when retry callback is invoked', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.clearAllBirthdaysFailure({ error: 'Clear failed' }));

      notificationServiceMock.show.and.callFake((_msg: string, _type: 'success' | 'error' | 'warning' | 'info', _dur: number | undefined, action: NotificationAction | undefined) => {
        if (action?.callback) { action.callback(); }
      });

      effects.clearAllBirthdaysFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.clearAllBirthdays());
        done();
      });
    });
  });

  describe('loadTestDataFailure$', () => {
    it('should show error notification with retry action', (done) => {
      actions$ = of(BirthdayActions.loadTestDataFailure({ error: 'Test data failed' }));

      effects.loadTestDataFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Failed to load test data',
          'error',
          undefined,
          jasmine.objectContaining({ label: 'Retry' })
        );
        done();
      });
    });

    it('should dispatch loadTestData when retry callback is invoked', (done) => {
      const dispatchSpy = spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.loadTestDataFailure({ error: 'Test data failed' }));

      notificationServiceMock.show.and.callFake((_msg: string, _type: 'success' | 'error' | 'warning' | 'info', _dur: number | undefined, action: NotificationAction | undefined) => {
        if (action?.callback) { action.callback(); }
      });

      effects.loadTestDataFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.loadTestData());
        done();
      });
    });
  });

  describe('loadTestDataSuccess$', () => {
    it('should show success notification for test data', (done) => {
      const birthdays = [mockBirthday];
      actions$ = of(BirthdayActions.loadTestDataSuccess({ birthdays }));

      effects.loadTestDataSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Imported 1 birthdays',
          'success'
        );
        done();
      });
    });

    it('should show correct plural form', (done) => {
      const birthdays = [mockBirthday, { ...mockBirthday, id: '2' }];
      actions$ = of(BirthdayActions.loadTestDataSuccess({ birthdays }));

      effects.loadTestDataSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith(
          'Imported 2 birthdays',
          'success'
        );
        done();
      });
    });
  });
});
