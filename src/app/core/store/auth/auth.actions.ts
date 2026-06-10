import { createAction, props } from '@ngrx/store';

import { type AuthUser } from '../../services/firebase-auth.service';

// Auth State Changes (from Firebase listener)
export const authStateChanged = createAction(
  '[Auth] State Changed',
  props<{ user: AuthUser | null }>()
);

export const authInitialized = createAction('[Auth] Initialized');

// Sign In
export const signInWithGoogle = createAction('[Auth] Sign In With Google');

export const signInSuccess = createAction(
  '[Auth] Sign In Success',
  props<{ user: AuthUser }>()
);

export const signInFailure = createAction(
  '[Auth] Sign In Failure',
  props<{ error: string }>()
);

// Sign Out
export const signOut = createAction('[Auth] Sign Out');

export const signOutSuccess = createAction('[Auth] Sign Out Success');

export const signOutFailure = createAction(
  '[Auth] Sign Out Failure',
  props<{ error: string }>()
);

// Delete Account
export const deleteAccount = createAction(
  '[Auth] Delete Account',
  props<{ userId: string }>()
);

export const deleteAccountSuccess = createAction('[Auth] Delete Account Success');

export const deleteAccountFailure = createAction(
  '[Auth] Delete Account Failure',
  props<{ error: string }>()
);

// Clear Error
export const clearAuthError = createAction('[Auth] Clear Error');
