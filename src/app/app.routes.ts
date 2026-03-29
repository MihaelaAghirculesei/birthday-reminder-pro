
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home').then(m => m.HomeComponent),
    pathMatch: 'full'
  },
  {
    path: 'scheduled-messages',
    loadComponent: () => import('./features/scheduled-messages/scheduled-messages.component').then(m => m.ScheduledMessagesComponent),
    canActivate: [authGuard],
    data: { preload: true }
  },
  // Google Calendar Sync — route active; UI entry-point disabled pending Google OAuth verification
  // To re-enable navigation: add the menu item back in header-settings-menu.component.ts
  {
    path: 'calendar-sync',
    loadChildren: () =>
      import('./features/calendar-sync/calendar-sync.routes').then(m => m.calendarSyncRoutes),
    canActivate: [authGuard],
    data: { preload: false }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
