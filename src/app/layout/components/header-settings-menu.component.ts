import { Component, ChangeDetectionStrategy, inject, ViewChild, Input, DestroyRef, signal, computed, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenu } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { SenderSettingsDialogComponent } from '../../shared/components/sender-settings-dialog/sender-settings-dialog.component';
import { ThemeService, NotificationService } from '../../core';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';

@Component({
  selector: 'app-header-settings-menu',
  imports: [
    RouterModule,
    MatIconModule,
    MatMenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-menu #settingsMenu="matMenu" [class]="menuClass">
      <a mat-menu-item routerLink="/calendar-sync" aria-label="Go to calendar sync page">
        <mat-icon>sync</mat-icon>
        <span>Calendar Sync</span>
      </a>
      <button mat-menu-item (click)="openSenderSettings()">
        <mat-icon>badge</mat-icon>
        <span>Message Signature</span>
      </button>
      <button mat-menu-item (click)="toggleNotifications()">
        <mat-icon>{{ notificationIcon() }}</mat-icon>
        <span>{{ notificationLabel() }}</span>
      </button>
      <button mat-menu-item (click)="themeService.toggleDarkMode()">
        <mat-icon>{{ themeService.darkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
        <span>{{ themeService.darkMode() ? 'Light Theme' : 'Dark Theme' }}</span>
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
  private readonly permissionService = inject(NotificationPermissionService);
  private readonly destroyRef = inject(DestroyRef);

  notificationsGranted = signal(false);
  notificationsEnabled = signal(false);
  notificationIcon = computed(() =>
    this.notificationsGranted() && this.notificationsEnabled() ? 'notifications_active'
    : this.notificationsGranted() ? 'notifications_off'
    : 'notifications'
  );
  notificationLabel = computed(() =>
    this.notificationsGranted() && this.notificationsEnabled() ? 'Disable Notifications' : 'Enable Notifications'
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
        this.notificationService.show('Notifications enabled!', 'success');
      }
    } else if (this.notificationsEnabled()) {
      this.permissionService.setNotificationsEnabled(false);
      this.notificationService.show('Notifications disabled', 'info');
    } else {
      this.permissionService.setNotificationsEnabled(true);
      this.notificationService.show('Notifications enabled!', 'success');
    }
  }

  openSenderSettings(): void {
    this.dialog.open(SenderSettingsDialogComponent, {
      width: '400px',
      maxWidth: '95vw'
    });
  }
}
