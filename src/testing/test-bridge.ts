/**
 * Cypress integration-test bridge.
 *
 * Exposes a minimal window.__testBridge API that Cypress tests can call to
 * drive Angular state (auth, NgRx dispatch) without requiring real Firebase.
 *
 * This file is ONLY loaded via a dynamic import() that is guarded by
 * `if (window.Cypress)` in main.ts — it is never included in production bundles.
 */

import type { ApplicationRef } from '@angular/core';

import { Store } from '@ngrx/store';

import { type AuthUser,FirebaseAuthService } from '../app/core/services/firebase-auth.service';
import * as AuthActions from '../app/core/store/auth/auth.actions';

export function setupTestBridge(appRef: ApplicationRef): void {
  const store = appRef.injector.get(Store);
  const authService = appRef.injector.get(FirebaseAuthService);

  (window as unknown as Record<string, unknown>)['__testBridge'] = {
    /** Sets auth state in both FirebaseAuthService and the NgRx store atomically. */
    setAuthUser(user: AuthUser | null): void {
      authService.setTestUser(user);
      store.dispatch(AuthActions.authStateChanged({ user }));
    },
    /** Dispatches any NgRx action by plain object (must include `type` property). */
    dispatch(action: { type: string }): void {
      store.dispatch(action as ReturnType<typeof AuthActions.authStateChanged>);
    },
  };
}
