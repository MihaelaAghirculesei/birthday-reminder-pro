import * as AuthSelectors from './auth.selectors';
import { AuthState } from './auth.state';
import { AuthUser } from '../../services/firebase-auth.service';

describe('Auth Selectors', () => {
  const mockUser: AuthUser = {
    uid: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg'
  };

  const authenticatedState: AuthState = {
    user: mockUser,
    loading: false,
    error: null,
    initialized: true
  };

  const unauthenticatedState: AuthState = {
    user: null,
    loading: false,
    error: null,
    initialized: true
  };

  const loadingState: AuthState = {
    user: null,
    loading: true,
    error: null,
    initialized: false
  };

  const errorState: AuthState = {
    user: null,
    loading: false,
    error: 'Something went wrong',
    initialized: true
  };

  it('selectAuthUser should return user', () => {
    const result = AuthSelectors.selectAuthUser.projector(authenticatedState);
    expect(result).toEqual(mockUser);
  });

  it('selectAuthUser should return null when not authenticated', () => {
    const result = AuthSelectors.selectAuthUser.projector(unauthenticatedState);
    expect(result).toBeNull();
  });

  it('selectAuthLoading should return loading state', () => {
    expect(AuthSelectors.selectAuthLoading.projector(loadingState)).toBeTrue();
    expect(AuthSelectors.selectAuthLoading.projector(authenticatedState)).toBeFalse();
  });

  it('selectAuthError should return error', () => {
    expect(AuthSelectors.selectAuthError.projector(errorState)).toBe('Something went wrong');
    expect(AuthSelectors.selectAuthError.projector(authenticatedState)).toBeNull();
  });

  it('selectAuthInitialized should return initialized', () => {
    expect(AuthSelectors.selectAuthInitialized.projector(authenticatedState)).toBeTrue();
    expect(AuthSelectors.selectAuthInitialized.projector(loadingState)).toBeFalse();
  });

  it('selectIsAuthenticated should return true when user exists', () => {
    expect(AuthSelectors.selectIsAuthenticated.projector(mockUser)).toBeTrue();
  });

  it('selectIsAuthenticated should return false when user is null', () => {
    expect(AuthSelectors.selectIsAuthenticated.projector(null)).toBeFalse();
  });

  it('selectUserId should return uid', () => {
    expect(AuthSelectors.selectUserId.projector(mockUser)).toBe('user-123');
  });

  it('selectUserId should return null when no user', () => {
    expect(AuthSelectors.selectUserId.projector(null)).toBeNull();
  });

  it('selectUserDisplayName should return displayName', () => {
    expect(AuthSelectors.selectUserDisplayName.projector(mockUser)).toBe('Test User');
  });

  it('selectUserDisplayName should return null when no user', () => {
    expect(AuthSelectors.selectUserDisplayName.projector(null)).toBeNull();
  });

  it('selectUserEmail should return email', () => {
    expect(AuthSelectors.selectUserEmail.projector(mockUser)).toBe('test@example.com');
  });

  it('selectUserEmail should return null when no user', () => {
    expect(AuthSelectors.selectUserEmail.projector(null)).toBeNull();
  });

  it('selectUserPhotoURL should return photoURL', () => {
    expect(AuthSelectors.selectUserPhotoURL.projector(mockUser)).toBe('https://example.com/photo.jpg');
  });

  it('selectUserPhotoURL should return null when no user', () => {
    expect(AuthSelectors.selectUserPhotoURL.projector(null)).toBeNull();
  });
});
