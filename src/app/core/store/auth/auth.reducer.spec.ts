import { type AuthUser } from '../../services/firebase-auth.service';
import * as AuthActions from './auth.actions';
import { authReducer } from './auth.reducer';
import { initialAuthState } from './auth.state';

describe('Auth Reducer', () => {
  const mockUser: AuthUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg'
  };

  it('should return initial state', () => {
    const action = { type: 'NOOP' } as unknown as ReturnType<typeof import('./auth.actions').clearAuthError>;
    const state = authReducer(undefined, action);
    expect(state).toEqual(initialAuthState);
  });

  describe('authStateChanged', () => {
    it('should set user and stop loading', () => {
      const action = AuthActions.authStateChanged({ user: mockUser });
      const state = authReducer({ ...initialAuthState, loading: true }, action);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBeFalse();
    });

    it('should set user to null on sign out', () => {
      const action = AuthActions.authStateChanged({ user: null });
      const state = authReducer({ ...initialAuthState, user: mockUser }, action);
      expect(state.user).toBeNull();
      expect(state.loading).toBeFalse();
    });
  });

  describe('authInitialized', () => {
    it('should set initialized to true', () => {
      const action = AuthActions.authInitialized();
      const state = authReducer(initialAuthState, action);
      expect(state.initialized).toBeTrue();
      expect(state.loading).toBeFalse();
    });
  });

  describe('signInWithGoogle', () => {
    it('should set loading and clear error', () => {
      const action = AuthActions.signInWithGoogle();
      const state = authReducer({ ...initialAuthState, error: 'old error' }, action);
      expect(state.loading).toBeTrue();
      expect(state.error).toBeNull();
    });
  });

  describe('signInSuccess', () => {
    it('should set user, stop loading, clear error', () => {
      const action = AuthActions.signInSuccess({ user: mockUser });
      const state = authReducer({ ...initialAuthState, loading: true }, action);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBeFalse();
      expect(state.error).toBeNull();
    });
  });

  describe('signInFailure', () => {
    it('should set error and stop loading', () => {
      const action = AuthActions.signInFailure({ error: 'Sign-in failed' });
      const state = authReducer({ ...initialAuthState, loading: true }, action);
      expect(state.loading).toBeFalse();
      expect(state.error).toBe('Sign-in failed');
    });
  });

  describe('signOut', () => {
    it('should set loading and clear error', () => {
      const action = AuthActions.signOut();
      const state = authReducer({ ...initialAuthState, user: mockUser, error: 'old' }, action);
      expect(state.loading).toBeTrue();
      expect(state.error).toBeNull();
    });
  });

  describe('signOutSuccess', () => {
    it('should clear user, stop loading, clear error', () => {
      const action = AuthActions.signOutSuccess();
      const state = authReducer({ ...initialAuthState, user: mockUser, loading: true }, action);
      expect(state.user).toBeNull();
      expect(state.loading).toBeFalse();
      expect(state.error).toBeNull();
    });
  });

  describe('signOutFailure', () => {
    it('should set error and stop loading', () => {
      const action = AuthActions.signOutFailure({ error: 'Sign-out failed' });
      const state = authReducer({ ...initialAuthState, loading: true }, action);
      expect(state.loading).toBeFalse();
      expect(state.error).toBe('Sign-out failed');
    });
  });

  describe('clearAuthError', () => {
    it('should clear error', () => {
      const action = AuthActions.clearAuthError();
      const state = authReducer({ ...initialAuthState, error: 'some error' }, action);
      expect(state.error).toBeNull();
    });
  });

  // ─── State Machine Transitions ───────────────────────────────────────────────

  describe('Transitions', () => {
    const reduce = (...actions: Parameters<typeof authReducer>[1][]) =>
      actions.reduce((s, a) => authReducer(s, a), initialAuthState);

    it('sign-in happy path: loading → authenticated', () => {
      const state = reduce(
        AuthActions.signInWithGoogle(),
        AuthActions.signInSuccess({ user: mockUser }),
        AuthActions.authStateChanged({ user: mockUser })
      );
      expect(state).toEqual(jasmine.objectContaining({
        user: mockUser,
        loading: false,
        error: null
      }));
    });

    it('sign-in failure → error recovery → retry success', () => {
      const afterFailure = reduce(
        AuthActions.signInWithGoogle(),
        AuthActions.signInFailure({ error: 'popup-closed' })
      );
      expect(afterFailure.error).toBe('popup-closed');
      expect(afterFailure.loading).toBeFalse();

      const afterRecovery = reduce(
        AuthActions.signInWithGoogle(),
        AuthActions.signInFailure({ error: 'popup-closed' }),
        AuthActions.clearAuthError(),
        AuthActions.signInWithGoogle(),
        AuthActions.signInSuccess({ user: mockUser })
      );
      expect(afterRecovery).toEqual(jasmine.objectContaining({
        user: mockUser,
        loading: false,
        error: null
      }));
    });

    it('sign-out happy path: authenticated → signed out', () => {
      const state = reduce(
        AuthActions.signInSuccess({ user: mockUser }),
        AuthActions.signOut(),
        AuthActions.signOutSuccess(),
        AuthActions.authStateChanged({ user: null })
      );
      expect(state).toEqual(jasmine.objectContaining({
        user: null,
        loading: false,
        error: null
      }));
    });

    it('sign-out failure → retry → success', () => {
      const state = reduce(
        AuthActions.signInSuccess({ user: mockUser }),
        AuthActions.signOut(),
        AuthActions.signOutFailure({ error: 'network-error' }),
        AuthActions.signOut(),
        AuthActions.signOutSuccess()
      );
      expect(state.user).toBeNull();
      expect(state.loading).toBeFalse();
      expect(state.error).toBeNull();
    });

    it('app boot: uninitialized → initialized → user arrives via listener', () => {
      const afterInit = authReducer(initialAuthState, AuthActions.authInitialized());
      expect(afterInit.initialized).toBeTrue();
      expect(afterInit.user).toBeNull();

      const afterListener = authReducer(afterInit, AuthActions.authStateChanged({ user: mockUser }));
      expect(afterListener.user).toEqual(mockUser);
    });

    it('does not mutate previous state snapshots', () => {
      const before = { ...initialAuthState };
      authReducer(initialAuthState, AuthActions.signInWithGoogle());
      expect(initialAuthState).toEqual(before);
    });
  });
});
