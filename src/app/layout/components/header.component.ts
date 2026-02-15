import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, HostListener, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { NetworkStatusComponent } from '../../shared/components/network-status.component';
import { AuthButtonComponent } from '../../shared/components/auth-button/auth-button.component';

import { SenderSettingsDialogComponent } from '../../shared/components/sender-settings-dialog/sender-settings-dialog.component';
import { ThemeService, BirthdayFacadeService, NotificationService } from '../../core';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { BackupService } from '../../core/services/backup.service';
import * as AuthActions from '../../core/store/auth/auth.actions';
import * as AuthSelectors from '../../core/store/auth/auth.selectors';

@Component({
    selector: 'app-header',
    imports: [
      CommonModule,
      RouterModule,
      NetworkStatusComponent,
      AuthButtonComponent,
      MatIconModule,
      MatButtonModule,
      MatMenuModule,
      MatDividerModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <header class="app-header" role="banner">
      <div class="header-top">
        <button mat-icon-button [matMenuTriggerFor]="navMenu" #navMenuTrigger="matMenuTrigger" aria-label="Open navigation menu" class="menu-btn">
          <mat-icon>menu</mat-icon>
        </button>
        <mat-menu #navMenu="matMenu" class="nav-menu-panel nav-menu-main" xPosition="after" yPosition="below" [overlapTrigger]="true">
          <a mat-menu-item routerLink="/" aria-label="Go to dashboard page">
            <mat-icon>home</mat-icon>
            <span>Dashboard</span>
          </a>
          <a mat-menu-item routerLink="/scheduled-messages" aria-label="Go to scheduled messages page">
            <mat-icon>schedule_send</mat-icon>
            <span>Messages</span>
          </a>
          <mat-divider></mat-divider>
          <button mat-menu-item [matMenuTriggerFor]="settingsMenu">
            <mat-icon>settings</mat-icon>
            <span>Settings</span>
          </button>
          <button mat-menu-item [matMenuTriggerFor]="importMenu">
            <mat-icon>upload_file</mat-icon>
            <span>Import</span>
          </button>
          <button mat-menu-item [matMenuTriggerFor]="exportMenu">
            <mat-icon>download</mat-icon>
            <span>Export</span>
          </button>
          <mat-divider></mat-divider>
          @if (isAuthenticated()) {
            <div mat-menu-item disabled class="user-info-menu-item">
              @if (userPhotoURL()) {
                <mat-icon class="avatar-icon">
                  <img [src]="userPhotoURL()" [alt]="userDisplayName() || 'User'" class="menu-user-avatar" referrerpolicy="no-referrer" />
                </mat-icon>
              } @else {
                <mat-icon>account_circle</mat-icon>
              }
              <span>{{ userDisplayName() || 'User' }} · <small class="menu-user-email">{{ userEmail() }}</small></span>
            </div>
            <button mat-menu-item (click)="signOut()">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          } @else if (!authLoading()) {
            <app-auth-button></app-auth-button>
          }
        </mat-menu>
        <mat-menu #importMenu="matMenu" class="nav-menu-panel nav-submenu" xPosition="before">
          <button mat-menu-item (click)="importJSON.click()">
            <mat-icon>data_object</mat-icon>
            <span>Import JSON</span>
          </button>
          <button mat-menu-item (click)="importCSV.click()">
            <mat-icon>table_chart</mat-icon>
            <span>Import CSV</span>
          </button>
          <button mat-menu-item (click)="importVCard.click()">
            <mat-icon>contact_page</mat-icon>
            <span>Import vCard</span>
          </button>
        </mat-menu>
        <mat-menu #exportMenu="matMenu" class="nav-menu-panel nav-submenu" xPosition="before">
          <button mat-menu-item (click)="exportJSON()">
            <mat-icon>data_object</mat-icon>
            <span>Export JSON</span>
          </button>
          <button mat-menu-item (click)="exportCSV()">
            <mat-icon>table_chart</mat-icon>
            <span>Export CSV</span>
          </button>
        </mat-menu>
        <mat-menu #settingsMenu="matMenu" class="nav-menu-panel nav-submenu" xPosition="before">
          <a mat-menu-item routerLink="/calendar-sync" aria-label="Go to calendar sync page">
            <mat-icon>sync</mat-icon>
            <span>Calendar Sync</span>
          </a>
          <button mat-menu-item (click)="openSenderSettings()">
            <mat-icon>badge</mat-icon>
            <span>Message Signature</span>
          </button>
          <button mat-menu-item (click)="enableNotifications()" [disabled]="notificationsGranted">
            <mat-icon>{{ notificationsGranted ? 'notifications_active' : 'notifications' }}</mat-icon>
            <span>{{ notificationsGranted ? 'Notifications Enabled' : 'Enable Notifications' }}</span>
          </button>
          <button mat-menu-item (click)="themeService.toggleDarkMode()">
            <mat-icon>{{ themeService.darkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            <span>{{ themeService.darkMode() ? 'Light Theme' : 'Dark Theme' }}</span>
          </button>
        </mat-menu>
        <input #importJSON type="file" accept=".json" hidden (change)="onImportJSON($event)">
        <input #importCSV type="file" accept=".csv" hidden (change)="onImportCSV($event)">
        <input #importVCard type="file" accept=".vcf" hidden (change)="onImportVCard($event)">
        <h1 class="hero-title" id="main-title">
          <picture>
            <source srcset="assets/icons/logo-reminder.webp" type="image/webp" width="60" height="60">
            <img src="assets/icons/logo-reminder.png" alt="Birthday Memories application logo" class="app-logo" width="60" height="60" loading="eager" decoding="sync">
          </picture>
          Birthday Memories
        </h1>
        <div class="header-controls" role="group" aria-label="Application settings">
          <app-network-status></app-network-status>
        </div>
      </div>
      <p class="hero-subtitle">Never forget the special moments that matter most. Keep track of all your loved ones' birthdays with style.</p>
    </header>
  `,
    styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 1000;
      transform: translateY(0);
      transition: transform 0.5s ease;
    }

    :host.header-hidden {
      transform: translateY(-100%);
    }

    .app-header {
      --header-icon-size: 60px;
      background: rgba(102, 126, 234, 0.5);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: #1a1a1a;
      padding: 2rem;
      text-align: center;
      border-radius: 12px;
      margin-bottom: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15);

      :host-context(body.dark-theme) & {
        color: white;
        background: rgba(40, 40, 40, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .hero-title {
      font-size: 2.5rem;
      margin: 0;
      font-weight: 700;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .app-logo {
      height: var(--header-icon-size);
      width: var(--header-icon-size);
      object-fit: contain;
      filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.2));
    }

    .hero-subtitle {
      font-size: 1.1rem;
      margin-top: 0.5rem;
      opacity: 0.85;
      font-weight: 300;
      color: #1a1a1a;

      :host-context(body.dark-theme) & {
        color: #ffffff;
      }
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    ::ng-deep .nav-menu-main.mat-mdc-menu-panel {
      margin-left: 48px;
      margin-top: 0;

      @media (max-width: 410px) {
        margin-left: 0;
        max-width: 55vw;
      }
    }

    ::ng-deep .nav-submenu.mat-mdc-menu-panel {
      min-width: 200px;
      max-width: 200px;
    }

    ::ng-deep .nav-menu-panel {
      background: linear-gradient(135deg, #2a2a2a 0%, #333333 100%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;

      .mat-mdc-menu-content {
        color: white;
      }

      .mat-mdc-menu-item {
        color: white !important;

        .mat-icon {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .mdc-list-item__primary-text {
          color: white !important;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        &[disabled] {
          opacity: 1 !important;
          color: white !important;

          .mdc-list-item__primary-text {
            color: white !important;
          }
        }
      }

      .mat-mdc-menu-submenu-icon {
        color: rgba(255, 255, 255, 0.7) !important;
      }

      mat-divider, .mat-divider {
        border-top-color: rgba(255, 255, 255, 0.15) !important;
      }

      @media (max-width: 430px) {
        .mat-mdc-menu-item {
          min-height: 40px;
          font-size: 0.8rem;

          .mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
        }
      }

      app-auth-button .auth-button {
        background: transparent !important;
        box-shadow: none !important;
        width: 100%;
        justify-content: flex-start;
        padding: 0 16px !important;
        height: 48px;
        border-radius: 0 !important;
        color: white !important;

        &:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }
      }
    }

    .menu-user-email {
      font-size: 0.75em;
      opacity: 0.6;
    }

    .avatar-icon {
      overflow: visible !important;
    }

    .menu-user-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    .menu-btn {
      color: #1a1a1a;
      opacity: 0.9;
      width: var(--header-icon-size);
      height: var(--header-icon-size);
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: var(--radius);
      transition: background 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
      &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
        border-color: rgba(0, 0, 0, 0.3);
      }

      :host-context(body.dark-theme) & {
        color: white;
        border-color: rgba(255, 255, 255, 0.2);
        &:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.35);
        }
      }
    }

    app-network-status {
      position: static;
    }

    @media (max-width: 768px) {
      .app-header {
        --header-icon-size: 50px;
        padding: 1.5rem;
      }

      .hero-title {
        font-size: 1.8rem;
      }

      .hero-subtitle {
        font-size: 0.95rem;
      }
    }

    @media (max-width: 430px) {
      .app-header {
        padding: 1rem;
      }

      .hero-title {
        font-size: 1.3rem;
        gap: 0.5rem;
      }

      .hero-subtitle {
        font-size: 0.8rem;
      }
    }

  `]
})
export class HeaderComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly backupService = inject(BackupService);
  private readonly birthdayFacade = inject(BirthdayFacadeService);
  private readonly notificationService = inject(NotificationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly el = inject(ElementRef);
  public readonly themeService = inject(ThemeService);
  private readonly permissionService = inject(NotificationPermissionService);

  @ViewChild('navMenuTrigger') navMenuTrigger!: MatMenuTrigger;

  notificationsGranted = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private menuHideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly hideDelay = 3000;
  private menuMouseEnterHandler = () => this.clearMenuTimer();
  private menuMouseLeaveHandler = () => this.startMenuHideTimer();

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.showHeader();
    this.clearTimer();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.startHideTimer();
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.notificationsGranted = this.permissionService.getCurrentPermission() === 'granted';
      this.permissionService.permissionStatus.subscribe(status => {
        this.notificationsGranted = status === 'granted';
      });
      this.ngZone.runOutsideAngular(() => {
        document.addEventListener('mousemove', this.onDocumentMouseMove);
      });
      this.startHideTimer();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.navMenuTrigger) {
      this.navMenuTrigger.menuOpened.subscribe(() => {
        const panel = document.querySelector('.nav-menu-panel') as HTMLElement;
        if (panel) {
          const overlay = panel.closest('.cdk-overlay-pane')?.parentElement as HTMLElement;
          const container = overlay || panel;
          container.addEventListener('mouseenter', this.menuMouseEnterHandler);
          container.addEventListener('mouseleave', this.menuMouseLeaveHandler);
          this.startMenuHideTimer();
        }
      });
      this.navMenuTrigger.menuClosed.subscribe(() => {
        this.clearMenuTimer();
      });
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.clearMenuTimer();
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('mousemove', this.onDocumentMouseMove);
    }
  }

  private onDocumentMouseMove = (): void => {
    this.showHeader();
    this.startHideTimer();
  };

  private showHeader(): void {
    this.el.nativeElement.classList.remove('header-hidden');
  }

  private startHideTimer(): void {
    this.clearTimer();
    this.hideTimer = setTimeout(() => {
      this.el.nativeElement.classList.add('header-hidden');
    }, this.hideDelay);
  }

  private clearTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private startMenuHideTimer(): void {
    this.clearMenuTimer();
    this.menuHideTimer = setTimeout(() => {
      this.navMenuTrigger?.closeMenu();
    }, this.hideDelay);
  }

  private clearMenuTimer(): void {
    if (this.menuHideTimer) {
      clearTimeout(this.menuHideTimer);
      this.menuHideTimer = null;
    }
  }

  isAuthenticated = toSignal(
    this.store.select(AuthSelectors.selectIsAuthenticated),
    { initialValue: false }
  );

  authLoading = toSignal(
    this.store.select(AuthSelectors.selectAuthLoading),
    { initialValue: true }
  );

  userDisplayName = toSignal(
    this.store.select(AuthSelectors.selectUserDisplayName),
    { initialValue: null }
  );

  userEmail = toSignal(
    this.store.select(AuthSelectors.selectUserEmail),
    { initialValue: null }
  );

  userPhotoURL = toSignal(
    this.store.select(AuthSelectors.selectUserPhotoURL),
    { initialValue: null }
  );

  signOut(): void {
    this.store.dispatch(AuthActions.signOut());
  }

  async enableNotifications(): Promise<void> {
    const granted = await this.permissionService.requestPermission();
    if (granted) {
      this.notificationService.show('Notifications enabled!', 'success');
    }
  }

  openSenderSettings(): void {
    this.dialog.open(SenderSettingsDialogComponent, {
      width: '400px',
      maxWidth: '95vw'
    });
  }

  exportJSON(): void {
    const birthdays = this.birthdayFacade.birthdays();
    if (birthdays.length === 0) {
      this.notificationService.show('No birthdays to export', 'warning');
      return;
    }
    this.backupService.exportToJSON(birthdays);
    this.notificationService.show('Exported to JSON', 'success');
  }

  exportCSV(): void {
    const birthdays = this.birthdayFacade.birthdays();
    if (birthdays.length === 0) {
      this.notificationService.show('No birthdays to export', 'warning');
      return;
    }
    this.backupService.exportToCSV(birthdays);
    this.notificationService.show('Exported to CSV', 'success');
  }

  async onImportJSON(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const birthdays = await this.backupService.importFromFile(file);
      for (const birthday of birthdays) {
        this.birthdayFacade.addBirthday(birthday);
      }
      this.notificationService.show(`Imported ${birthdays.length} birthdays`, 'success');
    } catch {
      this.notificationService.show('Invalid backup file', 'error');
    }
    (event.target as HTMLInputElement).value = '';
  }

  async onImportCSV(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const birthdays = await this.backupService.importFromCSV(file);
      for (const birthday of birthdays) {
        this.birthdayFacade.addBirthday(birthday);
      }
      this.notificationService.show(`Imported ${birthdays.length} birthdays`, 'success');
    } catch {
      this.notificationService.show('Invalid CSV file', 'error');
    }
    (event.target as HTMLInputElement).value = '';
  }

  async onImportVCard(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const birthdays = await this.backupService.importFromVCard(file);
      for (const birthday of birthdays) {
        this.birthdayFacade.addBirthday(birthday);
      }
      this.notificationService.show(`Imported ${birthdays.length} birthdays`, 'success');
    } catch {
      this.notificationService.show('Invalid vCard file', 'error');
    }
    (event.target as HTMLInputElement).value = '';
  }
}
