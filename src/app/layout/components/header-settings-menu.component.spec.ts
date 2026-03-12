import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

import { HeaderSettingsMenuComponent } from './header-settings-menu.component';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';

describe('HeaderSettingsMenuComponent', () => {
  let component: HeaderSettingsMenuComponent;
  let fixture: ComponentFixture<HeaderSettingsMenuComponent>;
  let mockPermissionService: jasmine.SpyObj<NotificationPermissionService> & {
    permissionStatus: BehaviorSubject<string>;
    notificationsEnabled: BehaviorSubject<boolean>;
  };
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    const permissionStatus$ = new BehaviorSubject<string>('default');
    const notificationsEnabled$ = new BehaviorSubject<boolean>(false);

    mockPermissionService = {
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
    mockPermissionService.requestPermission.and.returnValue(Promise.resolve(false));

    mockNotificationService = jasmine.createSpyObj('NotificationService', ['show']);

    await TestBed.configureTestingModule({
      imports: [
        HeaderSettingsMenuComponent,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: NotificationPermissionService, useValue: mockPermissionService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: ThemeService, useValue: { darkMode: signal(false), toggleDarkMode: jasmine.createSpy('toggleDarkMode') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderSettingsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose settingsMenu ViewChild', () => {
    expect(component.settingsMenu).toBeTruthy();
  });

  describe('toggleNotifications', () => {
    it('should request permission when not yet granted', async () => {
      component.notificationsGranted.set(false);
      mockPermissionService.requestPermission.and.returnValue(Promise.resolve(true));

      await component.toggleNotifications();

      expect(mockPermissionService.requestPermission).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith('Notifications enabled!', 'success');
    });

    it('should not show success when permission request is denied', async () => {
      component.notificationsGranted.set(false);
      mockPermissionService.requestPermission.and.returnValue(Promise.resolve(false));

      await component.toggleNotifications();

      expect(mockPermissionService.requestPermission).toHaveBeenCalled();
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('should disable notifications when granted and currently enabled', async () => {
      component.notificationsGranted.set(true);
      component.notificationsEnabled.set(true);

      await component.toggleNotifications();

      expect(mockPermissionService.setNotificationsEnabled).toHaveBeenCalledWith(false);
      expect(mockNotificationService.show).toHaveBeenCalledWith('Notifications disabled', 'info');
    });

    it('should enable notifications when granted but currently disabled', async () => {
      component.notificationsGranted.set(true);
      component.notificationsEnabled.set(false);

      await component.toggleNotifications();

      expect(mockPermissionService.setNotificationsEnabled).toHaveBeenCalledWith(true);
      expect(mockNotificationService.show).toHaveBeenCalledWith('Notifications enabled!', 'success');
    });
  });

  describe('notification state tracking', () => {
    it('should update notificationsGranted when permission status changes', () => {
      (mockPermissionService.permissionStatus as BehaviorSubject<string>).next('granted');
      expect(component.notificationsGranted()).toBe(true);
    });

    it('should update notificationsEnabled when toggle changes', () => {
      (mockPermissionService.notificationsEnabled as BehaviorSubject<boolean>).next(true);
      expect(component.notificationsEnabled()).toBe(true);
    });
  });
});
