import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import type { MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../../testing/translate-testing';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { SecureStorageService } from '../../core/services/secure-storage.service';
import { NotificationPermissionBannerComponent } from './notification-permission-banner.component';

describe('NotificationPermissionBannerComponent', () => {
  let component: NotificationPermissionBannerComponent;
  let fixture: ComponentFixture<NotificationPermissionBannerComponent>;
  let mockPermissionService: MockedObject<NotificationPermissionService>;
  let mockSecureStorage: MockedObject<SecureStorageService>;
  let permissionStatusSubject: BehaviorSubject<NotificationPermission>;

  beforeEach(async () => {
    permissionStatusSubject = new BehaviorSubject<NotificationPermission>('default');
    mockPermissionService = {
      isSupported: vi.fn().mockName('NotificationPermissionService.isSupported'),
      getCurrentPermission: vi.fn().mockName('NotificationPermissionService.getCurrentPermission'),
      requestPermission: vi.fn().mockName('NotificationPermissionService.requestPermission'),
      showTestNotification: vi.fn().mockName('NotificationPermissionService.showTestNotification'),
      permissionStatus: permissionStatusSubject.asObservable()
    } as unknown as MockedObject<NotificationPermissionService>;

    mockPermissionService.isSupported.mockReturnValue(true);
    mockPermissionService.getCurrentPermission.mockReturnValue('default');
    mockPermissionService.requestPermission.mockReturnValue(Promise.resolve(true));
    mockPermissionService.showTestNotification.mockReturnValue(Promise.resolve());

    mockSecureStorage = {
      setItem: vi.fn().mockName('SecureStorageService.setItem'),
      getItem: vi.fn().mockName('SecureStorageService.getItem'),
      removeItem: vi.fn().mockName('SecureStorageService.removeItem')
    } as unknown as MockedObject<SecureStorageService>;
    mockSecureStorage.setItem.mockReturnValue(Promise.resolve());
    mockSecureStorage.getItem.mockReturnValue(Promise.resolve(null));
    mockSecureStorage.removeItem.mockReturnValue(Promise.resolve());

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
      mockPermissionService.isSupported.mockReturnValue(false);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show banner when permission is granted', async () => {
      mockPermissionService.getCurrentPermission.mockReturnValue('granted');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(false);
    });

    it('should still show banner (denied variant) when permission is denied', async () => {
      mockPermissionService.getCurrentPermission.mockReturnValue('denied');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(true);
      expect(component.isDenied()).toBe(true);
    });

    it('should not mark isDenied when permission is default', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.isDenied()).toBe(false);
    });

    it('should not show banner when dismissed recently', async () => {
      const recentTimestamp = Date.now() - (1000 * 60 * 60);
      mockSecureStorage.getItem.mockReturnValue(Promise.resolve(recentTimestamp.toString()));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(false);
    });

    it('should show banner when dismissed more than 7 days ago', async () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
      mockSecureStorage.getItem.mockReturnValue(Promise.resolve(oldTimestamp.toString()));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(true);
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('notificationBannerDismissed');
    });

    it('should update shouldShow when permission status changes', async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.shouldShow()).toBe(true);

      mockPermissionService.getCurrentPermission.mockReturnValue('granted');
      permissionStatusSubject.next('granted');

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(component.shouldShow()).toBe(false);
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
      mockPermissionService.requestPermission.mockReturnValue(Promise.resolve(true));
      await component.requestPermission();
      expect(mockPermissionService.showTestNotification).toHaveBeenCalled();
    });

    it('should not show test notification when permission denied', async () => {
      mockPermissionService.requestPermission.mockReturnValue(Promise.resolve(false));
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

      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('notificationBannerDismissed', expect.any(String));
      const savedTimestamp = parseInt(vi.mocked(mockSecureStorage.setItem).mock.lastCall![1] as string);
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

  describe('denied permission variant', () => {
    beforeEach(async () => {
      mockPermissionService.getCurrentPermission.mockReturnValue('denied');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should not render the Enable Notifications button', () => {
      const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
      const labels = Array.from(buttons).map(b => b.textContent?.trim());
      expect(labels.some(l => l?.includes('Enable Notifications'))).toBe(false);
    });

    it('should render the "Got it" dismiss button instead of "Maybe Later"', () => {
      const dismissBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="dismiss-notification-banner"]');
      expect(dismissBtn.textContent?.trim()).toContain('Got it');
    });

    it('should apply the denied styling class to the card', () => {
      const card: HTMLElement = fixture.nativeElement.querySelector('.permission-card');
      expect(card.classList.contains('denied')).toBe(true);
    });

    it('dismiss() should still work and hide the banner', () => {
      component.dismiss();
      fixture.detectChanges();
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
