import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { NotificationPermissionService } from './notification-permission.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

interface MockNotification {
  permission: NotificationPermission;
  requestPermission?: jasmine.Spy;
}

interface WindowWithNotification {
  Notification?: MockNotification;
}

const windowRef = window as unknown as WindowWithNotification;

describe('NotificationPermissionService', () => {
  let service: NotificationPermissionService;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageMock[key] || null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    windowRef.Notification = {
      permission: 'default',
      requestPermission: jasmine.createSpy('requestPermission').and.returnValue(Promise.resolve('granted'))
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: {},
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({
      providers: [
        NotificationPermissionService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        SILENT_LOGGER_PROVIDER
      ]
    });

    service = TestBed.inject(NotificationPermissionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isSupported', () => {
    it('should return true when notifications are supported', () => {
      expect(service.isSupported()).toBe(true);
    });

    it('should return false when Notification is not available', () => {
      delete windowRef.Notification;
      expect(service.isSupported()).toBe(false);
      windowRef.Notification = { permission: 'default' };
    });

  });

  describe('getCurrentPermission', () => {
    it('should return default permission', () => {
      windowRef.Notification!.permission = 'default';
      expect(service.getCurrentPermission()).toBe('default');
    });

    it('should return granted permission', () => {
      windowRef.Notification!.permission = 'granted';
      expect(service.getCurrentPermission()).toBe('granted');
    });

    it('should return denied permission', () => {
      windowRef.Notification!.permission = 'denied';
      expect(service.getCurrentPermission()).toBe('denied');
    });

    it('should return denied when notifications not supported', () => {
      delete windowRef.Notification;
      expect(service.getCurrentPermission()).toBe('denied');
      windowRef.Notification = { permission: 'default' };
    });
  });

  describe('hasPermission', () => {
    it('should return true when permission is granted', () => {
      windowRef.Notification!.permission = 'granted';
      expect(service.hasPermission()).toBe(true);
    });

    it('should return false when permission is default', () => {
      windowRef.Notification!.permission = 'default';
      expect(service.hasPermission()).toBe(false);
    });

    it('should return false when permission is denied', () => {
      windowRef.Notification!.permission = 'denied';
      expect(service.hasPermission()).toBe(false);
    });
  });

  describe('requestPermission', () => {
    it('should return false when notifications not supported', async () => {
      delete windowRef.Notification;
      const result = await service.requestPermission();
      expect(result).toBe(false);
      windowRef.Notification = { permission: 'default' };
    });

    it('should return true when already granted', async () => {
      windowRef.Notification!.permission = 'granted';
      const result = await service.requestPermission();
      expect(result).toBe(true);
    });

    it('should return false when already denied', async () => {
      windowRef.Notification!.permission = 'denied';
      const result = await service.requestPermission();
      expect(result).toBe(false);
    });

    it('should request permission and return true on granted', async () => {
      windowRef.Notification!.permission = 'default';
      windowRef.Notification!.requestPermission = jasmine.createSpy().and.returnValue(Promise.resolve('granted'));

      const result = await service.requestPermission();

      expect(result).toBe(true);
      expect(windowRef.Notification!.requestPermission).toHaveBeenCalled();
    });

    it('should request permission and return false on denied', async () => {
      windowRef.Notification!.permission = 'default';
      windowRef.Notification!.requestPermission = jasmine.createSpy().and.returnValue(Promise.resolve('denied'));

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });

    it('should save permission state to localStorage', async () => {
      windowRef.Notification!.permission = 'default';
      windowRef.Notification!.requestPermission = jasmine.createSpy().and.returnValue(Promise.resolve('granted'));

      await service.requestPermission();

      expect(localStorage.setItem).toHaveBeenCalledWith('notificationPermissionRequested', 'true');
      expect(localStorage.setItem).toHaveBeenCalledWith('notificationPermissionGranted', 'true');
    });

    it('should handle request permission error', async () => {
      windowRef.Notification!.permission = 'default';
      windowRef.Notification!.requestPermission = jasmine.createSpy().and.returnValue(Promise.reject('Error'));

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('hasBeenAsked', () => {
    it('should return false when not asked', () => {
      expect(service.hasBeenAsked()).toBe(false);
    });

    it('should return true when asked before', () => {
      localStorageMock['notificationPermissionRequested'] = 'true';
      expect(service.hasBeenAsked()).toBe(true);
    });

    it('should return false on server', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          NotificationPermissionService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      const serverService = TestBed.inject(NotificationPermissionService);
      expect(serverService.hasBeenAsked()).toBe(false);
    });
  });

  describe('showTestNotification', () => {
    it('should not show notification when no permission', async () => {
      windowRef.Notification!.permission = 'denied';
      await expectAsync(service.showTestNotification()).toBeResolved();
    });

    it('should show test notification when permission granted', async () => {
      windowRef.Notification!.permission = 'granted';
      const mockRegistration = {
        showNotification: jasmine.createSpy('showNotification').and.returnValue(Promise.resolve())
      };
      Object.defineProperty(navigator.serviceWorker, 'ready', {
        value: Promise.resolve(mockRegistration),
        configurable: true
      });

      await service.showTestNotification();

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        '🎂 Birthday Reminder Test',
        jasmine.objectContaining({
          body: 'Notifications are working correctly!',
          tag: 'test-notification'
        })
      );
    });

    it('should handle showNotification error', async () => {
      windowRef.Notification!.permission = 'granted';
      Object.defineProperty(navigator.serviceWorker, 'ready', {
        value: Promise.reject('Error'),
        configurable: true
      });

      await expectAsync(service.showTestNotification()).toBeResolved();
    });
  });

  describe('getStats', () => {
    it('should return stats when supported', () => {
      windowRef.Notification!.permission = 'granted';
      localStorageMock['notificationPermissionRequested'] = 'true';

      const stats = service.getStats();

      expect(stats).toEqual({
        supported: true,
        permission: 'granted',
        hasBeenAsked: true,
        canAskAgain: false
      });
    });

    it('should return canAskAgain true when permission is default', () => {
      windowRef.Notification!.permission = 'default';

      const stats = service.getStats();

      expect(stats.canAskAgain).toBe(true);
    });

    it('should return canAskAgain false when permission is denied', () => {
      windowRef.Notification!.permission = 'denied';

      const stats = service.getStats();

      expect(stats.canAskAgain).toBe(false);
    });

    it('should return supported false when not available', () => {
      delete windowRef.Notification;

      const stats = service.getStats();

      expect(stats.supported).toBe(false);
      windowRef.Notification = { permission: 'default' };
    });
  });

  describe('permissionStatus observable', () => {
    it('should expose permissionStatus observable', (done) => {
      service.permissionStatus.subscribe(status => {
        expect(['default', 'granted', 'denied']).toContain(status);
        done();
      });
    });
  });
});
