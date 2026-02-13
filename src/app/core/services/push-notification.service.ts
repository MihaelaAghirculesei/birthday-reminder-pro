import { Injectable, inject, DestroyRef } from '@angular/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Birthday, ScheduledMessage } from '../../shared/models';
import { getAvailableWishLinks } from '../../shared/utils/wish-links.util';
import { IndexedDBStorageService } from './offline-storage.service';
import { LoggerService } from './logger.service';
import { SenderSettingsService } from './sender-settings.service';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly destroy$ = new Subject<void>();
  private browserTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private storage: IndexedDBStorageService,
    private logger: LoggerService,
    private senderSettings: SenderSettingsService
  ) {
    try {
      this.destroyRef.onDestroy(() => {
        this.destroy$.next();
        this.destroy$.complete();
        // Clear all browser timeouts
        for (const timeout of this.browserTimeouts.values()) {
          clearTimeout(timeout);
        }
        this.browserTimeouts.clear();
      });
    } catch {
      // Guard against destroyed injector in test environments
    }
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
    if (typeof window === 'undefined') return;

    if ('Notification' in window &&
        typeof Notification.requestPermission === 'function' &&
        Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Schedule precise timeouts for today's messages
    await this.scheduleAllBrowserTimeouts();

    // Fallback polling every 30s with wider window
    this.checkBrowserNotifications();

    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkBrowserNotifications());
  }

  private async scheduleAllBrowserTimeouts(): Promise<void> {
    try {
      const birthdays = await this.storage.getBirthdays();
      for (const birthday of birthdays) {
        if (!birthday.scheduledMessages) continue;
        for (const message of birthday.scheduledMessages) {
          if (message.active) {
            this.scheduleBrowserTimeout(birthday, message);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to schedule browser timeouts:', error);
    }
  }

  private async checkBrowserNotifications(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const birthdays = await this.storage.getBirthdays();
      const now = new Date();

      for (const birthday of birthdays) {
        if (!birthday.scheduledMessages) continue;

        for (const message of birthday.scheduledMessages) {
          if (!message.active) continue;

          const shouldShow = this.shouldShowBrowserNotification(birthday, message, now);
          if (shouldShow) {
            this.showBrowserNotification(birthday, message);
            await this.markBrowserNotificationSent(birthday.id, message.id);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to check browser notifications:', error);
    }
  }

  private shouldShowBrowserNotification(birthday: Birthday, message: ScheduledMessage, now: Date): boolean {
    const birthDate = new Date(birthday.birthDate);
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
    const isWithinWindow = timeDiff >= 0 && timeDiff < 300000; // 5 minute window

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

  private async markBrowserNotificationSent(birthdayId: string, messageId: string): Promise<void> {
    try {
      const birthdays = await this.storage.getBirthdays();
      const birthday = birthdays.find(b => b.id === birthdayId);

      if (!birthday?.scheduledMessages) return;

      const updatedMessages = birthday.scheduledMessages.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, lastSentDate: new Date() };
        }
        return msg;
      });

      await this.storage.updateBirthday({
        ...birthday,
        scheduledMessages: updatedMessages
      });
    } catch (error) {
      this.logger.error('Failed to mark browser notification as sent:', error);
    }
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

    // Cancel existing timeout for this message
    const existing = this.browserTimeouts.get(key);
    if (existing) {
      clearTimeout(existing);
      this.browserTimeouts.delete(key);
    }

    const birthDate = new Date(birthday.birthDate);
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

    // Only schedule if it's in the future and within 24 hours
    if (delay > 0 && delay < 86400000) {
      const timeout = setTimeout(async () => {
        this.browserTimeouts.delete(key);
        if ('Notification' in window && Notification.permission === 'granted') {
          this.showBrowserNotification(birthday, message);
          await this.markBrowserNotificationSent(birthday.id, message.id);
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
      // Clear all browser timeouts for this birthday
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
    const birthDate = new Date(birthday.birthDate);

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
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
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

  private calculateAge(birthDate: Date): number | null {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  async getScheduledNotificationsCount(): Promise<number> {
    if (!this.isNative) {
      try {
        const birthdays = await this.storage.getBirthdays();
        let count = 0;
        for (const birthday of birthdays) {
          if (birthday.scheduledMessages) {
            count += birthday.scheduledMessages.filter(m => m.active).length;
          }
        }
        return count;
      } catch (error) {
        this.logger.error('Failed to get scheduled notifications count (browser):', error);
        return 0;
      }
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
      try {
        const birthdays = await this.storage.getBirthdays();
        const notifications: {
          id: number;
          title: string;
          body: string;
          scheduledAt: Date;
          birthdayId?: string;
        }[] = [];

        for (const birthday of birthdays) {
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
      } catch (error) {
        this.logger.error('Failed to get pending notifications (browser):', error);
        return [];
      }
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
