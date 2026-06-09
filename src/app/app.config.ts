import { isPlatformBrowser } from '@angular/common';
import { APP_INITIALIZER, type ApplicationConfig, ErrorHandler, importProvidersFrom, isDevMode, PLATFORM_ID } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withPreloading } from '@angular/router';
import { provideServiceWorker, SwUpdate } from '@angular/service-worker';

import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { TranslateLoader,TranslateModule } from '@ngx-translate/core';

import { routes } from './app.routes';
import { ERROR_REPORTER, GlobalErrorHandler, NotificationService, SelectivePreloadingStrategy, SentryReporterService, ThemeService } from './core';
import { InlineTranslateLoader } from './core/i18n/inline-translate-loader';
import { FirebaseAuthService } from './core/services/firebase-auth.service';
import { LocaleService } from './core/services/locale.service';
import { LoggerService } from './core/services/logger.service';
import { SyncCoordinatorService } from './core/services/sync-coordinator.service';
import { AuthEffects } from './core/store/auth/auth.effects';
import { authReducer } from './core/store/auth/auth.reducer';
import { BirthdayCrudEffects, BirthdayMessageEffects, BirthdayNotificationEffects } from './core/store/birthday/birthday.effects';
import { birthdayReducer } from './core/store/birthday/birthday.reducer';
import { CategoryEffects } from './core/store/category/category.effects';
import { categoryReducer } from './core/store/category/category.reducer';
import { SyncEffects } from './core/store/sync/sync.effects';
import { syncReducer } from './core/store/sync/sync.reducer';
import { uiReducer } from './core/store/ui/ui.reducer';

function initializeApp(
  authService: FirebaseAuthService,
  syncCoordinator: SyncCoordinatorService,
  logger: LoggerService,
  localeService: LocaleService
) {
  return async () => {
    try {
      await localeService.initialize();
      // Firebase is loaded on-demand: initAuthListener() triggers it for returning users,
      // performGoogleSignIn() triggers it on first sign-in. Anonymous users never pay the cost.
      authService.initAuthListener();
      await syncCoordinator.initialize();
    } catch (error) {
      logger.error('[App] Initialization error (app will continue in offline mode):', error);
    }
  };
}

export function initSwErrorLogging(
  swUpdate: SwUpdate,
  logger: LoggerService,
  platformId: object,
  devMode: boolean = isDevMode()
): () => void {
  return () => {
    // Log unrecoverable SW state at runtime (broken cache, version mismatch, etc.)
    swUpdate.unrecoverable.subscribe(({ reason }) => {
      logger.error('[SW] Unrecoverable state — reload required:', reason);
    });

    if (!isPlatformBrowser(platformId) || !navigator.serviceWorker || devMode) return;

    // Detect registration failures: navigator.serviceWorker.register() is idempotent —
    // the browser returns the existing registration if already registered, so calling
    // it here alongside Angular's deferred registration is safe.
    navigator.serviceWorker.register('ngsw-worker.js').catch((error: unknown) => {
      logger.error('[SW] Registration failed:', error);
    });
  };
}

const devProviders = isDevMode()
  ? [provideStoreDevtools({ maxAge: 25, logOnly: false })]
  : [];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withPreloading(SelectivePreloadingStrategy)),
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? provideNoopAnimations()
      : provideAnimationsAsync(),
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
    { provide: ERROR_REPORTER, useExisting: SentryReporterService },
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
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initSwErrorLogging,
      deps: [SwUpdate, LoggerService, PLATFORM_ID],
      multi: true
    }
  ]
};
