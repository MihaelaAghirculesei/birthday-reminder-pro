import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthButtonComponent } from './auth-button.component';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { AuthUser, FirebaseAuthService } from '../../../core/services/firebase-auth.service';
import * as AuthActions from '../../../core/store/auth/auth.actions';
import * as AuthSelectors from '../../../core/store/auth/auth.selectors';

describe('AuthButtonComponent', () => {
  let component: AuthButtonComponent;
  let fixture: ComponentFixture<AuthButtonComponent>;
  let store: MockStore;
  let authServiceMock: jasmine.SpyObj<FirebaseAuthService>;

  const initialState = {
    auth: { user: null, loading: false, error: null, initialized: true },
    sync: { state: 'idle', lastSyncAt: null, pendingChanges: 0, error: null, isOnline: true }
  };

  beforeEach(async () => {
    authServiceMock = jasmine.createSpyObj('FirebaseAuthService', [
      'signInWithGoogle', 'signOut', 'initAuthListener', 'performGoogleSignInDirect'
    ]);

    await TestBed.configureTestingModule({
      imports: [AuthButtonComponent, NoopAnimationsModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: FirebaseAuthService, useValue: authServiceMock },
        provideTranslateTesting()
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(AuthButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- Unauthenticated branch ---

  it('should render sign-in button with Google icon when not authenticated', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sign in');
    expect(el.querySelector('svg.google-icon')).toBeTruthy();
  });

  // --- Loading branch ---

  it('should show "Signing in..." when loading and not authenticated', () => {
    store.overrideSelector(AuthSelectors.selectAuthLoading, true);
    store.overrideSelector(AuthSelectors.selectIsAuthenticated, false);
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Signing in...');
    expect(el.querySelector('mat-spinner')).toBeTruthy();
  });

  it('should show "Signing out..." when loading and authenticated', () => {
    store.overrideSelector(AuthSelectors.selectAuthLoading, true);
    store.overrideSelector(AuthSelectors.selectIsAuthenticated, true);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Signing out...');
  });

  // --- Authenticated branch ---

  it('should show "Sign out" when authenticated without display name', () => {
    store.overrideSelector(AuthSelectors.selectIsAuthenticated, true);
    store.overrideSelector(AuthSelectors.selectUserDisplayName, null);
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sign out');
  });

  it('should show display name when authenticated with display name', () => {
    store.overrideSelector(AuthSelectors.selectIsAuthenticated, true);
    store.overrideSelector(AuthSelectors.selectUserDisplayName, 'Jane Doe');
    store.refreshState();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
  });

  // --- signIn() branches ---

  it('should dispatch signInWithGoogle and signInSuccess on successful sign-in', async () => {
    const fakeUser: AuthUser = { uid: '123', displayName: 'Jane', email: 'j@test.com', photoURL: null };
    authServiceMock.performGoogleSignInDirect.and.returnValue(Promise.resolve(fakeUser));
    const dispatchSpy = spyOn(store, 'dispatch');

    await component.signIn();

    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signInWithGoogle());
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signInSuccess({ user: fakeUser }));
  });

  it('should dispatch signInFailure with error message when sign-in throws an Error', async () => {
    authServiceMock.performGoogleSignInDirect.and.returnValue(Promise.reject(new Error('popup closed')));
    const dispatchSpy = spyOn(store, 'dispatch');

    await component.signIn();

    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signInFailure({ error: 'popup closed' }));
  });

  it('should dispatch signInFailure with fallback message when sign-in throws a non-Error', async () => {
    authServiceMock.performGoogleSignInDirect.and.returnValue(Promise.reject('unknown'));
    const dispatchSpy = spyOn(store, 'dispatch');

    await component.signIn();

    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signInFailure({ error: 'Sign-in failed' }));
  });

  // --- signOut() ---

  it('should dispatch signOut action', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.signOut();
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signOut());
  });

  it('should call signOut on button click when authenticated', () => {
    store.overrideSelector(AuthSelectors.selectIsAuthenticated, true);
    store.overrideSelector(AuthSelectors.selectUserDisplayName, null);
    store.refreshState();
    fixture.detectChanges();

    const dispatchSpy = spyOn(store, 'dispatch');
    fixture.nativeElement.querySelector('button').click();
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signOut());
  });
});
