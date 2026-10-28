import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import type { MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../../testing/translate-testing';
import { type NotificationMessage, NotificationService } from '../../core/services/notification.service';
import { NotificationComponent } from './notification.component';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;
  let mockNotificationService: MockedObject<NotificationService>;
  let notificationsSubject: BehaviorSubject<NotificationMessage[]>;

  beforeEach(async () => {
    notificationsSubject = new BehaviorSubject<NotificationMessage[]>([]);
    mockNotificationService = {
      remove: vi.fn().mockName('NotificationService.remove'),
      notifications: notificationsSubject.asObservable()
    } as unknown as MockedObject<NotificationService>;

    await TestBed.configureTestingModule({
      imports: [NotificationComponent, NoopAnimationsModule],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        provideTranslateTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getIcon', () => {
    it('should return check_circle for success', () => {
      expect(component.getIcon('success')).toBe('check_circle');
    });

    it('should return error for error', () => {
      expect(component.getIcon('error')).toBe('error');
    });

    it('should return warning for warning', () => {
      expect(component.getIcon('warning')).toBe('warning');
    });

    it('should return info for info', () => {
      expect(component.getIcon('info')).toBe('info');
    });

    it('should return info for unknown type', () => {
      expect(component.getIcon('unknown')).toBe('info');
    });

    it('should return info for empty string', () => {
      expect(component.getIcon('')).toBe('info');
    });
  });

  describe('close', () => {
    it('should call notificationService.remove with notification id', () => {
      const notificationId = 'test-123';

      component.close(notificationId);

      expect(mockNotificationService.remove).toHaveBeenCalledWith(notificationId);
    });

    it('should call remove for multiple different ids', () => {
      component.close('id-1');
      component.close('id-2');

      expect(mockNotificationService.remove).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.remove).toHaveBeenCalledWith('id-1');
      expect(mockNotificationService.remove).toHaveBeenCalledWith('id-2');
    });
  });

  describe('trackByNotification', () => {
    it('should return notification id', () => {
      const notification: NotificationMessage = {
        id: 'test-id-123',
        message: 'Test message',
        type: 'info'
      };

      const result = component.trackByNotification(0, notification);

      expect(result).toBe('test-id-123');
    });

    it('should return correct id for different notifications', () => {
      const notification1: NotificationMessage = {
        id: 'id-1',
        message: 'Message 1',
        type: 'success'
      };
      const notification2: NotificationMessage = {
        id: 'id-2',
        message: 'Message 2',
        type: 'error'
      };

      expect(component.trackByNotification(0, notification1)).toBe('id-1');
      expect(component.trackByNotification(1, notification2)).toBe('id-2');
    });
  });

  describe('handleAction', () => {
    it('should invoke action callback and remove notification', () => {
      const callbackSpy = vi.fn();
      const notification: NotificationMessage = {
        id: 'action-id',
        message: 'Test',
        type: 'error',
        action: { label: 'Retry', callback: callbackSpy }
      };

      component.handleAction(notification);

      expect(callbackSpy).toHaveBeenCalled();
      expect(mockNotificationService.remove).toHaveBeenCalledWith('action-id');
    });
  });

  describe('notifications$ observable', () => {
    it('should be defined', () => {
      expect(component.notifications$).toBeDefined();
    });

    it('should receive notifications from service', async () => {
      const testNotifications: NotificationMessage[] = [
        { id: '1', message: 'Test 1', type: 'success' },
        { id: '2', message: 'Test 2', type: 'error' }
      ];

      component.notifications$.subscribe(notifications => {
        if (notifications.length > 0) {
          expect(notifications).toEqual(testNotifications);
        }
      });

      notificationsSubject.next(testNotifications);
    });
  });

  describe('template', () => {
    const show = async (notifications: NotificationMessage[]) => {
      notificationsSubject.next(notifications);
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    };

    it('should render one toast per notification with its type, icon and message', async () => {
      const el = await show([
        { id: '1', message: 'Saved', type: 'success' },
        { id: '2', message: 'Failed', type: 'error' },
      ]);

      const toasts = el.querySelectorAll('[data-testid="notification"]');
      expect(toasts).toHaveLength(2);
      expect(toasts[0].classList).toContain('notification-success');
      expect(toasts[0].querySelector('.notification-icon')?.textContent?.trim()).toBe('check_circle');
      expect(toasts[1].querySelector('.notification-message')?.textContent).toBe('Failed');
    });

    it('should show the action button only when the notification has an action', async () => {
      const callback = vi.fn();
      const el = await show([
        { id: '1', message: 'Plain', type: 'info' },
        { id: '2', message: 'Offline', type: 'warning', action: { label: 'Retry', callback } },
      ]);

      const actions = el.querySelectorAll<HTMLButtonElement>('[data-testid="notification-action"]');
      expect(actions).toHaveLength(1);
      expect(actions[0].textContent?.trim()).toBe('Retry');

      actions[0].click();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.remove).toHaveBeenCalledWith('2');
    });

    it('should remove the notification when its close button is clicked', async () => {
      const el = await show([{ id: 'n-1', message: 'Hello', type: 'info' }]);

      el.querySelector<HTMLButtonElement>('[data-testid="close-notification"]')?.click();

      expect(mockNotificationService.remove).toHaveBeenCalledWith('n-1');
    });
  });
});
