import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, from } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import * as BirthdayActions from './birthday.actions';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { SyncCoordinatorService } from '../../services/sync-coordinator.service';
import { Birthday, updateSyncMetadata } from '../../../shared/models/birthday.model';
import * as AuthSelectors from '../auth/auth.selectors';
import { selectBirthdayById } from './birthday.selectors';

@Injectable()
export class BirthdayMessageEffects {

  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly syncCoordinator = inject(SyncCoordinatorService);

  addMessageToBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.addMessageToBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthdayId, message }, userId]) =>
        from(this.offlineStorage.saveScheduledMessage(message)).pipe(
          withLatestFrom(this.store.select(selectBirthdayById(birthdayId))),
          switchMap(([, birthday]) => {
            if (!birthday) return of(undefined);

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

            return from(this.offlineStorage.updateBirthday(updatedBirthday));
          }),
          map(() => BirthdayActions.addMessageToBirthdaySuccess({ birthdayId, message })),
          catchError(error => of(BirthdayActions.addMessageToBirthdayFailure({ error: error.message || 'Failed to add message' })))
        )
      )
    )
  );

  updateMessageInBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.updateMessageInBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthdayId, messageId, updates }, userId]) =>
        from(this.offlineStorage.getScheduledMessagesByBirthday(birthdayId)).pipe(
          switchMap(messages => {
            const message = messages.find(m => m.id === messageId);
            if (message) {
              return from(this.offlineStorage.updateScheduledMessage({ ...message, ...updates }));
            }
            return of(undefined);
          }),
          withLatestFrom(this.store.select(selectBirthdayById(birthdayId))),
          switchMap(([, birthday]) => {
            if (!birthday?.scheduledMessages) return of(undefined);

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

            return from(this.offlineStorage.updateBirthday(updatedBirthday));
          }),
          map(() => BirthdayActions.updateMessageInBirthdaySuccess({ birthdayId, messageId, updates })),
          catchError(error => of(BirthdayActions.updateMessageInBirthdayFailure({ error: error.message || 'Failed to update message' })))
        )
      )
    )
  );

  deleteMessageFromBirthday$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.deleteMessageFromBirthday),
      withLatestFrom(this.store.select(AuthSelectors.selectUserId)),
      mergeMap(([{ birthdayId, messageId }, userId]) =>
        from(this.offlineStorage.deleteScheduledMessage(messageId)).pipe(
          tap(() => this.pushNotificationService.cancelNotification(birthdayId, messageId)),
          withLatestFrom(this.store.select(selectBirthdayById(birthdayId))),
          switchMap(([, birthday]) => {
            if (!birthday?.scheduledMessages) return of(undefined);

            const syncMeta = updateSyncMetadata(birthday, userId);
            const updatedBirthday: Birthday = {
              ...birthday,
              ...syncMeta,
              scheduledMessages: birthday.scheduledMessages.filter(msg => msg.id !== messageId)
            };

            if (userId) {
              this.syncCoordinator.queueChange('birthday', birthdayId, 'update', updatedBirthday);
            }

            return from(this.offlineStorage.updateBirthday(updatedBirthday));
          }),
          map(() => BirthdayActions.deleteMessageFromBirthdaySuccess({ birthdayId, messageId })),
          catchError(error => of(BirthdayActions.deleteMessageFromBirthdayFailure({ error: error.message || 'Failed to delete message' })))
        )
      )
    )
  );
}
