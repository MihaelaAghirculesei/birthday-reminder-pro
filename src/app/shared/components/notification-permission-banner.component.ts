import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, type OnInit, PLATFORM_ID,signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { TranslatePipe } from '@ngx-translate/core';

import { BANNER_DISMISS_TTL_MS } from '../../core/constants/time.constants';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { SecureStorageService } from '../../core/services/secure-storage.service';

@Component({
    selector: 'app-notification-permission-banner',
    imports: [MatCardModule, MatIconModule, MatButtonModule, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div aria-live="polite" aria-atomic="true">
    @if (shouldShow()) {
      <div class="notification-banner"
        data-testid="notification-banner"
        role="region"
        [attr.aria-label]="(isDenied() ? 'NOTIFICATION_BANNER.DENIED_ARIA' : 'NOTIFICATION_BANNER.ARIA') | translate">
        <mat-card class="permission-card" [class.denied]="isDenied()">
          <mat-card-content>
            <div class="banner-content">
              <div class="icon-section">
                <mat-icon class="notification-icon">{{ isDenied() ? 'notifications_off' : 'notifications_active' }}</mat-icon>
              </div>
              <div class="text-section">
                @if (isDenied()) {
                  <h3>{{ 'NOTIFICATION_BANNER.DENIED_TITLE' | translate }}</h3>
                  <p>{{ 'NOTIFICATION_BANNER.DENIED_MESSAGE' | translate }}</p>
                  <p class="denied-instructions">{{ 'NOTIFICATION_BANNER.DENIED_INSTRUCTIONS' | translate }}</p>
                } @else {
                  <h3>{{ 'NOTIFICATION_BANNER.TITLE' | translate }}</h3>
                  <p>{{ 'NOTIFICATION_BANNER.MESSAGE' | translate }}</p>
                }
              </div>
              <div class="action-section">
                @if (!isDenied()) {
                  <button
                    mat-raised-button
                    color="primary"
                    (click)="requestPermission()"
                    [disabled]="isRequesting()"
                    >
                    <mat-icon>check</mat-icon>
                    {{ 'NOTIFICATION_BANNER.ENABLE_BTN' | translate }}
                  </button>
                }
                <button
                  mat-button
                  (click)="dismiss()"
                  [disabled]="isRequesting()"
                  data-testid="dismiss-notification-banner"
                  >
                  {{ (isDenied() ? 'NOTIFICATION_BANNER.GOT_IT_BTN' : 'NOTIFICATION_BANNER.DISMISS_BTN') | translate }}
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

    .permission-card.denied {
      background: var(--error-color);
    }

    .denied-instructions {
      margin-top: 8px !important;
      font-size: 13px !important;
      opacity: 0.85;
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
  isDenied = signal(false);
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
    this.isDenied.set(permission === 'denied');
    this.shouldShow.set(supported && (permission === 'default' || permission === 'denied') && !this.dismissed);
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
