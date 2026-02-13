import { createSelector } from '@ngrx/store';
import { AuthState, initialAuthState } from './auth.state';

export const selectAuthState = createSelector(
  (state: Record<string, unknown>) => state['auth'] as AuthState | undefined,
  (state) => state ?? initialAuthState
);

export const selectAuthUser = createSelector(
  selectAuthState,
  (state) => state.user
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state.error
);

export const selectAuthInitialized = createSelector(
  selectAuthState,
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
