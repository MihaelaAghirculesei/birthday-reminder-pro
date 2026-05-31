import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Store } from '@ngrx/store';

import { filter, take } from 'rxjs/operators';

import { type Birthday, type ScheduledMessage } from '../../shared/models';
import { parseLocalDate } from '../../shared/utils/date.utils';
import { getAvailableWishLinks } from '../../shared/utils/wish-links.util';
import { NOTIFICATION_FIRE_WINDOW_MS, ONE_DAY_MS } from '../constants/time.constants';
import * as BirthdayActions from '../store/birthday/birthday.actions';
import { selectAllBirthdays } from '../store/birthday/birthday.selectors';
import { NotificationFormatterService } from './notification-formatter.service';
import { NotificationPermissionService } from './notification-permission.service';
import { SenderSettingsService } from './sender-settings.service';

export interface PendingBrowserNotification {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
  birthdayId?: string;
}

/**
 * Browser-only notification scheduling via setTimeout and periodic polling.
 * Owns the birthday cache (kept in sync with the NgRx store) so that callers
 * never need to perform raw IndexedDB reads at poll time.
 */
@Injectable({ providedIn: 'root' })
export class BrowserNotificationSchedulerService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(Store);
  private readonly permissionService = inject(NotificationPermissionService);
  private readonly formatter = inject(NotificationFormatterService);
  private readonly senderSettings = inject(SenderSettingsService);

  private readonly browserTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * In-memory cache kept in sync with the NgRx store.
   * Exposed as public so tests can seed it without going through NgRx.
   */
  birthdaysCache: Birthday[] = [];

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      for (const timeout of this.browserTimeouts.values()) {
        clearTimeout(timeout);
      }
      this.browserTimeouts.clear();
    });

    // Subscribe synchronously (before any await) so the cache is always
    // populated before callers reach getPendingNotifications().
    this.store
      .select(selectAllBirthdays)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(birthdays => { this.birthdaysCache = birthdays; });
  }

  /** Wire up initial per-birthday timeouts. Call after user grants permission. */
  async init(): Promise<void> {
    if (!this.isBrowser) return;

    this.store
      .select(selectAllBirthdays)
      .pipe(
        filter(birthdays => birthdays.length > 0),
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(birthdays => this.scheduleBirthdayTimeouts(birthdays));
  }

  /** Call this from a user-initiated click to request browser notification permission. */
  async requestPermissionOnUserAction(): Promise<boolean> {
    return this.permissionService.requestPermission();
  }

  scheduleBirthdayTimeouts(birthdays: Birthday[]): void {
    for (const birthday of birthdays) {
      if (!birthday.scheduledMessages) continue;
      for (const message of birthday.scheduledMessages) {
        if (message.active) {
          this.scheduleBrowserTimeout(birthday, message);
        }
      }
    }
  }

  checkBrowserNotifications(): void {
    if (!this.isBrowser) return;
    if (
      !('Notification' in window) ||
      Notification.permission !== 'granted' ||
      !this.permissionService.isNotificationsEnabled()
    ) {
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

  shouldShowBrowserNotification(birthday: Birthday, message: ScheduledMessage, now: Date): boolean {
    const birthDate = parseLocalDate(birthday.birthDate);
    const [hours, minutes] = message.scheduledTime.split(':').map(Number);

    const thisYearBirthday = new Date(
      now.getFullYear(), birthDate.getMonth(), birthDate.getDate(),
      hours, minutes, 0, 0
    );

    const timeDiff = now.getTime() - thisYearBirthday.getTime();
    const isWithinWindow = timeDiff >= 0 && timeDiff < NOTIFICATION_FIRE_WINDOW_MS;

    const lastSent = message.lastSentDate ? new Date(message.lastSentDate) : null;
    const notSentToday =
      !lastSent ||
      lastSent.getFullYear() !== now.getFullYear() ||
      lastSent.getMonth() !== now.getMonth() ||
      lastSent.getDate() !== now.getDate();

    return isWithinWindow && notSentToday;
  }

  showBrowserNotification(birthday: Birthday, message: ScheduledMessage): void {
    const body = this.formatter.formatMessage(message.message, birthday);
    const wishLinks = getAvailableWishLinks(
      birthday,
      message.message,
      this.senderSettings.getSenderName(),
      this.senderSettings.getSenderFullName()
    );
    const channelHint =
      wishLinks.length > 0
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

  scheduleBrowserTimeout(birthday: Birthday, message: ScheduledMessage): void {
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
      now.getFullYear(), birthDate.getMonth(), birthDate.getDate(),
      hours, minutes, 0, 0
    );

    const delay = scheduledTime.getTime() - now.getTime();
    if (delay > 0 && delay < ONE_DAY_MS) {
      const timeout = setTimeout(() => {
        this.browserTimeouts.delete(key);
        if (
          'Notification' in window &&
          Notification.permission === 'granted' &&
          this.permissionService.isNotificationsEnabled()
        ) {
          this.showBrowserNotification(birthday, message);
          this.markBrowserNotificationSent(birthday.id, message.id);
        }
      }, delay);
      this.browserTimeouts.set(key, timeout);
    }
  }

  cancelBrowserNotification(birthdayId: string, messageId: string): void {
    const key = `${birthdayId}-${messageId}`;
    const timeout = this.browserTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.browserTimeouts.delete(key);
    }
  }

  cancelAllBrowserNotificationsForBirthday(birthdayId: string): void {
    for (const [key, timeout] of this.browserTimeouts.entries()) {
      if (key.startsWith(`${birthdayId}-`)) {
        clearTimeout(timeout);
        this.browserTimeouts.delete(key);
      }
    }
  }

  getScheduledCount(): number {
    let count = 0;
    for (const birthday of this.birthdaysCache) {
      if (birthday.scheduledMessages) {
        count += birthday.scheduledMessages.filter(m => m.active).length;
      }
    }
    return count;
  }

  getPendingNotifications(): PendingBrowserNotification[] {
    const notifications: PendingBrowserNotification[] = [];

    for (const birthday of this.birthdaysCache) {
      if (!birthday.scheduledMessages) continue;
      for (const message of birthday.scheduledMessages) {
        if (!message.active) continue;
        const scheduledAt = this.formatter.getNextNotificationDate(birthday, message);
        if (scheduledAt) {
          notifications.push({
            id: this.formatter.generateNotificationId(birthday.id, message.id),
            title: message.title || '🎂 Birthday Reminder',
            body: this.formatter.formatMessage(message.message, birthday),
            scheduledAt,
            birthdayId: birthday.id
          });
        }
      }
    }

    return notifications.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  private markBrowserNotificationSent(birthdayId: string, messageId: string): void {
    this.store.dispatch(
      BirthdayActions.updateMessageInBirthday({
        birthdayId,
        messageId,
        updates: { lastSentDate: new Date() }
      })
    );
  }
}
