import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService, NotificationMessage } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = TestBed.inject(NotificationService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should add notification with default values', (done) => {
    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0]).toEqual(
          jasmine.objectContaining({
            message: 'test',
            type: 'info',
            duration: 0,
            id: jasmine.any(String)
          })
        );
        done();
      }
    });

    service.show('test');
  });

  it('should add notification with custom values', (done) => {
    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0].type).toBe('error');
        expect(notifications[0].duration).toBe(5000);
        done();
      }
    });

    service.show('error test', 'error', 5000);
  });

  it('should remove notification by id', (done) => {
    service.show('test');

    let callCount = 0;
    service.notifications.subscribe(notifications => {
      callCount++;
      if (callCount === 1) {
        expect(notifications.length).toBe(1);
        service.remove(notifications[0].id);
      } else if (callCount === 2) {
        expect(notifications.length).toBe(0);
        done();
      }
    });
  });

  it('should auto-remove notification after duration', fakeAsync(() => {
    let notifications: NotificationMessage[] = [];
    service.notifications.subscribe(n => notifications = n);

    service.show('test', 'info', 1000);
    expect(notifications.length).toBe(1);

    tick(1000);
    expect(notifications.length).toBe(0);
  }));

  it('should not auto-remove when duration is 0', fakeAsync(() => {
    let notifications: NotificationMessage[] = [];
    service.notifications.subscribe(n => notifications = n);

    service.show('test', 'info', 0);
    tick(5000);

    expect(notifications.length).toBe(1);
  }));

  it('should store action when provided', (done) => {
    const action = { label: 'Retry', callback: jasmine.createSpy('callback') };

    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0].action).toEqual(jasmine.objectContaining({ label: 'Retry' }));
        done();
      }
    });

    service.show('test', 'error', undefined, action);
  });

  it('should not include action field when not provided', (done) => {
    service.notifications.subscribe(notifications => {
      if (notifications.length) {
        expect(notifications[0].action).toBeUndefined();
        done();
      }
    });

    service.show('test', 'error');
  });
});
