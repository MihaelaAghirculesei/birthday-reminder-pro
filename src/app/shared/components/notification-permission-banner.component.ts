import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';

import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';

@Component({
  selector: 'app-notification-permission-banner',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldShow) {
      <div class="notification-banner" data-testid="notification-banner">
        <mat-card class="permission-card">
          <mat-card-content>
            <div class="banner-content">
              <div class="icon-section">
                <mat-icon class="notification-icon">notifications_active</mat-icon>
              </div>
              <div class="text-section">
                <h3>Enable Birthday Notifications</h3>
                <p>Get reminded when it's someone's birthday! We'll send you notifications at the scheduled time.</p>
              </div>
              <div class="action-section">
                <button
                  mat-raised-button
                  color="primary"
                  (click)="requestPermission()"
                  [disabled]="isRequesting"
                  >
                  <mat-icon>check</mat-icon>
                  Enable Notifications
                </button>
                <button
                  mat-button
                  (click)="dismiss()"
                  [disabled]="isRequesting"
                  data-testid="dismiss-notification-banner"
                  >
                  Maybe Later
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
    `,
  styles: [`
    .notification-banner {
      margin: 16px 0;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .permission-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .icon-section {
      flex-shrink: 0;
    }

    .notification-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .text-section {
      flex: 1;
    }

    .text-section h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 500;
    }

    .text-section p {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .action-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }

    .action-section button {
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .banner-content {
        flex-direction: column;
        text-align: center;
      }

      .action-section {
        width: 100%;
      }

      .action-section button {
        width: 100%;
      }
    }
  `]
})
export class NotificationPermissionBannerComponent implements OnInit, OnDestroy {
  shouldShow = false;
  isRequesting = false;
  private dismissed = false;
  private destroy$ = new Subject<void>();

  constructor(
    private permissionService: NotificationPermissionService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const dismissedTimestamp = localStorage.getItem('notificationBannerDismissed');
    if (dismissedTimestamp) {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      if (parseInt(dismissedTimestamp) < sevenDaysAgo) {
        localStorage.removeItem('notificationBannerDismissed');
      } else {
        this.dismissed = true;
      }
    }

    this.updateShouldShow();
    this.permissionService.permissionStatus
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateShouldShow();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateShouldShow(): void {
    const supported = this.permissionService.isSupported();
    const permission = this.permissionService.getCurrentPermission();
    this.shouldShow = supported && permission === 'default' && !this.dismissed;
    this.cdr.detectChanges();
  }

  async requestPermission(): Promise<void> {
    this.isRequesting = true;
    const granted = await this.permissionService.requestPermission();

    if (granted) {
      await this.permissionService.showTestNotification();
    }

    this.isRequesting = false;
  }

  dismiss(): void {
    this.dismissed = true;
    this.shouldShow = false;
    localStorage.setItem('notificationBannerDismissed', Date.now().toString());
    this.cdr.detectChanges();
  }
}
