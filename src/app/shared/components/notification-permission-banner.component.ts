import { Component, OnInit, ChangeDetectionStrategy, inject, DestroyRef, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { SecureStorageService } from '../../core/services/secure-storage.service';
import { BANNER_DISMISS_TTL_MS } from '../../core/constants/time.constants';

@Component({
    selector: 'app-notification-permission-banner',
    imports: [MatCardModule, MatIconModule, MatButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div aria-live="polite" aria-atomic="true">
    @if (shouldShow()) {
      <div class="notification-banner"
        data-testid="notification-banner"
        role="region"
        aria-label="Notification permission request">
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
                  [disabled]="isRequesting()"
                  >
                  <mat-icon>check</mat-icon>
                  Enable Notifications
                </button>
                <button
                  mat-button
                  (click)="dismiss()"
                  [disabled]="isRequesting()"
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
    </div>
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
      background: var(--primary);
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

    @media (prefers-reduced-motion: reduce) {
      .notification-banner {
        animation: none;
      }

      .notification-icon {
        animation: none;
      }
    }

    .text-section {
      flex: 1;
    }

    .text-section h3 {
      margin: 0 0 8px 0;
      font-size: clamp(0.95rem, 3.5vw, 1.5rem);
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
export class NotificationPermissionBannerComponent implements OnInit {
  private permissionService = inject(NotificationPermissionService);
  private platformId = inject(PLATFORM_ID);

  private readonly destroyRef = inject(DestroyRef);
  private readonly secureStorage = inject(SecureStorageService);

  private readonly DISMISSED_KEY = 'notificationBannerDismissed';

  shouldShow = signal(false);
  isRequesting = signal(false);
  private dismissed = false;

  async ngOnInit(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      const dismissedTimestamp = await this.secureStorage.getItem<string>(this.DISMISSED_KEY);
      if (dismissedTimestamp) {
        const sevenDaysAgo = Date.now() - BANNER_DISMISS_TTL_MS;
        if (parseInt(dismissedTimestamp) < sevenDaysAgo) {
          await this.secureStorage.removeItem(this.DISMISSED_KEY);
        } else {
          this.dismissed = true;
        }
      }
    }

    this.updateShouldShow();
    this.permissionService.permissionStatus
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateShouldShow();
      });
  }

  private updateShouldShow(): void {
    const supported = this.permissionService.isSupported();
    const permission = this.permissionService.getCurrentPermission();
    this.shouldShow.set(supported && permission === 'default' && !this.dismissed);
  }

  async requestPermission(): Promise<void> {
    this.isRequesting.set(true);
    const granted = await this.permissionService.requestPermission();

    if (granted) {
      await this.permissionService.showTestNotification();
    }

    this.isRequesting.set(false);
  }

  dismiss(): void {
    this.dismissed = true;
    this.shouldShow.set(false);
    if (isPlatformBrowser(this.platformId)) {
      this.secureStorage.setItem(this.DISMISSED_KEY, Date.now().toString());
    }
  }
}
