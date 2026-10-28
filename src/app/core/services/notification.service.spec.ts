import { TestBed } from '@angular/core/testing';

import { type NotificationMessage, NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = TestBed.inject(NotificationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should add notification with default values', async () => {
    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0]).toEqual(expect.objectContaining({
          message: 'test',
          type: 'info',
          duration: 0,
          id: expect.any(String)
        }));
      }
    });

    service.show('test');
  });

  it('should add notification with custom values', async () => {
    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0].type).toBe('error');
        expect(notifications[0].duration).toBe(5000);
      }
    });

    service.show('error test', 'error', 5000);
  });

  it('should remove notification by id', async () => {
    service.show('test');

    let callCount = 0;
    service.notifications.subscribe(notifications => {
      callCount++;
      if (callCount === 1) {
        expect(notifications.length).toBe(1);
        service.remove(notifications[0].id);
      }
      else if (callCount === 2) {
        expect(notifications.length).toBe(0);
      }
    });
  });

  it('should auto-remove notification after duration', async () => {
    vi.useFakeTimers();
    let notifications: NotificationMessage[] = [];
    service.notifications.subscribe(n => notifications = n);

    service.show('test', 'info', 1000);
    expect(notifications.length).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(notifications.length).toBe(0);
  });

  it('should not auto-remove when duration is 0', async () => {
    vi.useFakeTimers();
    let notifications: NotificationMessage[] = [];
    service.notifications.subscribe(n => notifications = n);

    service.show('test', 'info', 0);
    await vi.advanceTimersByTimeAsync(5000);

    expect(notifications.length).toBe(1);
  });

  it('should store action when provided', async () => {
    const action = { label: 'Retry', callback: vi.fn() };

    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0].action).toEqual(expect.objectContaining({ label: 'Retry' }));
      }
    });

    service.show('test', 'error', undefined, action);
  });

  it('should not include action field when not provided', async () => {
    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0].action).toBeUndefined();
      }
    });

    service.show('test', 'error');
  });
});
