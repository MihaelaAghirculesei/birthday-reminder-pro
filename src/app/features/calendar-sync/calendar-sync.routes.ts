import { type Routes } from '@angular/router';

import { provideEffects } from '@ngrx/effects';

import { BirthdayCalendarSyncEffects } from '../../core/store/birthday/birthday-calendar-sync.effects';

export const calendarSyncRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./google-calendar-sync.component').then(m => m.GoogleCalendarSyncComponent),
    providers: [provideEffects([BirthdayCalendarSyncEffects])]
  }
];
