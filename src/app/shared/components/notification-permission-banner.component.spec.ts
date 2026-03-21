import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationPermissionBannerComponent } from './notification-permission-banner.component';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { BehaviorSubject } from 'rxjs';

describe('NotificationPermissionBannerComponent', () => {
  let component: NotificationPermissionBannerComponent;
  let fixture: ComponentFixture<NotificationPermissionBannerComponent>;
  let mockPermissionService: jasmine.SpyObj<NotificationPermissionService>;
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

    await TestBed.configureTestingModule({
      imports: [NotificationPermissionBannerComponent],
      providers: [
        { provide: NotificationPermissionService, useValue: mockPermissionService },
        provideTranslateTesting()
      ]
    }).compileComponents();

    localStorage.clear();

    fixture = TestBed.createComponent(NotificationPermissionBannerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should show banner when supported and permission is default', () => {
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(true);
    });

    it('should not show banner when not supported', () => {
      mockPermissionService.isSupported.and.returnValue(false);
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show banner when permission is granted', () => {
      mockPermissionService.getCurrentPermission.and.returnValue('granted');
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show banner when permission is denied', () => {
      mockPermissionService.getCurrentPermission.and.returnValue('denied');
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show banner when dismissed recently', () => {
      const recentTimestamp = Date.now() - (1000 * 60 * 60);
      localStorage.setItem('notificationBannerDismissed', recentTimestamp.toString());
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(false);
    });

    it('should show banner when dismissed more than 7 days ago', () => {
      const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
      localStorage.setItem('notificationBannerDismissed', oldTimestamp.toString());
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(true);
      expect(localStorage.getItem('notificationBannerDismissed')).toBeNull();
    });

    it('should update shouldShow when permission status changes', (done) => {
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(true);

      mockPermissionService.getCurrentPermission.and.returnValue('granted');
      permissionStatusSubject.next('granted');

      setTimeout(() => {
        expect(component.shouldShow()).toBe(false);
        done();
      }, 50);
    });
  });

  describe('cleanup', () => {
    it('should use DestroyRef for subscription cleanup', () => {
      fixture.detectChanges();
      expect(component['destroyRef']).toBeTruthy();
    });
  });

  describe('requestPermission', () => {
    beforeEach(() => {
      fixture.detectChanges();
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
    beforeEach(() => {
      fixture.detectChanges();
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

    it('should save dismissed timestamp to localStorage', () => {
      const beforeTimestamp = Date.now();
      component.dismiss();
      const savedTimestamp = localStorage.getItem('notificationBannerDismissed');

      expect(savedTimestamp).toBeTruthy();
      const timestamp = parseInt(savedTimestamp!);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should update component state correctly', () => {
      component.shouldShow.set(true);
      component['dismissed'] = false;
      component.dismiss();
      expect(component['dismissed']).toBe(true);
      expect(component.shouldShow()).toBe(false);
    });
  });
});
