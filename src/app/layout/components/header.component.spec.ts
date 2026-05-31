import { PLATFORM_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore,provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, EMPTY } from 'rxjs';

import { BackupService } from '../../core/services/backup.service';
import { type AuthUser,FirebaseAuthService } from '../../core/services/firebase-auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { ThemeService } from '../../core/services/theme.service';
import * as AuthActions from '../../core/store/auth/auth.actions';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { HeaderComponent } from './header.component';

const INITIAL_STATE = {
  auth: { user: null, loading: false, error: null },
  birthdays: { ids: [], entities: {}, loading: false, error: null, filters: { searchTerm: '', selectedCategory: null } }
};

function mockPermissionService() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc: any = {
    ...jasmine.createSpyObj('NotificationPermissionService', [
      'getCurrentPermission', 'requestPermission', 'isNotificationsEnabled', 'setNotificationsEnabled'
    ]),
    permissionStatus: new BehaviorSubject<string>('default'),
    notificationsEnabled: new BehaviorSubject<boolean>(false)
  };
  svc.getCurrentPermission.and.returnValue('default');
  svc.isNotificationsEnabled.and.returnValue(false);
  return svc;
}

function buildProviders(platformId: unknown = 'browser') {
  return [
    provideMockStore({ initialState: INITIAL_STATE }),
    { provide: PLATFORM_ID, useValue: platformId },
    { provide: NotificationPermissionService, useValue: mockPermissionService() },
    { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['show']) },
    { provide: MatDialog, useValue: { open: jasmine.createSpy(), afterOpened: EMPTY, afterAllClosed: EMPTY } },
    { provide: FirebaseAuthService, useValue: { performGoogleSignInDirect: jasmine.createSpy().and.returnValue(Promise.resolve(null)) } },
    { provide: BackupService, useValue: jasmine.createSpyObj('BackupService', ['exportToJSON', 'exportToCSV', 'importFromFile', 'importFromCSV', 'importFromVCard']) },
    { provide: ThemeService, useValue: { darkMode: signal(false), toggleDarkMode: jasmine.createSpy() } },
    provideTranslateTesting()
  ];
}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule, RouterTestingModule],
      providers: buildProviders()
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dispatches signOut action', () => {
    spyOn(store, 'dispatch');
    component.signOut();
    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signOut());
  });

  it('dispatches signInWithGoogle and closes menu on signInDirect', () => {
    spyOn(store, 'dispatch');
    component.signInDirect();
    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signInWithGoogle());
  });

  it('dispatches signInSuccess when performGoogleSignInDirect resolves', async () => {
    const mockUser: AuthUser = { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null };
    const authService = TestBed.inject(FirebaseAuthService);
    (authService.performGoogleSignInDirect as jasmine.Spy).and.returnValue(Promise.resolve(mockUser));
    spyOn(store, 'dispatch');

    await component.signInDirect();

    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signInSuccess({ user: mockUser }));
  });

  it('dispatches signInFailure when performGoogleSignInDirect rejects', async () => {
    const authService = TestBed.inject(FirebaseAuthService);
    (authService.performGoogleSignInDirect as jasmine.Spy).and.returnValue(Promise.reject(new Error('popup closed')));
    spyOn(store, 'dispatch');

    await component.signInDirect();

    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signInFailure({ error: 'popup closed' }));
  });

  describe('scroll cleanup on destroy', () => {
    it('stops calling onScroll after component is destroyed', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onScrollSpy = spyOn<any>(component, 'onScroll');
      fixture.destroy();
      window.dispatchEvent(new Event('scroll'));
      document.body.dispatchEvent(new Event('scroll'));
      expect(onScrollSpy).not.toHaveBeenCalled();
    });
  });

  describe('onScroll', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let comp: any;
    let nativeEl: HTMLElement;

    beforeEach(() => {
      comp = component;
      nativeEl = comp.el.nativeElement;
      spyOn(comp, 'getScrollY');
      comp.lastScrollY = 100;
    });

    it('removes header-hidden when at top (currentY <= 0)', () => {
      nativeEl.classList.add('header-hidden');
      comp.getScrollY.and.returnValue(0);
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeFalse();
    });

    it('adds header-hidden when scrolling down past threshold', () => {
      comp.getScrollY.and.returnValue(115); // > lastScrollY(100) + threshold(10)
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeTrue();
    });

    it('removes header-hidden when scrolling up past threshold', () => {
      nativeEl.classList.add('header-hidden');
      comp.getScrollY.and.returnValue(85); // < lastScrollY(100) - threshold(10)
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeFalse();
    });

    it('does not change state when scroll delta is within threshold', () => {
      nativeEl.classList.add('header-hidden');
      comp.getScrollY.and.returnValue(105); // within ±10
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeTrue();
    });

    it('updates lastScrollY after state change', () => {
      comp.getScrollY.and.returnValue(115);
      comp.onScroll();
      expect(comp.lastScrollY).toBe(115);
    });
  });
});

describe('HeaderComponent – server platform', () => {
  it('does not attach scroll listeners on server platform', async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule, RouterTestingModule],
      providers: buildProviders('server')
    }).compileComponents();

    spyOn(window, 'addEventListener');
    TestBed.createComponent(HeaderComponent).detectChanges();

    expect(window.addEventListener).not.toHaveBeenCalled();
  });
});
