import { Injectable, inject, DestroyRef, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Store } from '@ngrx/store';
import { Subscription, interval } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Birthday, ScheduledMessage } from '../../shared/models';
import { parseLocalDate } from '../../shared/utils/date.utils';
import { getAvailableWishLinks } from '../../shared/utils/wish-links.util';
import {
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_FIRE_WINDOW_MS,
  ONE_DAY_MS,
} from '../constants/time.constants';
import { IndexedDBStorageService } from './offline-storage.service';
import { LoggerService } from './logger.service';
import { SenderSettingsService } from './sender-settings.service';
import { NotificationPermissionService } from './notification-permission.service';
import { selectAllBirthdays } from '../store/birthday/birthday.selectors';
import * as BirthdayActions from '../store/birthday/birthday.actions';

export interface BirthdayNotificationData {
  birthdayId: string;
  messageId: string;
  name: string;
  age?: number;
  zodiacSign?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private isNative = Capacitor.isNativePlatform();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly store = inject(Store);
  private browserTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private intervalSubscription?: Subscription;
  private destroyed = false;

  /** In-memory cache kept in sync with the NgRx store — avoids IndexedDB reads during polling. */
  private birthdaysCache: Birthday[] = [];

  private readonly permissionService = inject(NotificationPermissionService);
  private readonly storage = inject(IndexedDBStorageService);
  private readonly logger = inject(LoggerService);
  private readonly senderSettings = inject(SenderSettingsService);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.intervalSubscription?.unsubscribe();
      for (const timeout of this.browserTimeouts.values()) {
        clearTimeout(timeout);
      }
      this.browserTimeouts.clear();
    });
    this.initializeNotifications();
  }


  private async initializeNotifications(): Promise<void> {
    if (!this.isNative) {
      await this.initializeBrowserNotifications();
      return;
    }

    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display === 'granted') {
        await this.setupNotificationListeners();
      }
    } catch (error) {
      this.logger.error('Failed to initialize notifications:', error);
    }
  }

  private async initializeBrowserNotifications(): Promise<void> {
    if (!this.isBrowser) return;

    // Subscribe synchronously BEFORE any await so the cache is always populated
    // before test helpers or application code can call getPendingNotifications().
    // Moving this after an await creates a race condition where setCache() calls
    // in tests (or real data arriving early) get overwritten by the subscription.
    this.store.select(selectAllBirthdays)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(birthdays => { this.birthdaysCache = birthdays; });

    if (this.destroyed) return;

    // Schedule per-birthday timeouts once the store has its first batch of data.
    this.store.select(selectAllBirthdays)
      .pipe(
        filter(birthdays => birthdays.length > 0),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(birthdays => this.scheduleBirthdayTimeouts(birthdays));

    if (this.destroyed) return;

    this.checkBrowserNotifications();

    // Run outside Angular Zone so Zone.js does not track this periodic timer.
    // Change detection is triggered inside the interval callback when needed.
    this.ngZone.runOutsideAngular(() => {
      this.intervalSubscription = interval(NOTIFICATION_POLL_INTERVAL_MS)
        .subscribe(() => this.ngZone.run(() => this.checkBrowserNotifications()));
    });
  }

  private scheduleBirthdayTimeouts(birthdays: Birthday[]): void {
    for (const birthday of birthdays) {
      if (!birthday.scheduledMessages) continue;
      for (const message of birthday.scheduledMessages) {
        if (message.active) {
          this.scheduleBrowserTimeout(birthday, message);
        }
      }
    }
  }

  private checkBrowserNotifications(): void {
    if (!this.isBrowser) return;
    if (!('Notification' in window) || Notification.permission !== 'granted' || !this.permissionService.isNotificationsEnabled()) {
      return;
    }

    const now = new Date();

    for (const birthday of this.birthdaysCache) {
      if (!birthday.scheduledMessages) continue;

      for (const message of birthday.scheduledMessages) {
        if (!message.active) continue;

        if (this.shouldShowBrowserNotification(birthday, message, now)) {
          this.showBrowserNotification(birthday, message);
          this.markBrowserNotificationSent(birthday.id, message.id);
        }
      }
    }
  }

  private shouldShowBrowserNotification(birthday: Birthday, message: ScheduledMessage, now: Date): boolean {
    const birthDate = parseLocalDate(birthday.birthDate);
    const [hours, minutes] = message.scheduledTime.split(':').map(Number);

    const thisYearBirthday = new Date(
      now.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate(),
      hours,
      minutes,
      0,
      0
    );

    const timeDiff = now.getTime() - thisYearBirthday.getTime();
    const isWithinWindow = timeDiff >= 0 && timeDiff < NOTIFICATION_FIRE_WINDOW_MS;

    const lastSent = message.lastSentDate ? new Date(message.lastSentDate) : null;
    const notSentToday = !lastSent ||
      lastSent.getFullYear() !== now.getFullYear() ||
      lastSent.getMonth() !== now.getMonth() ||
      lastSent.getDate() !== now.getDate();

    return isWithinWindow && notSentToday;
  }

  private showBrowserNotification(birthday: Birthday, message: ScheduledMessage): void {
    const body = this.formatMessage(message.message, birthday);
    const wishLinks = getAvailableWishLinks(birthday, message.message, this.senderSettings.getSenderName(), this.senderSettings.getSenderFullName());
    const channelHint = wishLinks.length > 0
      ? `📩 Click to send via: ${wishLinks.map(l => l.label).join(', ')}`
      : '🔔 Click to open app';

    const notification = new Notification(message.title || '🎂 Birthday Reminder', {
      body: channelHint + '\n' + body,
      icon: '/assets/icons/logo-reminder.png',
      tag: `birthday-${birthday.id}-${message.id}`,
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      window.open('/scheduled-messages', '_self');
    };
  }

  /**
   * Marks a notification as sent by dispatching through the store instead of
   * performing a raw IndexedDB read + write. The effect pipeline persists the
   * change to IndexedDB and the store subscription keeps the local cache
   * consistent automatically.
   */
  private markBrowserNotificationSent(birthdayId: string, messageId: string): void {
    this.store.dispatch(BirthdayActions.updateMessageInBirthday({
      birthdayId,
      messageId,
      updates: { lastSentDate: new Date() }
    }));
  }

  private async setupNotificationListeners(): Promise<void> {
    await LocalNotifications.addListener('localNotificationReceived', () => void 0);
    await LocalNotifications.addListener('localNotificationActionPerformed', () => void 0);
  }

  async hasPermission(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch (error) {
      this.logger.error('Failed to check notification permissions:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (error) {
      this.logger.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  async scheduleNotification(
    birthday: Birthday,
    message: ScheduledMessage
  ): Promise<boolean> {
    if (!message.active) return false;

    const scheduledDate = this.getNextNotificationDate(birthday, message);
    if (!scheduledDate) return false;

    if (!this.isNative) {
      this.scheduleBrowserTimeout(birthday, message);
      return true;
    }

    try {
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        return false;
      }

      const notificationId = this.generateNotificationId(birthday.id, message.id);
      const formattedMessage = this.formatMessage(message.message, birthday);

      const options: ScheduleOptions = {
        notifications: [
          {
            id: notificationId,
            title: message.title || '🎂 Birthday Reminder',
            body: formattedMessage,
            schedule: { at: scheduledDate },
            sound: 'default',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            extra: {
              birthdayId: birthday.id,
              messageId: message.id,
              name: birthday.name
            }
          }
        ]
      };

      await LocalNotifications.schedule(options);
      return true;
    } catch (error) {
      this.logger.error('Failed to schedule notification:', error);
      return false;
    }
  }

  private scheduleBrowserTimeout(birthday: Birthday, message: ScheduledMessage): void {
    if (typeof window === 'undefined') return;

    const key = `${birthday.id}-${message.id}`;

    const existing = this.browserTimeouts.get(key);
    if (existing) {
      clearTimeout(existing);
      this.browserTimeouts.delete(key);
    }

    const birthDate = parseLocalDate(birthday.birthDate);
    const now = new Date();
    const [hours, minutes] = message.scheduledTime.split(':').map(Number);

    const scheduledTime = new Date(
      now.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate(),
      hours,
      minutes,
      0,
      0
    );

    const delay = scheduledTime.getTime() - now.getTime();

    if (delay > 0 && delay < ONE_DAY_MS) {
      const timeout = setTimeout(async () => {
        this.browserTimeouts.delete(key);
        if ('Notification' in window && Notification.permission === 'granted' && this.permissionService.isNotificationsEnabled()) {
          this.showBrowserNotification(birthday, message);
          this.markBrowserNotificationSent(birthday.id, message.id);
        }
      }, delay);
      this.browserTimeouts.set(key, timeout);
    }
  }

  async cancelNotification(birthdayId: string, messageId: string): Promise<void> {
    if (!this.isNative) {
      const key = `${birthdayId}-${messageId}`;
      const timeout = this.browserTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.browserTimeouts.delete(key);
      }
      return;
    }

    try {
      const notificationId = this.generateNotificationId(birthdayId, messageId);
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    } catch (error) {
      this.logger.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotificationsForBirthday(birthdayId: string): Promise<void> {
    if (!this.isNative) {
      for (const [key, timeout] of this.browserTimeouts.entries()) {
        if (key.startsWith(`${birthdayId}-`)) {
          clearTimeout(timeout);
          this.browserTimeouts.delete(key);
        }
      }
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      const toCancel = pending.notifications
        .filter(n => n.extra?.birthdayId === birthdayId)
        .map(n => ({ id: n.id }));

      if (toCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: toCancel });
      }
    } catch (error) {
      this.logger.error('Failed to cancel all notifications for birthday:', error);
    }
  }

  async rescheduleAllNotifications(): Promise<void> {
    if (!this.isNative) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
      }

      const birthdays = await this.storage.getBirthdays();

      for (const birthday of birthdays) {
        if (!birthday.scheduledMessages) continue;

        for (const message of birthday.scheduledMessages) {
          if (message.active) {
            await this.scheduleNotification(birthday, message);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to reschedule notifications:', error);
    }
  }

  private getNextNotificationDate(birthday: Birthday, message: ScheduledMessage): Date | null {
    const now = new Date();
    const birthDate = parseLocalDate(birthday.birthDate);

    const [hours, minutes] = message.scheduledTime.split(':').map(Number);

    let thisYearBirthday = new Date(
      now.getFullYear(),
      birthDate.getMonth(),
      birthDate.getDate(),
      hours,
      minutes,
      0,
      0
    );

    if (thisYearBirthday <= now) {
      thisYearBirthday = new Date(
        now.getFullYear() + 1,
        birthDate.getMonth(),
        birthDate.getDate(),
        hours,
        minutes,
        0,
        0
      );
    }

    return thisYearBirthday;
  }

  private generateNotificationId(birthdayId: string, messageId: string): number {
    const combined = `${birthdayId}-${messageId}`;
    // FNV-1a 32-bit: uses Math.imul for guaranteed 32-bit integer multiplication
    // and >>> 0 to keep the result as an unsigned 32-bit integer.
    // This avoids float64 intermediate values that can cause inconsistencies.
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0; // FNV prime
    }
    return hash;
  }

  private formatMessage(template: string, birthday: Birthday): string {
    const age = this.calculateAge(birthday.birthDate);

    return template
      .replace(/\{name\}/g, birthday.name)
      .replace(/\{age\}/g, age?.toString() || '')
      .replace(/\{zodiac\}/g, birthday.zodiacSign || '')
      .replace(/\{sender\}/g, this.senderSettings.getSenderName())
      .replace(/\{senderFull\}/g, this.senderSettings.getSenderFullName() || this.senderSettings.getSenderName());
  }

  private calculateAge(birthDate: string): number | null {
    const today = new Date();
    const birth = parseLocalDate(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  getScheduledNotificationsCount(): number {
    if (!this.isNative) {
      let count = 0;
      for (const birthday of this.birthdaysCache) {
        if (birthday.scheduledMessages) {
          count += birthday.scheduledMessages.filter(m => m.active).length;
        }
      }
      return count;
    }
    // For native, the caller must use the async variant below.
    return 0;
  }

  async getScheduledNotificationsCountAsync(): Promise<number> {
    if (!this.isNative) {
      return this.getScheduledNotificationsCount();
    }

    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications.length;
    } catch (error) {
      this.logger.error('Failed to get scheduled notifications count (native):', error);
      return 0;
    }
  }

  async getPendingNotifications(): Promise<{
    id: number;
    title: string;
    body: string;
    scheduledAt: Date;
    birthdayId?: string;
  }[]> {
    if (!this.isNative) {
      const notifications: {
        id: number;
        title: string;
        body: string;
        scheduledAt: Date;
        birthdayId?: string;
      }[] = [];

      for (const birthday of this.birthdaysCache) {
        if (!birthday.scheduledMessages) continue;
        for (const message of birthday.scheduledMessages) {
          if (!message.active) continue;
          const scheduledDate = this.getNextNotificationDate(birthday, message);
          if (scheduledDate) {
            notifications.push({
              id: this.generateNotificationId(birthday.id, message.id),
              title: message.title || '🎂 Birthday Reminder',
              body: this.formatMessage(message.message, birthday),
              scheduledAt: scheduledDate,
              birthdayId: birthday.id
            });
          }
        }
      }
      return notifications.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }

    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications.map(n => ({
        id: n.id,
        title: n.title || '',
        body: n.body || '',
        scheduledAt: n.schedule?.at ? new Date(n.schedule.at) : new Date(),
        birthdayId: n.extra?.birthdayId
      }));
    } catch (error) {
      this.logger.error('Failed to get pending notifications (native):', error);
      return [];
    }
  }
}
