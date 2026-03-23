import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, from } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap, withLatestFrom } from 'rxjs/operators';
import * as BirthdayActions from './birthday.actions';
import { selectBirthdayState } from './birthday.selectors';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';
import { IndexedDBStorageService } from '../../services/offline-storage.service';

/**
 * Handles Google Calendar sync as a side-effect domain, fully decoupled from CRUD persistence.
 *
 * - syncToCalendar$   → reacts to addBirthdaySuccess, writes back the calendarEventId
 * - updateInCalendar$ → reacts to updateBirthday (same trigger as CRUD), fire-and-forget
 * - deleteFromCalendar$ → reacts to deleteBirthday, reads eventId from optimisticBackup
 *                         (populated by the reducer before effects run), fire-and-forget
 */
@Injectable()
export class BirthdayCalendarSyncEffects {

  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly calendarIntegration = inject(CalendarIntegrationService);
  private readonly offlineStorage = inject(IndexedDBStorageService);

  /**
   * After a birthday is persisted to IndexedDB, attempt to create a Google Calendar event.
   * If an event ID is returned, persist it to IndexedDB and notify the store via calendarEventIdSet.
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
          catchError(() => EMPTY)
        )
      )
    )
  );

  /**
   * When a birthday is updated by the user, keep the corresponding calendar event in sync.
   * Listens to the updateBirthday trigger (not the success) to mirror the CRUD pipeline start,
   * avoiding any interaction with the optimistic-update/rollback cycle.
   */
  updateInCalendar$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.updateBirthday),
      mergeMap(({ birthday }) =>
        from(this.calendarIntegration.updateInCalendar(birthday)).pipe(
          catchError(() => EMPTY)
        )
      )
    ),
    { dispatch: false }
  );

  /**
   * When a birthday is deleted, remove the corresponding Google Calendar event.
   * The reducer performs an optimistic delete synchronously before effects run,
   * saving the entity to optimisticBackup — we read the calendarEventId from there.
   */
  deleteFromCalendar$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BirthdayActions.deleteBirthday),
      withLatestFrom(this.store.select(selectBirthdayState)),
      mergeMap(([{ id }, state]) => {
        const calendarEventId = state.optimisticBackup[id]?.googleCalendarEventId;
        if (!calendarEventId) return EMPTY;

        return from(this.calendarIntegration.deleteFromCalendar(calendarEventId)).pipe(
          catchError(() => EMPTY)
        );
      })
    ),
    { dispatch: false }
  );
}
