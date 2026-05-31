import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Input, type OnInit, PLATFORM_ID,signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { type MatMenu,MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { NotificationService,ThemeService } from '../../core';
import { LocaleService } from '../../core/services/locale.service';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { SenderSettingsDialogComponent } from '../../shared/components/sender-settings-dialog/sender-settings-dialog.component';

@Component({
  selector: 'app-header-settings-menu',
  imports: [
    RouterModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-menu #settingsMenu="matMenu" [class]="menuClass">
      <a mat-menu-item routerLink="/calendar-sync" [attr.aria-label]="'NAV.CALENDAR_SYNC' | translate">
        <mat-icon aria-hidden="true">calendar_month</mat-icon>
        <span aria-hidden="true">{{ 'NAV.CALENDAR_SYNC' | translate }}</span>
      </a>
      <button mat-menu-item (click)="openSenderSettings()" [attr.aria-label]="'NAV.MESSAGE_SIGNATURE' | translate">
        <mat-icon aria-hidden="true">badge</mat-icon>
        <span aria-hidden="true">{{ 'NAV.MESSAGE_SIGNATURE' | translate }}</span>
      </button>
      <button mat-menu-item (click)="toggleNotifications()" [attr.aria-label]="notificationLabel() | translate">
        <mat-icon aria-hidden="true">{{ notificationIcon() }}</mat-icon>
        <span aria-hidden="true">{{ notificationLabel() | translate }}</span>
      </button>
      <button mat-menu-item (click)="themeService.toggleDarkMode()" [attr.aria-label]="(themeService.darkMode() ? 'NAV.LIGHT_THEME' : 'NAV.DARK_THEME') | translate">
        <mat-icon aria-hidden="true">{{ themeService.darkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        <span aria-hidden="true">{{ (themeService.darkMode() ? 'NAV.LIGHT_THEME' : 'NAV.DARK_THEME') | translate }}</span>
      </button>
      <button mat-menu-item (click)="localeService.toggleLanguage()" [attr.aria-label]="'LANG.SWITCH' | translate">
        <mat-icon aria-hidden="true">translate</mat-icon>
        <span aria-hidden="true">{{ 'LANG.SWITCH' | translate }}</span>
      </button>
    </mat-menu>
  `
})
export class HeaderSettingsMenuComponent implements OnInit {
  @Input() menuClass = '';
  @ViewChild('settingsMenu', { static: true }) settingsMenu!: MatMenu;

  private readonly dialog = inject(MatDialog);
  private readonly notificationService = inject(NotificationService);
  private readonly platformId = inject(PLATFORM_ID);
  public readonly themeService = inject(ThemeService);
  public readonly localeService = inject(LocaleService);
  private readonly permissionService = inject(NotificationPermissionService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  notificationsGranted = signal(false);
  notificationsEnabled = signal(false);
  notificationIcon = computed(() =>
    this.notificationsGranted() && this.notificationsEnabled() ? 'notifications_active'
    : this.notificationsGranted() ? 'notifications_off'
    : 'notifications'
  );
  notificationLabel = computed(() =>
    this.notificationsGranted() && this.notificationsEnabled()
      ? 'NAV.DISABLE_NOTIFICATIONS'
      : 'NAV.ENABLE_NOTIFICATIONS'
  );

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.notificationsGranted.set(this.permissionService.getCurrentPermission() === 'granted');
      this.notificationsEnabled.set(this.permissionService.isNotificationsEnabled());
      this.permissionService.permissionStatus.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(status => {
        this.notificationsGranted.set(status === 'granted');
      });
      this.permissionService.notificationsEnabled.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(enabled => {
        this.notificationsEnabled.set(enabled);
      });
    }
  }

  async toggleNotifications(): Promise<void> {
    if (!this.notificationsGranted()) {
      const granted = await this.permissionService.requestPermission();
      if (granted) {
        this.notificationService.show(
          this.translate.instant('NOTIFICATIONS.NOTIFICATIONS_ENABLED'),
          'success'
        );
      }
    } else if (this.notificationsEnabled()) {
      this.permissionService.setNotificationsEnabled(false);
      this.notificationService.show(this.translate.instant('NOTIFICATIONS.NOTIFICATIONS_DISABLED'), 'info');
    } else {
      this.permissionService.setNotificationsEnabled(true);
      this.notificationService.show(this.translate.instant('NOTIFICATIONS.NOTIFICATIONS_ENABLED'), 'success');
    }
  }

  openSenderSettings(): void {
    this.dialog.open(SenderSettingsDialogComponent, {
      width: '400px',
      maxWidth: '95vw'
    });
  }
}
