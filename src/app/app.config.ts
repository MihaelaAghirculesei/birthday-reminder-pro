import { ApplicationConfig, isDevMode, ErrorHandler, APP_INITIALIZER } from '@angular/core';
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
import { authReducer } from './core/store/auth/auth.reducer';
import { AuthEffects } from './core/store/auth/auth.effects';
import { syncReducer } from './core/store/sync/sync.reducer';
import { SyncEffects } from './core/store/sync/sync.effects';
import { FirebaseAuthService } from './core/services/firebase-auth.service';
import { SyncCoordinatorService } from './core/services/sync-coordinator.service';

function initializeApp(
  authService: FirebaseAuthService,
  syncCoordinator: SyncCoordinatorService
) {
  return async () => {
    try {
      authService.initAuthListener();
      await syncCoordinator.initialize();
    } catch (error) {
      console.error('[App] Initialization error (app will continue in offline mode):', error);
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(SelectivePreloadingStrategy)),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    provideStore({
      birthdays: birthdayReducer,
      categories: categoryReducer,
      ui: uiReducer,
      auth: authReducer,
      sync: syncReducer
    }),
    provideEffects([BirthdayEffects, CategoryEffects, AuthEffects, SyncEffects]),
    NotificationService,
    ThemeService,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [FirebaseAuthService, SyncCoordinatorService],
      multi: true
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
