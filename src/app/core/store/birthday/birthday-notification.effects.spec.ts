import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { type Observable, of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { type NotificationAction, NotificationService } from '../../services/notification.service';
import * as BirthdayActions from './birthday.actions';
import { BirthdayNotificationEffects } from './birthday-notification.effects';

describe('BirthdayNotificationEffects', () => {
  let actions$: Observable<Action>;
  let effects: BirthdayNotificationEffects;
  let notificationServiceMock: MockedObject<NotificationService>;
  let store: MockStore;

  const mockBirthday = createMockBirthday({ id: '1', name: 'John Doe', category: 'Family' });

  beforeEach(() => {
    notificationServiceMock = {
      show: vi.fn().mockName('NotificationService.show')
    } as unknown as MockedObject<NotificationService>;

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
    it('should show success notification', async () => {
      actions$ = of(BirthdayActions.addBirthdaySuccess({ birthday: mockBirthday }));

      effects.addBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('John Doe added successfully!', 'success');
      });
    });
  });

  describe('updateBirthdaySuccess$', () => {
    it('should show success notification', async () => {
      actions$ = of(BirthdayActions.updateBirthdaySuccess({ birthday: mockBirthday, operationId: 'op-x' }));

      effects.updateBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('John Doe updated successfully!', 'success');
      });
    });
  });

  describe('deleteBirthdaySuccess$', () => {
    it('should show success notification with UNDO action', async () => {
      actions$ = of(BirthdayActions.deleteBirthdaySuccess({ id: '1', birthday: mockBirthday }));

      effects.deleteBirthdaySuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Birthday deleted successfully!', 'success', 5000, { label: 'UNDO', callback: expect.any(Function) });
      });
    });
  });

  describe('addBirthdayFailure$', () => {
    it('should show error notification without retry when no birthday', async () => {
      actions$ = of(BirthdayActions.addBirthdayFailure({ error: 'Save failed' }));

      effects.addBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to save birthday: Save failed', 'error', undefined, undefined);
      });
    });

    it('should show error notification with retry action when birthday is provided', async () => {
      actions$ = of(BirthdayActions.addBirthdayFailure({ error: 'Save failed', birthday: mockBirthday }));

      effects.addBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to save birthday: Save failed', 'error', undefined, expect.objectContaining({ label: 'Retry' }));
      });
    });

    it('should dispatch addBirthday when retry callback is invoked', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.addBirthdayFailure({ error: 'Save failed', birthday: mockBirthday }));

      notificationServiceMock.show.mockImplementation((_msg: string, _type?: 'success' | 'error' | 'warning' | 'info', _dur?: number, action?: NotificationAction) => {
        if (action?.callback) {
          action.callback();
        }
      });

      effects.addBirthdayFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.addBirthday({ birthday: mockBirthday }));
      });
    });
  });

  describe('updateBirthdayFailure$', () => {
    it('should show error notification without retry when no birthday', async () => {
      actions$ = of(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-x' }));

      effects.updateBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to update birthday: Update failed', 'error', undefined, undefined);
      });
    });

    it('should show error notification with retry action when birthday is provided', async () => {
      actions$ = of(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-x', birthday: mockBirthday }));

      effects.updateBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to update birthday: Update failed', 'error', undefined, expect.objectContaining({ label: 'Retry' }));
      });
    });

    it('should dispatch updateBirthday when retry callback is invoked', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.updateBirthdayFailure({ error: 'Update failed', operationId: 'op-x', birthday: mockBirthday }));

      notificationServiceMock.show.mockImplementation((_msg: string, _type?: 'success' | 'error' | 'warning' | 'info', _dur?: number, action?: NotificationAction) => {
        if (action?.callback) {
          action.callback();
        }
      });

      effects.updateBirthdayFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ birthday: mockBirthday }));
      });
    });
  });

  describe('deleteBirthdayFailure$', () => {
    it('should show error notification without retry when no id', async () => {
      actions$ = of(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed' }));

      effects.deleteBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to delete birthday: Delete failed', 'error', undefined, undefined);
      });
    });

    it('should show error notification with retry action when id is provided', async () => {
      actions$ = of(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed', id: '1' }));

      effects.deleteBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to delete birthday: Delete failed', 'error', undefined, expect.objectContaining({ label: 'Retry' }));
      });
    });

    it('should dispatch deleteBirthday when retry callback is invoked', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.deleteBirthdayFailure({ error: 'Delete failed', id: '1' }));

      notificationServiceMock.show.mockImplementation((_msg: string, _type?: 'success' | 'error' | 'warning' | 'info', _dur?: number, action?: NotificationAction) => {
        if (action?.callback) {
          action.callback();
        }
      });

      effects.deleteBirthdayFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.deleteBirthday({ id: '1' }));
      });
    });
  });

  describe('addMessageToBirthdayFailure$', () => {
    it('should show error notification', async () => {
      actions$ = of(BirthdayActions.addMessageToBirthdayFailure({ error: 'Failed' }));

      effects.addMessageToBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to add message: Failed', 'error');
      });
    });
  });

  describe('updateMessageInBirthdayFailure$', () => {
    it('should show error notification', async () => {
      actions$ = of(BirthdayActions.updateMessageInBirthdayFailure({ error: 'Failed' }));

      effects.updateMessageInBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to update message: Failed', 'error');
      });
    });
  });

  describe('deleteMessageFromBirthdayFailure$', () => {
    it('should show error notification', async () => {
      actions$ = of(BirthdayActions.deleteMessageFromBirthdayFailure({ error: 'Failed' }));

      effects.deleteMessageFromBirthdayFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to delete message: Failed', 'error');
      });
    });
  });

  describe('loadBirthdaysFailure$', () => {
    it('should show error notification with retry action', async () => {
      actions$ = of(BirthdayActions.loadBirthdaysFailure({ error: 'Load failed' }));

      effects.loadBirthdaysFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to load birthdays', 'error', undefined, expect.objectContaining({ label: 'Retry' }));
      });
    });

    it('should dispatch loadBirthdays when retry callback is invoked', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.loadBirthdaysFailure({ error: 'Load failed' }));

      notificationServiceMock.show.mockImplementation((_msg: string, _type?: 'success' | 'error' | 'warning' | 'info', _dur?: number, action?: NotificationAction) => {
        if (action?.callback) {
          action.callback();
        }
      });

      effects.loadBirthdaysFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.loadBirthdays());
      });
    });
  });

  describe('clearAllBirthdaysFailure$', () => {
    it('should show error notification with retry action', async () => {
      actions$ = of(BirthdayActions.clearAllBirthdaysFailure({ error: 'Clear failed' }));

      effects.clearAllBirthdaysFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to clear all birthdays', 'error', undefined, expect.objectContaining({ label: 'Retry' }));
      });
    });

    it('should dispatch clearAllBirthdays when retry callback is invoked', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.clearAllBirthdaysFailure({ error: 'Clear failed' }));

      notificationServiceMock.show.mockImplementation((_msg: string, _type?: 'success' | 'error' | 'warning' | 'info', _dur?: number, action?: NotificationAction) => {
        if (action?.callback) {
          action.callback();
        }
      });

      effects.clearAllBirthdaysFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.clearAllBirthdays());
      });
    });
  });

  describe('loadTestDataFailure$', () => {
    it('should show error notification with retry action', async () => {
      actions$ = of(BirthdayActions.loadTestDataFailure({ error: 'Test data failed' }));

      effects.loadTestDataFailure$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Failed to load test data', 'error', undefined, expect.objectContaining({ label: 'Retry' }));
      });
    });

    it('should dispatch loadTestData when retry callback is invoked', async () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      actions$ = of(BirthdayActions.loadTestDataFailure({ error: 'Test data failed' }));

      notificationServiceMock.show.mockImplementation((_msg: string, _type?: 'success' | 'error' | 'warning' | 'info', _dur?: number, action?: NotificationAction) => {
        if (action?.callback) {
          action.callback();
        }
      });

      effects.loadTestDataFailure$.subscribe(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.loadTestData());
      });
    });
  });

  describe('loadTestDataSuccess$', () => {
    it('should show success notification for test data', async () => {
      const birthdays = [mockBirthday];
      actions$ = of(BirthdayActions.loadTestDataSuccess({ birthdays }));

      effects.loadTestDataSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Imported 1 birthdays', 'success');
      });
    });

    it('should show correct plural form', async () => {
      const birthdays = [mockBirthday, { ...mockBirthday, id: '2' }];
      actions$ = of(BirthdayActions.loadTestDataSuccess({ birthdays }));

      effects.loadTestDataSuccess$.subscribe(() => {
        expect(notificationServiceMock.show).toHaveBeenCalledWith('Imported 2 birthdays', 'success');
      });
    });
  });
});
