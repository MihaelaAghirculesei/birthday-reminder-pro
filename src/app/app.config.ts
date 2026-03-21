import { ApplicationConfig, isDevMode, ErrorHandler, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { InlineTranslateLoader } from './core/i18n/inline-translate-loader';
import { LocaleService } from './core/services/locale.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideNativeDateAdapter } from '@angular/material/core';

import { routes } from './app.routes';
import { NotificationService, GlobalErrorHandler, ThemeService, SelectivePreloadingStrategy, ERROR_REPORTER, ErrorReportingService } from './core';
import { provideServiceWorker } from '@angular/service-worker';
import { birthdayReducer } from './core/store/birthday/birthday.reducer';
import { BirthdayCrudEffects, BirthdayMessageEffects, BirthdayNotificationEffects } from './core/store/birthday/birthday.effects';
import { categoryReducer } from './core/store/category/category.reducer';
import { CategoryEffects } from './core/store/category/category.effects';
import { uiReducer } from './core/store/ui/ui.reducer';
import { authReducer } from './core/store/auth/auth.reducer';
import { AuthEffects } from './core/store/auth/auth.effects';
import { syncReducer } from './core/store/sync/sync.reducer';
import { SyncEffects } from './core/store/sync/sync.effects';
import { FirebaseAuthService } from './core/services/firebase-auth.service';
import { SyncCoordinatorService } from './core/services/sync-coordinator.service';
import { LoggerService } from './core/services/logger.service';
import { provideStoreDevtools } from '@ngrx/store-devtools';

function initializeApp(
  authService: FirebaseAuthService,
  syncCoordinator: SyncCoordinatorService,
  logger: LoggerService,
  localeService: LocaleService
) {
  return async () => {
    try {
      localeService.initialize();
      authService.initAuthListener();
      await syncCoordinator.initialize();
    } catch (error) {
      logger.error('[App] Initialization error (app will continue in offline mode):', error);
    }
  };
}

const devProviders = isDevMode()
  ? [provideStoreDevtools({ maxAge: 25, logOnly: false })]
  : [];

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
    provideEffects([BirthdayCrudEffects, BirthdayMessageEffects, BirthdayNotificationEffects, CategoryEffects, AuthEffects, SyncEffects]),
    ...devProviders,
    NotificationService,
    ThemeService,
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: ERROR_REPORTER, useExisting: ErrorReportingService },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [FirebaseAuthService, SyncCoordinatorService, LoggerService, LocaleService],
      multi: true
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: InlineTranslateLoader },
        defaultLanguage: 'en'
      })
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
