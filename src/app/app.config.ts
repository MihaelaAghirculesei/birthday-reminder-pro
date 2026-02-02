import { ApplicationConfig, isDevMode, ErrorHandler } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideNativeDateAdapter } from '@angular/material/core';

import { routes } from './app.routes';
import { NotificationService, GlobalErrorHandler, ThemeService, SelectivePreloadingStrategy } from './core';
import { provideServiceWorker } from '@angular/service-worker';
import { birthdayReducer } from './core/store/birthday/birthday.reducer';
import { BirthdayEffects } from './core/store/birthday/birthday.effects';
import { categoryReducer } from './core/store/category/category.reducer';
import { CategoryEffects } from './core/store/category/category.effects';
import { uiReducer } from './core/store/ui/ui.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(SelectivePreloadingStrategy)),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    provideStore({
      birthdays: birthdayReducer,
      categories: categoryReducer,
      ui: uiReducer
    }),
    provideEffects([BirthdayEffects, CategoryEffects]),
    NotificationService,
    ThemeService,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        registrationStrategy: 'registerWhenStable:30000'
    })
]
};