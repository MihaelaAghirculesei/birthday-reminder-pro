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
    it('should show success notification', (done) => {
      actions$ = of(BirthdayActions.deleteBirthdaySuccess({ id: '1' }));

      effects.deleteBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Birthday deleted successfully!', 'success');
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
