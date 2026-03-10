import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, OnInitEffects } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { of, from } from 'rxjs';
import { catchError, map, mergeMap, tap, switchMap, withLatestFrom } from 'rxjs/operators';
import * as BirthdayActions from './birthday.actions';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { BirthdayService } from '../../services/birthday.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { Birthday, updateSyncMetadata } from '../../../shared/models/birthday.model';
import * as AuthSelectors from '../auth/auth.selectors';

@Injectable()
export class BirthdayEffects implements OnInitEffects {

  ngrxOnInitEffects(): Action {
    return BirthdayActions.loadBirthdays();
  }
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly notificationService = inject(NotificationService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly birthdayService = inject(BirthdayService);
  private readonly syncCoordinator = inject(SyncCoordinatorService);

  loadBirthdays$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.loadBirthdays),
      mergeMap(() =>
        this.offlineStorage.getBirthdays().then(birthdays => {
          return birthdays.map(b => this.birthdayService.normalizeBirthdayOnLoad(b));
        }).then(birthdays =>
          BirthdayActions.loadBirthdaysSuccess({ birthdays })
        ).catch(error =>
          BirthdayActions.loadBirthdaysFailure({ error: error.message })
        )
      )
    )
  );

  addBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.addBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthday }, userId]) => {
        const newBirthday = this.birthdayService.prepareBirthdayForCreate(birthday, userId);

        return this.birthdayService.syncToGoogleCalendar(newBirthday).then(eventId => {
          if (eventId) {
            newBirthday.googleCalendarEventId = eventId;
          }
          return newBirthday;
        }).then(finalBirthday =>
          this.offlineStorage.addBirthday(finalBirthday).then(() => finalBirthday)
        ).then(async finalBirthday => {
          if (userId) {
            await this.syncCoordinator.queueChange('birthday', finalBirthday.id, 'create', finalBirthday);
          }
          return finalBirthday;
        }).then(finalBirthday =>
          BirthdayActions.addBirthdaySuccess({ birthday: finalBirthday })
        ).catch(error =>
          BirthdayActions.addBirthdayFailure({ error: error.message })
        );
      })
    )
  );

  addBirthdaySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.addBirthdaySuccess),
        tap(({ birthday }) => {
          this.notificationService.show(`${birthday.name} added successfully!`, 'success');
        })
      ),
    { dispatch: false }
  );

  updateBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.updateBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthday }, userId]) => {
        const normalizedBirthday = this.birthdayService.prepareBirthdayForUpdate(birthday, userId);

        return this.birthdayService.updateGoogleCalendar(normalizedBirthday).then(() =>
          this.offlineStorage.updateBirthday(normalizedBirthday)
        ).then(async () => {
          if (userId) {
            await this.syncCoordinator.queueChange('birthday', normalizedBirthday.id, 'update', normalizedBirthday);
          }
          return normalizedBirthday;
        }).then(() =>
          BirthdayActions.updateBirthdaySuccess({ birthday: normalizedBirthday })
        ).catch(error =>
          BirthdayActions.updateBirthdayFailure({ error: error.message, id: normalizedBirthday.id })
        );
      })
    )
  );

  updateBirthdaySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.updateBirthdaySuccess),
        tap(({ birthday }) => {
          this.notificationService.show(`${birthday.name} updated successfully!`, 'success');
        })
      ),
    { dispatch: false }
  );

  deleteBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.deleteBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ id }, userId]) =>
        this.offlineStorage.getBirthdays().then(birthdays => {
          const birthday = birthdays.find(b => b.id === id);
          return birthday;
        }).then(birthday => {
          this.pushNotificationService.cancelAllNotificationsForBirthday(id);
          if (birthday?.googleCalendarEventId) {
            return this.birthdayService.deleteFromGoogleCalendar(birthday.googleCalendarEventId).then(() => id);
          }
          return id;
        }).then(birthdayId =>
          this.offlineStorage.deleteBirthday(birthdayId)
        ).then(async () => {
          if (userId) {
            await this.syncCoordinator.queueChange('birthday', id, 'delete', { id });
          }
          return id;
        }).then(() =>
          BirthdayActions.deleteBirthdaySuccess({ id })
        ).catch(error =>
          BirthdayActions.deleteBirthdayFailure({ error: error.message, id })
        )
      )
    )
  );

  deleteBirthdaySuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.deleteBirthdaySuccess),
        tap(() => {
          this.notificationService.show('Birthday deleted successfully!', 'success');
        })
      ),
    { dispatch: false }
  );

  clearAllBirthdays$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.clearAllBirthdays),
      mergeMap(() =>
        this.offlineStorage.clear().then(() =>
          BirthdayActions.clearAllBirthdaysSuccess()
        ).catch(error =>
          BirthdayActions.clearAllBirthdaysFailure({ error: error.message })
        )
      )
    )
  );

  addMessageToBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.addMessageToBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthdayId, message }, userId]) =>
        this.offlineStorage.saveScheduledMessage(message).then(() =>
          this.offlineStorage.getBirthdays()
        ).then(birthdays => {
          const birthday = birthdays.find(b => b.id === birthdayId);
          if (birthday) {
            const syncMeta = updateSyncMetadata(birthday, userId);
            const updatedBirthday: Birthday = {
              ...birthday,
              ...syncMeta,
              scheduledMessages: [...(birthday.scheduledMessages || []), message]
            };
            this.pushNotificationService.scheduleNotification(birthday, message);

            if (userId) {
              this.syncCoordinator.queueChange('birthday', birthdayId, 'update', updatedBirthday);
            }

            return this.offlineStorage.updateBirthday(updatedBirthday);
          }
          return Promise.resolve();
        }).then(() =>
          BirthdayActions.addMessageToBirthdaySuccess({ birthdayId, message })
        ).catch(error =>
          BirthdayActions.addMessageToBirthdayFailure({ error: error.message || 'Failed to add message' })
        )
      )
    )
  );

  updateMessageInBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.updateMessageInBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthdayId, messageId, updates }, userId]) =>
        this.offlineStorage.getScheduledMessagesByBirthday(birthdayId).then(messages => {
          const message = messages.find(m => m.id === messageId);
          if (message) {
            const updatedMessage = { ...message, ...updates };
            return this.offlineStorage.updateScheduledMessage(updatedMessage);
          }
          return Promise.resolve();
        }).then(() =>
          this.offlineStorage.getBirthdays()
        ).then(birthdays => {
          const birthday = birthdays.find(b => b.id === birthdayId);
          if (birthday?.scheduledMessages) {
            const syncMeta = updateSyncMetadata(birthday, userId);
            const updatedMessages = birthday.scheduledMessages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            );
            const updatedBirthday: Birthday = {
              ...birthday,
              ...syncMeta,
              scheduledMessages: updatedMessages
            };

            const updatedMsg = updatedMessages.find(m => m.id === messageId);
            if (updatedMsg) {
              this.pushNotificationService.scheduleNotification(birthday, updatedMsg);
            }

            if (userId) {
              this.syncCoordinator.queueChange('birthday', birthdayId, 'update', updatedBirthday);
            }

            return this.offlineStorage.updateBirthday(updatedBirthday);
          }
          return Promise.resolve();
        }).then(() =>
          BirthdayActions.updateMessageInBirthdaySuccess({ birthdayId, messageId, updates })
        ).catch(error =>
          BirthdayActions.updateMessageInBirthdayFailure({ error: error.message || 'Failed to update message' })
        )
      )
    )
  );

  deleteMessageFromBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.deleteMessageFromBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthdayId, messageId }, userId]) =>
        this.offlineStorage.deleteScheduledMessage(messageId).then(() => {
          this.pushNotificationService.cancelNotification(birthdayId, messageId);
          return this.offlineStorage.getBirthdays();
        }).then(birthdays => {
          const birthday = birthdays.find(b => b.id === birthdayId);
          if (birthday?.scheduledMessages) {
            const syncMeta = updateSyncMetadata(birthday, userId);
            const updatedMessages = birthday.scheduledMessages.filter(msg => msg.id !== messageId);
            const updatedBirthday: Birthday = {
              ...birthday,
              ...syncMeta,
              scheduledMessages: updatedMessages
            };

            if (userId) {
              this.syncCoordinator.queueChange('birthday', birthdayId, 'update', updatedBirthday);
            }

            return this.offlineStorage.updateBirthday(updatedBirthday);
          }
          return Promise.resolve();
        }).then(() =>
          BirthdayActions.deleteMessageFromBirthdaySuccess({ birthdayId, messageId })
        ).catch(error =>
          BirthdayActions.deleteMessageFromBirthdayFailure({ error: error.message || 'Failed to delete message' })
        )
      )
    )
  );

  addMessageToBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.addMessageToBirthdayFailure),
        tap(({ error }) => {
          this.notificationService.show(`Failed to add message: ${error}`, 'error');
        })
      ),
    { dispatch: false }
  );

  updateMessageInBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.updateMessageInBirthdayFailure),
        tap(({ error }) => {
          this.notificationService.show(`Failed to update message: ${error}`, 'error');
        })
      ),
    { dispatch: false }
  );

  deleteMessageFromBirthdayFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.deleteMessageFromBirthdayFailure),
        tap(({ error }) => {
          this.notificationService.show(`Failed to delete message: ${error}`, 'error');
        })
      ),
    { dispatch: false }
  );

  loadTestData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.loadTestData),
      switchMap(() =>
        from(import('../../../testing').then(m => m.generateMockBirthdays)).pipe(
          switchMap(generateMockBirthdays => {
            const testBirthdays = generateMockBirthdays(() => this.birthdayService.generateId());
            const processedBirthdays: Birthday[] = this.birthdayService.processTestBirthdays(testBirthdays);
            return from(this.offlineStorage.saveBirthdays(processedBirthdays)).pipe(
              map(() => BirthdayActions.loadTestDataSuccess({ birthdays: processedBirthdays }))
            );
          }),
          catchError(error => of(BirthdayActions.loadTestDataFailure({ error: error.message })))
        )
      )
    )
  );

  loadTestDataSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(BirthdayActions.loadTestDataSuccess),
        tap(({ birthdays }) => {
          this.notificationService.show(`${birthdays.length} test birthdays loaded successfully!`, 'success');
        })
      ),
    { dispatch: false }
  );
}
