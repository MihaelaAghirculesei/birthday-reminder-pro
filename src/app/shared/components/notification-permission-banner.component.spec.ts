import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationPermissionBannerComponent } from './notification-permission-banner.component';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { SecureStorageService } from '../../core/services/secure-storage.service';
import { BehaviorSubject } from 'rxjs';

describe('NotificationPermissionBannerComponent', () => {
  let component: NotificationPermissionBannerComponent;
  let fixture: ComponentFixture<NotificationPermissionBannerComponent>;
  let mockPermissionService: jasmine.SpyObj<NotificationPermissionService>;
  let mockSecureStorage: jasmine.SpyObj<SecureStorageService>;
  let permissionStatusSubject: BehaviorSubject<NotificationPermission>;

  beforeEach(async () => {
    permissionStatusSubject = new BehaviorSubject<NotificationPermission>('default');
    mockPermissionService = jasmine.createSpyObj('NotificationPermissionService', [
      'isSupported',
      'getCurrentPermission',
      'requestPermission',
      'showTestNotification'
    ], {
      permissionStatus: permissionStatusSubject.asObservable()
    });

    mockPermissionService.isSupported.and.returnValue(true);
    mockPermissionService.getCurrentPermission.and.returnValue('default');
    mockPermissionService.requestPermission.and.returnValue(Promise.resolve(true));
    mockPermissionService.showTestNotification.and.returnValue(Promise.resolve());

    mockSecureStorage = jasmine.createSpyObj('SecureStorageService', ['setItem', 'getItem', 'removeItem']);
    mockSecureStorage.setItem.and.returnValue(Promise.resolve());
    mockSecureStorage.getItem.and.returnValue(Promise.resolve(null));
    mockSecureStorage.removeItem.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [NotificationPermissionBannerComponent],
      providers: [
        { provide: NotificationPermissionService, useValue: mockPermissionService },
        { provide: SecureStorageService, useValue: mockSecureStorage },
        provideTranslateTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPermissionBannerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should show banner when supported and permission is default', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(true);
    });

    it('should not show banner when not supported', async () => {
      mockPermissionService.isSupported.and.returnValue(false);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show banner when permission is granted', async () => {
      mockPermissionService.getCurrentPermission.and.returnValue('granted');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show banner when permission is denied', async () => {
      mockPermissionService.getCurrentPermission.and.returnValue('denied');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show banner when dismissed recently', async () => {
      const recentTimestamp = Date.now() - (1000 * 60 * 60);
      mockSecureStorage.getItem.and.returnValue(Promise.resolve(recentTimestamp.toString()));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(false);
    });

    it('should show banner when dismissed more than 7 days ago', async () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
      mockSecureStorage.getItem.and.returnValue(Promise.resolve(oldTimestamp.toString()));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(true);
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('notificationBannerDismissed');
    });

    it('should update shouldShow when permission status changes', (done) => {
      fixture.detectChanges();
      fixture.whenStable().then(() => {
        expect(component.shouldShow()).toBe(true);

        mockPermissionService.getCurrentPermission.and.returnValue('granted');
        permissionStatusSubject.next('granted');

        setTimeout(() => {
          expect(component.shouldShow()).toBe(false);
          done();
        }, 50);
      });
    });
  });

  describe('cleanup', () => {
    it('should use DestroyRef for subscription cleanup', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component['destroyRef']).toBeTruthy();
    });
  });

  describe('requestPermission', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should set isRequesting to true during request', async () => {
      const requestPromise = component.requestPermission();
      expect(component.isRequesting()).toBe(true);
      await requestPromise;
    });

    it('should call permissionService.requestPermission', async () => {
      await component.requestPermission();
      expect(mockPermissionService.requestPermission).toHaveBeenCalled();
    });

    it('should show test notification when permission granted', async () => {
      mockPermissionService.requestPermission.and.returnValue(Promise.resolve(true));
      await component.requestPermission();
      expect(mockPermissionService.showTestNotification).toHaveBeenCalled();
    });

    it('should not show test notification when permission denied', async () => {
      mockPermissionService.requestPermission.and.returnValue(Promise.resolve(false));
      await component.requestPermission();
      expect(mockPermissionService.showTestNotification).not.toHaveBeenCalled();
    });

    it('should set isRequesting to false after completion', async () => {
      await component.requestPermission();
      expect(component.isRequesting()).toBe(false);
    });
  });

  describe('dismiss', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
    });

    it('should set dismissed to true', () => {
      component.dismiss();
      expect(component['dismissed']).toBe(true);
    });

    it('should set shouldShow to false', () => {
      component.shouldShow.set(true);
      component.dismiss();
      expect(component.shouldShow()).toBe(false);
    });

    it('should save dismissed timestamp to secure storage', () => {
      const beforeTimestamp = Date.now();
      component.dismiss();

      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'notificationBannerDismissed',
        jasmine.any(String)
      );
      const savedTimestamp = parseInt(mockSecureStorage.setItem.calls.mostRecent().args[1] as string);
      expect(savedTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(savedTimestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should update component state correctly', () => {
      component.shouldShow.set(true);
      component['dismissed'] = false;
      component.dismiss();
      expect(component['dismissed']).toBe(true);
      expect(component.shouldShow()).toBe(false);
    });
  });

  describe('accessibility', () => {
    beforeEach(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges(); // flush signal-driven re-render after async ngOnInit
    });

    it('should have an aria-live="polite" container always present in the DOM', () => {
      const liveRegion: HTMLElement = fixture.nativeElement.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
    });

    it('should have aria-atomic="true" on the live region', () => {
      const liveRegion: HTMLElement = fixture.nativeElement.querySelector('[aria-live="polite"]');
      expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
    });

    it('should have role="region" on the visible banner', () => {
      const banner: HTMLElement = fixture.nativeElement.querySelector('[data-testid="notification-banner"]');
      expect(banner).not.toBeNull();
      expect(banner.getAttribute('role')).toBe('region');
    });

    it('should have aria-label on the visible banner', () => {
      const banner: HTMLElement = fixture.nativeElement.querySelector('[data-testid="notification-banner"]');
      const label = banner.getAttribute('aria-label');
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    });

    it('should keep aria-live container in DOM even when banner is hidden', () => {
      component.dismiss();
      fixture.detectChanges();

      expect(component.shouldShow()).toBe(false);
      const liveRegion: HTMLElement = fixture.nativeElement.querySelector('[aria-live="polite"]');
      expect(liveRegion).not.toBeNull();
    });

    it('Enable Notifications button should be a native <button> element', () => {
      const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
      const labels = Array.from(buttons).map(b => b.textContent?.trim());
      expect(labels.some(l => l?.includes('Enable Notifications'))).toBe(true);
    });

    it('dismiss button should be a native <button> element', () => {
      const dismissBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dismiss-notification-banner"]');
      expect(dismissBtn.tagName.toLowerCase()).toBe('button');
    });
  });
});
