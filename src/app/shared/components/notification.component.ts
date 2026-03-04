import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate } from '@angular/animations';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationService, NotificationMessage } from '../../core/services/notification.service';

@Component({
    selector: 'app-notification',
    imports: [CommonModule, MatIconModule, MatButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div class="notification-container">
      @for (notification of notifications$ | async; track notification.id) {
        <div
          class="notification"
          [class]="'notification-' + notification.type"
          [@slideIn]
          (click)="close(notification.id)"
          (keydown.enter)="close(notification.id)"
          (keydown.space)="close(notification.id)"
          tabindex="0"
          role="button"
          data-testid="notification">
          <mat-icon class="notification-icon">{{ getIcon(notification.type) }}</mat-icon>
          <span class="notification-message">{{ notification.message }}</span>
          <button mat-icon-button class="close-btn" (click)="close(notification.id)" aria-label="Close notification" data-testid="close-notification">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
    </div>
    `,
    styles: [`
    .notification-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      width: 100%;
      align-items: center;
    }

    .notification {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      transition: all 0.3s ease;
      width: 400px;
      max-width: 90vw;
    }

    .notification:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }

    .notification-success {
      background: var(--status-success-bg);
      border-left: 4px solid var(--status-success-border);
      color: var(--status-success-text);
    }

    .notification-error {
      background: var(--status-error-bg);
      border-left: 4px solid var(--status-error-border);
      color: var(--status-error-text);
    }

    .notification-warning {
      background: var(--status-warning-bg);
      border-left: 4px solid var(--status-warning-border);
      color: var(--status-warning-text);
    }

    .notification-info {
      background: var(--status-info-bg);
      border-left: 4px solid var(--status-info-border);
      color: var(--status-info-text);
    }

    .notification-icon {
      font-size: 20px !important;
      width: 20px !important;
      height: 20px !important;
    }

    .notification-message {
      flex: 1;
      font-weight: 500;
    }

    .close-btn {
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;

      mat-icon {
        font-size: 18px !important;
        width: 18px !important;
        height: 18px !important;
        line-height: 1 !important;
      }
    }
  `],
    animations: [
        trigger('slideIn', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
            ])
        ])
    ]
})
export class NotificationComponent {
  notifications$: Observable<NotificationMessage[]>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications;
  }

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  close(id: string): void {
    this.notificationService.remove(id);
  }

  trackByNotification(index: number, notification: NotificationMessage): string {
    return notification.id;
  }
}