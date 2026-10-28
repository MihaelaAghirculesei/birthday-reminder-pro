import { Component } from '@angular/core';
import { PLATFORM_ID, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import type { Mock } from 'vitest';

@Component({ selector: 'app-msg-stub', template: '', standalone: true })
class MsgStubComponent {
}
import { MatDialog } from '@angular/material/dialog';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject, EMPTY } from 'rxjs';

import { BackupService } from '../../core/services/backup.service';
import { type AuthUser, FirebaseAuthService } from '../../core/services/firebase-auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { ThemeService } from '../../core/services/theme.service';
import * as AuthActions from '../../core/store/auth/auth.actions';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { HeaderNavStripComponent } from './header-nav-strip.component';

describe('HeaderNavStripComponent', () => {
  let component: HeaderNavStripComponent;
  let fixture: ComponentFixture<HeaderNavStripComponent>;
  let store: MockStore;

  beforeEach(async () => {
    const permissionStatus$ = new BehaviorSubject<string>('default');
    const notificationsEnabled$ = new BehaviorSubject<boolean>(false);

    const mockPermissionService = {
      ...{
        getCurrentPermission: vi.fn().mockName('NotificationPermissionService.getCurrentPermission'),
        requestPermission: vi.fn().mockName('NotificationPermissionService.requestPermission'),
        isNotificationsEnabled: vi.fn().mockName('NotificationPermissionService.isNotificationsEnabled'),
        setNotificationsEnabled: vi.fn().mockName('NotificationPermissionService.setNotificationsEnabled')
      },
      permissionStatus: permissionStatus$,
      notificationsEnabled: notificationsEnabled$
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockPermissionService.getCurrentPermission.mockReturnValue('default');
    mockPermissionService.isNotificationsEnabled.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [
        HeaderNavStripComponent,
        NoopAnimationsModule,
        RouterTestingModule.withRoutes([
          { path: 'scheduled-messages', component: MsgStubComponent }
        ]),
      ],
      providers: [
        provideMockStore({
          initialState: {
            auth: { user: null, loading: false, error: null },
            birthdays: { ids: [], entities: {}, loading: false, error: null, filters: { searchTerm: '', selectedCategory: null } }
          }
        }),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: NotificationPermissionService, useValue: mockPermissionService },
        {
          provide: NotificationService, useValue: {
            show: vi.fn().mockName('NotificationService.show')
          }
        },
        { provide: MatDialog, useValue: { open: vi.fn(), afterOpened: EMPTY, afterAllClosed: EMPTY } },
        {
          provide: BackupService, useValue: {
            exportToJSON: vi.fn().mockName('BackupService.exportToJSON'),
            exportToCSV: vi.fn().mockName('BackupService.exportToCSV'),
            importFromFile: vi.fn().mockName('BackupService.importFromFile'),
            importFromCSV: vi.fn().mockName('BackupService.importFromCSV'),
            importFromVCard: vi.fn().mockName('BackupService.importFromVCard')
          }
        },
        { provide: FirebaseAuthService, useValue: { performGoogleSignInDirect: vi.fn().mockReturnValue(Promise.resolve(null)) } },
        { provide: ThemeService, useValue: { darkMode: signal(false), toggleDarkMode: vi.fn() } },
        provideTranslateTesting()
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderNavStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit signOutClicked', () => {
    vi.spyOn(component.signOutClicked, 'emit');
    component.signOutClicked.emit();
    expect(component.signOutClicked.emit).toHaveBeenCalled();
  });

  describe('auth-aware navigation', () => {
    it('isAuthenticated defaults to false', () => {
      expect(component.isAuthenticated).toBe(false);
    });

    it('dispatches signInWithGoogle when signInForMessages is called', () => {
      vi.spyOn(store, 'dispatch');
      component.signInForMessages();
      expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signInWithGoogle());
    });

    it('dispatches signInSuccess when performGoogleSignInDirect resolves', async () => {
      const mockUser: AuthUser = { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null };
      const authService = TestBed.inject(FirebaseAuthService);
      (authService.performGoogleSignInDirect as Mock).mockReturnValue(Promise.resolve(mockUser));
      vi.spyOn(store, 'dispatch');

      await component.signInForMessages();

      expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signInSuccess({ user: mockUser }));
    });

    it('dispatches signInFailure when performGoogleSignInDirect rejects', async () => {
      const authService = TestBed.inject(FirebaseAuthService);
      (authService.performGoogleSignInDirect as Mock).mockRejectedValue(new Error('popup closed'));
      vi.spyOn(store, 'dispatch');

      await component.signInForMessages();

      expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signInFailure({ error: 'popup closed' }));
    });
  });

  describe('active state signals', () => {
    it('menuOpen defaults to false', () => {
      expect(component.menuOpen()).toBe(false);
    });

    it('dialogOpen defaults to false', () => {
      expect(component.dialogOpen()).toBe(false);
    });

    it('settingsOverlayOpen mirrors dialogOpen', () => {
      expect(component.settingsOverlayOpen()).toBe(component.dialogOpen());
    });

    it('isDashboardActive is true by default (root url, no open menus)', () => {
      expect(component.isDashboardActive()).toBe(true);
    });

    it('isDashboardActive is false when a menu is open', () => {
      component.menuOpen.set(true);
      expect(component.isDashboardActive()).toBe(false);
    });

    it('isMessagesActive is false on root url', () => {
      expect(component.isMessagesActive()).toBe(false);
    });

    it('isMessagesActive is true and isDashboardActive is false on scheduled-messages route', async () => {
      const router = TestBed.inject(Router);
      await router.navigate(['/scheduled-messages']);
      fixture.detectChanges();
      expect(component.isMessagesActive()).toBe(true);
      expect(component.isDashboardActive()).toBe(false);
    });
  });
});
