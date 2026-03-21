import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthButtonComponent } from './auth-button.component';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { FirebaseAuthService } from '../../../core/services/firebase-auth.service';
import * as AuthActions from '../../../core/store/auth/auth.actions';

describe('AuthButtonComponent', () => {
  let component: AuthButtonComponent;
  let fixture: ComponentFixture<AuthButtonComponent>;
  let store: MockStore;

  const initialState = {
    auth: { user: null, loading: false, error: null, initialized: true },
    sync: { state: 'idle', lastSyncAt: null, pendingChanges: 0, error: null, isOnline: true }
  };

  beforeEach(async () => {
    const authServiceMock = jasmine.createSpyObj('FirebaseAuthService', [
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

  it('should show Sign in text when not loading', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Sign in');
  });

  it('should show Google SVG icon when not loading', () => {
    const el: HTMLElement = fixture.nativeElement;
    const svg = el.querySelector('svg.google-icon');
    expect(svg).toBeTruthy();
  });

  it('should dispatch signInWithGoogle on signIn call', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.signIn();
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signInWithGoogle());
  });

  it('should dispatch signInWithGoogle on button click', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signInWithGoogle());
  });
});
