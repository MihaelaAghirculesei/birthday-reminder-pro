import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, mergeMap, tap } from 'rxjs/operators';
import * as BirthdayActions from './birthday.actions';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { IdGeneratorService } from '../../services/id-generator.service';
import { LoggerService } from '../../services/logger.service';
import { Birthday } from '../../../shared/models/birthday.model';
import { getZodiacSign, DEFAULT_CATEGORY } from '../../../shared';
import { generateMockBirthdays } from '../../../testing';

@Injectable()
export class BirthdayEffects {

  loadBirthdays$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.loadBirthdays),
      mergeMap(() =>
        this.offlineStorage.getBirthdays().then(birthdays => {
          return birthdays.map(b => ({
            ...b,
            zodiacSign: b.zodiacSign || getZodiacSign(b.birthDate).name,
            category: this.normalizeCategoryId(b.category)
          }));
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
      mergeMap(({ birthday }) => {
        const newBirthday: Birthday = {
          ...birthday,
          id: this.idGenerator.generateId(),
          category: this.normalizeCategoryId(birthday.category || DEFAULT_CATEGORY),
          zodiacSign: birthday.zodiacSign || getZodiacSign(birthday.birthDate).name
        };

        return this.syncToGoogleCalendar(newBirthday).then(eventId => {
          if (eventId) {
            newBirthday.googleCalendarEventId = eventId;
          }
          return newBirthday;
        }).then(finalBirthday =>
          this.offlineStorage.addBirthday(finalBirthday).then(() => finalBirthday)
        ).then(finalBirthday =>
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
      mergeMap(({ birthday }) => {
        const normalizedBirthday: Birthday = {
          ...birthday,
          category: this.normalizeCategoryId(birthday.category)
        };
        return this.updateGoogleCalendar(normalizedBirthday).then(() =>
          this.offlineStorage.updateBirthday(normalizedBirthday)
        ).then(() =>
          BirthdayActions.updateBirthdaySuccess({ birthday: normalizedBirthday })
        ).catch(error =>
          BirthdayActions.updateBirthdayFailure({ error: error.message })
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
      mergeMap(({ id }) =>
        this.offlineStorage.getBirthdays().then(birthdays => {
          const birthday = birthdays.find(b => b.id === id);
          return birthday;
        }).then(birthday => {
          this.pushNotificationService.cancelAllNotificationsForBirthday(id);
          if (birthday?.googleCalendarEventId) {
            return this.deleteFromGoogleCalendar(birthday.googleCalendarEventId).then(() => id);
          }
          return id;
        }).then(birthdayId =>
          this.offlineStorage.deleteBirthday(birthdayId)
        ).then(() =>
          BirthdayActions.deleteBirthdaySuccess({ id })
        ).catch(error =>
          BirthdayActions.deleteBirthdayFailure({ error: error.message })
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
      mergeMap(({ birthdayId, message }) =>
        this.offlineStorage.saveScheduledMessage(message).then(() =>
          this.offlineStorage.getBirthdays()
        ).then(birthdays => {
          const birthday = birthdays.find(b => b.id === birthdayId);
          if (birthday) {
            const updatedBirthday = {
              ...birthday,
              scheduledMessages: [...(birthday.scheduledMessages || []), message]
            };
            this.pushNotificationService.scheduleNotification(birthday, message);
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
      mergeMap(({ birthdayId, messageId, updates }) =>
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
            const updatedMessages = birthday.scheduledMessages.map(msg =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            );
            const updatedBirthday = {
              ...birthday,
              scheduledMessages: updatedMessages
            };
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
      mergeMap(({ birthdayId, messageId }) =>
        this.offlineStorage.deleteScheduledMessage(messageId).then(() => {
          this.pushNotificationService.cancelNotification(birthdayId, messageId);
          return this.offlineStorage.getBirthdays();
        }).then(birthdays => {
          const birthday = birthdays.find(b => b.id === birthdayId);
          if (birthday?.scheduledMessages) {
            const updatedMessages = birthday.scheduledMessages.filter(msg => msg.id !== messageId);
            const updatedBirthday = {
              ...birthday,
              scheduledMessages: updatedMessages
            };
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
      mergeMap(() => {
        const testBirthdays = generateMockBirthdays(() => this.idGenerator.generateId());

        const addActions = testBirthdays.map(birthday =>
          BirthdayActions.addBirthday({ birthday })
        );

        return [
          ...addActions,
          BirthdayActions.loadTestDataSuccess({ birthdays: testBirthdays })
        ];
      }),
      catchError(error => of(BirthdayActions.loadTestDataFailure({ error: error.message })))
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

  constructor(
    private actions$: Actions,
    private offlineStorage: IndexedDBStorageService,
    private notificationService: NotificationService,
    private googleCalendarService: GoogleCalendarService,
    private pushNotificationService: PushNotificationService,
    private idGenerator: IdGeneratorService,
    private logger: LoggerService
  ) {}

  private normalizeCategoryId(category?: string): string {
    if (!category) return DEFAULT_CATEGORY;

    const categoryMap: Record<string, string> = {
      'Family': 'family',
      'Friends': 'friends',
      'Work': 'colleagues',
      'Colleagues': 'colleagues',
      'Other': 'other',
      'Partner/Ex': 'romantic',
      'Romantic': 'romantic',
      'Acquaintances': 'acquaintances'
    };

    if (category === category.toLowerCase()) {
      return category;
    }

    return categoryMap[category] || category.toLowerCase();
  }

  private async syncToGoogleCalendar(birthday: Birthday): Promise<string | null> {
    if (this.googleCalendarService.isEnabled()) {
      try {
        return await this.googleCalendarService.syncBirthdayToCalendar(birthday);
      } catch (error) {
        this.logger.error('[BirthdayEffects] Failed to sync to Google Calendar:', error);
        return null;
      }
    }
    return null;
  }

  private async updateGoogleCalendar(birthday: Birthday): Promise<void> {
    if (birthday.googleCalendarEventId && this.googleCalendarService.isEnabled()) {
      try {
        await this.googleCalendarService.updateBirthdayInCalendar(birthday, birthday.googleCalendarEventId);
      } catch (error) {
        this.logger.error('[BirthdayEffects] Failed to update Google Calendar:', error);
      }
    }
  }

  private async deleteFromGoogleCalendar(eventId: string): Promise<void> {
    if (this.googleCalendarService.isEnabled()) {
      try {
        await this.googleCalendarService.deleteBirthdayFromCalendar(eventId);
      } catch (error) {
        this.logger.error('[BirthdayEffects] Failed to delete from Google Calendar:', error);
      }
    }
  }
}
