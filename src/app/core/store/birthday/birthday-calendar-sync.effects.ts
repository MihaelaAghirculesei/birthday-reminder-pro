import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, from, of } from 'rxjs';
import { catchError, filter, ignoreElements, map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import * as BirthdayActions from './birthday.actions';
import { selectBirthdayState } from './birthday.selectors';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';
import { NotificationService } from '../../services/notification.service';

/**
 * Handles Google Calendar sync as a side-effect domain, fully decoupled from CRUD persistence.
 *
 * - syncToCalendar$          → reacts to addBirthdaySuccess, writes back the calendarEventId
 * - updateInCalendar$        → reacts to updateBirthday (same trigger as CRUD), fire-and-forget
 * - deleteFromCalendar$      → reacts to deleteBirthday, reads eventId from optimisticBackup
 *                              (populated by the reducer before effects run), fire-and-forget
 * - notifyCalendarSyncFailed$ → reacts to calendarSyncFailed, shows a warning to the user
 *
 * All three sync effects dispatch calendarSyncFailed on error instead of swallowing it silently.
 */
@Injectable()
export class BirthdayCalendarSyncEffects {

  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly calendarIntegration = inject(CalendarIntegrationService);
  private readonly offlineStorage = inject(IndexedDBStorageService);
  private readonly notification = inject(NotificationService);

  /**
   * After a birthday is persisted to IndexedDB, attempt to create a Google Calendar event.
   * If an event ID is returned, persist it to IndexedDB and notify the store via calendarEventIdSet.
   * On any failure, dispatches calendarSyncFailed so the user is informed.
   */
  syncToCalendar$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.addBirthdaySuccess),
      mergeMap(({ birthday }) =>
        from(this.calendarIntegration.syncToCalendar(birthday)).pipe(
          filter((eventId): eventId is string => !!eventId),
          switchMap(eventId => {
            const updated = { ...birthday, googleCalendarEventId: eventId };
            return from(this.offlineStorage.updateBirthday(updated)).pipe(
              map(() => BirthdayActions.calendarEventIdSet({ id: birthday.id, calendarEventId: eventId }))
            );
          }),
          catchError((err: unknown) => of(BirthdayActions.calendarSyncFailed({
            operation: 'add',
            error: err instanceof Error ? err.message : 'Calendar sync failed'
          })))
        )
      )
    )
  );

  /**
   * When a birthday is updated by the user, keep the corresponding calendar event in sync.
   * On failure, dispatches calendarSyncFailed.
   */
  updateInCalendar$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.updateBirthday),
      mergeMap(({ birthday }) =>
        from(this.calendarIntegration.updateInCalendar(birthday)).pipe(
          ignoreElements(),
          catchError((err: unknown) => of(BirthdayActions.calendarSyncFailed({
            operation: 'update',
            error: err instanceof Error ? err.message : 'Calendar update failed'
          })))
        )
      )
    )
  );

  /**
   * When a birthday is deleted, remove the corresponding Google Calendar event.
   * The reducer performs an optimistic delete synchronously before effects run,
   * saving the entity to optimisticBackup — we read the calendarEventId from there.
   * On failure, dispatches calendarSyncFailed.
   */
  deleteFromCalendar$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.deleteBirthday),
      withLatestFrom(this.store.select(selectBirthdayState)),
      mergeMap(([{ id }, state]) => {
        const calendarEventId = state.optimisticBackup[id]?.googleCalendarEventId;
        if (!calendarEventId) return EMPTY;

        return from(this.calendarIntegration.deleteFromCalendar(calendarEventId)).pipe(
          ignoreElements(),
          catchError((err: unknown) => of(BirthdayActions.calendarSyncFailed({
            operation: 'delete',
            error: err instanceof Error ? err.message : 'Calendar delete failed'
          })))
        );
      })
    )
  );

  /**
   * Reacts to calendarSyncFailed and shows a user-visible warning notification.
   */
  notifyCalendarSyncFailed$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.calendarSyncFailed),
      tap(({ operation }) => {
        const messages: Record<string, string> = {
          add: 'Google Calendar event could not be created. Birthday saved locally.',
          update: 'Google Calendar event could not be updated. Changes saved locally.',
          delete: 'Google Calendar event could not be deleted.'
        };
        this.notification.show(
          messages[operation] ?? 'Google Calendar sync failed.',
          'warning'
        );
      })
    ),
    { dispatch: false }
  );
}
