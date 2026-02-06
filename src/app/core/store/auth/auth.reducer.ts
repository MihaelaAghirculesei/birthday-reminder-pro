import { createReducer, on } from '@ngrx/store';
import { AuthState, initialAuthState } from './auth.state';
import * as AuthActions from './auth.actions';

export const authReducer = createReducer(
  initialAuthState,

  // Auth State Changes
  on(AuthActions.authStateChanged, (state, { user }): AuthState => ({
    ...state,
    user,
    loading: false
  })),

  on(AuthActions.authInitialized, (state): AuthState => ({
    ...state,
    initialized: true,
    loading: false
  })),

  // Sign In
  on(AuthActions.signInWithGoogle, (state): AuthState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthActions.signInSuccess, (state, { user }): AuthState => ({
    ...state,
    user,
    loading: false,
    error: null
  })),

  on(AuthActions.signInFailure, (state, { error }): AuthState => ({
    ...state,
    loading: false,
    error
  })),

  // Sign Out
  on(AuthActions.signOut, (state): AuthState => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthActions.signOutSuccess, (state): AuthState => ({
    ...state,
    user: null,
    loading: false,
    error: null
  })),

  on(AuthActions.signOutFailure, (state, { error }): AuthState => ({
    ...state,
    loading: false,
    error
  })),

  // Clear Error
  on(AuthActions.clearAuthError, (state): AuthState => ({
    ...state,
    error: null
  }))
);
