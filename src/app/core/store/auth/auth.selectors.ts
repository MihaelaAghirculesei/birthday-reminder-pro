import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState, initialAuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

const selectAuthStateOrDefault = createSelector(
  selectAuthState,
  (state) => state ?? initialAuthState
);

export const selectAuthUser = createSelector(
  selectAuthStateOrDefault,
  (state) => state.user
);

export const selectAuthLoading = createSelector(
  selectAuthStateOrDefault,
  (state) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthStateOrDefault,
  (state) => state.error
);

export const selectAuthInitialized = createSelector(
  selectAuthStateOrDefault,
  (state) => state.initialized
);

export const selectIsAuthenticated = createSelector(
  selectAuthUser,
  (user) => user !== null
);

export const selectUserId = createSelector(
  selectAuthUser,
  (user) => user?.uid ?? null
);

export const selectUserDisplayName = createSelector(
  selectAuthUser,
  (user) => user?.displayName ?? null
);

export const selectUserEmail = createSelector(
  selectAuthUser,
  (user) => user?.email ?? null
);

export const selectUserPhotoURL = createSelector(
  selectAuthUser,
  (user) => user?.photoURL ?? null
);
