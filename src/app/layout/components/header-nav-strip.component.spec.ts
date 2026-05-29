import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { PLATFORM_ID, signal } from '@angular/core';

@Component({ selector: 'app-msg-stub', template: '', standalone: true })
class MsgStubComponent {}
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, EMPTY } from 'rxjs';
import * as AuthActions from '../../core/store/auth/auth.actions';

import { HeaderNavStripComponent } from './header-nav-strip.component';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { BackupService } from '../../core/services/backup.service';

describe('HeaderNavStripComponent', () => {
  let component: HeaderNavStripComponent;
  let fixture: ComponentFixture<HeaderNavStripComponent>;
  let store: MockStore;

  beforeEach(async () => {
    const permissionStatus$ = new BehaviorSubject<string>('default');
    const notificationsEnabled$ = new BehaviorSubject<boolean>(false);

    const mockPermissionService = {
      ...jasmine.createSpyObj('NotificationPermissionService', [
        'getCurrentPermission',
        'requestPermission',
        'isNotificationsEnabled',
        'setNotificationsEnabled'
      ]),
      permissionStatus: permissionStatus$,
      notificationsEnabled: notificationsEnabled$
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockPermissionService.getCurrentPermission.and.returnValue('default');
    mockPermissionService.isNotificationsEnabled.and.returnValue(false);

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
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['show']) },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open'), afterOpened: EMPTY, afterAllClosed: EMPTY } },
        { provide: BackupService, useValue: jasmine.createSpyObj('BackupService', ['exportToJSON', 'exportToCSV', 'importFromFile', 'importFromCSV', 'importFromVCard']) },
        { provide: ThemeService, useValue: { darkMode: signal(false), toggleDarkMode: jasmine.createSpy('toggleDarkMode') } },
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
    spyOn(component.signOutClicked, 'emit');
    component.signOutClicked.emit();
    expect(component.signOutClicked.emit).toHaveBeenCalled();
  });

  describe('auth-aware navigation', () => {
    it('isAuthenticated defaults to false', () => {
      expect(component.isAuthenticated).toBe(false);
    });

    it('dispatches signInWithGoogle when signInForMessages is called', () => {
      spyOn(store, 'dispatch');
      component.signInForMessages();
      expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signInWithGoogle());
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
