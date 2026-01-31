import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoggerService } from './logger.service';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

@Injectable({
  providedIn: 'root'
})
export class NotificationPermissionService {
  private permissionStatus$ = new BehaviorSubject<NotificationPermissionStatus>(this.getCurrentPermission());

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private logger: LoggerService
  ) {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then(permissionStatus => {
          permissionStatus.onchange = () => {
            this.permissionStatus$.next(this.getCurrentPermission());
          };
        })
        .catch(() => void 0);
    }
  }

  get permissionStatus(): Observable<NotificationPermissionStatus> {
    return this.permissionStatus$.asObservable();
  }

  isSupported(): boolean {
    return 'Notification' in window &&
           typeof Notification.requestPermission === 'function' &&
           'serviceWorker' in navigator;
  }


  getCurrentPermission(): NotificationPermissionStatus {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission as NotificationPermissionStatus;
  }


  hasPermission(): boolean {
    return this.getCurrentPermission() === 'granted';
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if (this.getCurrentPermission() === 'granted') {
      return true;
    }

    if (this.getCurrentPermission() === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus$.next(permission as NotificationPermissionStatus);

      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('notificationPermissionRequested', 'true');
        localStorage.setItem('notificationPermissionGranted', (permission === 'granted').toString());
      }

      return permission === 'granted';
    } catch (error) {
      this.logger.error('Failed to request notification permission:', error);
      return false;
    }
  }

  hasBeenAsked(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return localStorage.getItem('notificationPermissionRequested') === 'true';
  }

  async showTestNotification(): Promise<void> {
    if (!this.hasPermission()) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('🎂 Birthday Reminder Test', {
        body: 'Notifications are working correctly!',
        icon: '/assets/icons/logo-reminder.png',
        tag: 'test-notification',
        requireInteraction: true,
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 'test'
        }
      } as NotificationOptions);
    } catch (error) {
      this.logger.error('Failed to show test notification:', error);
    }
  }

  getStats(): {
    supported: boolean;
    permission: NotificationPermissionStatus;
    hasBeenAsked: boolean;
    canAskAgain: boolean;
  } {
    const permission = this.getCurrentPermission();
    return {
      supported: this.isSupported(),
      permission,
      hasBeenAsked: this.hasBeenAsked(),
      canAskAgain: permission === 'default'
    };
  }
}
