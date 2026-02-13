import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IdGeneratorService } from './id-generator.service';

export interface NotificationMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<NotificationMessage[]>([]);
  public notifications = this.notifications$.asObservable();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private idGenerator: IdGeneratorService) {}

  private readonly defaultDurations: Record<string, number> = {
    success: 3000,
    error: 0,
    warning: 0,
    info: 0
  };

  show(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration?: number): void {
    const effectiveDuration = duration ?? this.defaultDurations[type] ?? 0;
    const notification: NotificationMessage = {
      id: this.idGenerator.generateId(),
      message,
      type,
      duration: effectiveDuration
    };

    const currentNotifications = this.notifications$.value;
    this.notifications$.next([...currentNotifications, notification]);

    if (effectiveDuration > 0) {
      const timer = setTimeout(() => {
        this.remove(notification.id);
      }, effectiveDuration);
      this.timers.set(notification.id, timer);
    }
  }

  remove(id: string): void {
    const currentNotifications = this.notifications$.value;
    this.notifications$.next(currentNotifications.filter(n => n.id !== id));

    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}