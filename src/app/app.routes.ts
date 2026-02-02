import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home').then(m => m.HomeComponent),
    pathMatch: 'full'
  },
  {
    path: 'scheduled-messages',
    loadComponent: () => import('./features/scheduled-messages/scheduled-messages.component').then(m => m.ScheduledMessagesComponent),
    data: { preload: true }
  },
  {
    path: 'calendar-sync',
    loadComponent: () => import('./features/calendar-sync/google-calendar-sync.component').then(m => m.GoogleCalendarSyncComponent),
    data: { preload: false }
  },
  {
    path: '**',
    redirectTo: ''
  }
];
