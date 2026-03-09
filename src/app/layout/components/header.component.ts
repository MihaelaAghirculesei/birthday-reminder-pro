import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, DestroyRef, ElementRef, ViewChild, PLATFORM_ID, NgZone, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
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
import { Birthday } from '../../shared/models';
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
      MatDividerModule,
      NgOptimizedImage
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
                  <img [ngSrc]="userPhotoURL()!" [alt]="userDisplayName() || 'User'" class="menu-user-avatar" width="24" height="24" referrerpolicy="no-referrer" />
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
          <button mat-menu-item (click)="toggleNotifications()">
            <mat-icon>{{ notificationIcon() }}</mat-icon>
            <span>{{ notificationLabel() }}</span>
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
            <source srcset="assets/icons/logo-reminder.webp" type="image/webp" width="46" height="46">
            <img src="assets/icons/logo-reminder.png" alt="Birthday Memories application logo" class="app-logo" width="46" height="46" loading="eager" decoding="sync">
          </picture>
          Birthday Memories
        </h1>
        <div class="header-controls" role="group" aria-label="Application settings">
          <app-network-status></app-network-status>
        </div>
      </div>
      <p class="hero-subtitle">Never forget the special moments that matter most. Keep track of all your loved ones' birthdays with style.</p>
      <nav class="nav-strip" role="navigation" aria-label="Main navigation">
        <a mat-button routerLink="/" class="nav-strip-item">
          <mat-icon>home</mat-icon>
          <span>Dashboard</span>
        </a>
        <a mat-button routerLink="/scheduled-messages" class="nav-strip-item">
          <mat-icon>schedule_send</mat-icon>
          <span>Messages</span>
        </a>
        <button mat-button [matMenuTriggerFor]="stripSettingsMenu" class="nav-strip-item">
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
          <mat-icon class="nav-strip-arrow">arrow_drop_down</mat-icon>
        </button>
        <button mat-button [matMenuTriggerFor]="stripImportMenu" class="nav-strip-item">
          <mat-icon>upload_file</mat-icon>
          <span>Import</span>
          <mat-icon class="nav-strip-arrow">arrow_drop_down</mat-icon>
        </button>
        <button mat-button [matMenuTriggerFor]="stripExportMenu" class="nav-strip-item">
          <mat-icon>download</mat-icon>
          <span>Export</span>
          <mat-icon class="nav-strip-arrow">arrow_drop_down</mat-icon>
        </button>
        @if (isAuthenticated()) {
          <div class="nav-strip-spacer"></div>
          <div class="nav-strip-user">
            @if (userPhotoURL()) {
              <img [ngSrc]="userPhotoURL()!" [alt]="userDisplayName() || 'User'" class="nav-strip-avatar" width="28" height="28" referrerpolicy="no-referrer" />
            } @else {
              <mat-icon class="nav-strip-user-icon">account_circle</mat-icon>
            }
            <span class="nav-strip-user-name">{{ userDisplayName() || 'User' }}</span>
          </div>
          <button mat-button (click)="signOut()" class="nav-strip-item nav-strip-signout">
            <mat-icon>logout</mat-icon>
            <span>Sign out</span>
          </button>
        } @else if (!authLoading()) {
          <div class="nav-strip-spacer"></div>
          <app-auth-button></app-auth-button>
        }
      </nav>
      <mat-menu #stripSettingsMenu="matMenu" class="nav-strip-dropdown">
        <a mat-menu-item routerLink="/calendar-sync">
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
      <mat-menu #stripImportMenu="matMenu" class="nav-strip-dropdown">
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
      <mat-menu #stripExportMenu="matMenu" class="nav-strip-dropdown">
        <button mat-menu-item (click)="exportJSON()">
          <mat-icon>data_object</mat-icon>
          <span>Export JSON</span>
        </button>
        <button mat-menu-item (click)="exportCSV()">
          <mat-icon>table_chart</mat-icon>
          <span>Export CSV</span>
        </button>
      </mat-menu>
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
      --header-icon-size: 46px;
      background: rgba(102, 126, 234, 0.5);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      color: #1a1a1a;
      padding: 1rem 1.5rem;
      text-align: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
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
      justify-content: center;
      align-items: center;
      position: relative;
      min-height: var(--header-icon-size);
      max-width: var(--content-max-width);
      margin: 0 auto;
    }

    .hero-title {
      font-size: clamp(1.4rem, 5vw, 1.8rem);
      margin: 0;
      font-weight: 700;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .app-logo {
      height: var(--header-icon-size);
      width: var(--header-icon-size);
      object-fit: contain;
      filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.2));
    }

    .hero-subtitle {
      font-size: clamp(0.75rem, 2.5vw, 1.1rem);
      margin: 0.25rem auto 0;
      max-width: var(--content-max-width);
      opacity: 0.85;
      font-weight: 300;
      color: var(--text-primary);
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      position: absolute;
      right: 0;
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
      display: none;
      position: absolute;
      left: 0;
      align-items: center;
      justify-content: center;
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

    ::ng-deep .nav-strip-dropdown.mat-mdc-menu-panel {
      background: rgba(102, 126, 234, 0.5);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.15);
      min-width: 200px;

      .mat-mdc-menu-content {
        color: #1a1a1a;
      }

      .mat-mdc-menu-item {
        color: #1a1a1a !important;

        .mat-icon {
          color: rgba(26, 26, 26, 0.75) !important;
        }

        .mdc-list-item__primary-text {
          color: #1a1a1a !important;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        &[disabled] {
          opacity: 0.6 !important;
        }
      }

      mat-divider, .mat-divider {
        border-top-color: rgba(255, 255, 255, 0.2) !important;
      }
    }

    ::ng-deep body.dark-theme .nav-strip-dropdown.mat-mdc-menu-panel {
      background: rgba(40, 40, 40, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05);

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
      }

      mat-divider, .mat-divider {
        border-top-color: rgba(255, 255, 255, 0.15) !important;
      }
    }

    .nav-strip {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin: 0.5rem -1.5rem -1rem;
      padding: 0.35rem max(0.75rem, calc((100vw - var(--content-max-width)) / 2 + 0.75rem));
      background: rgba(255, 255, 255, 0.15);
      border-radius: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      flex-wrap: wrap;

      :host-context(body.dark-theme) & {
        background: rgba(255, 255, 255, 0.06);
        border-top-color: rgba(255, 255, 255, 0.08);
      }
    }

    .nav-strip-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #1a1a1a !important;
      font-size: 0.85rem;
      font-weight: 500;
      border-radius: 8px;
      padding: 0.3rem 0.75rem;
      min-height: 36px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: background 0.2s ease, border-color 0.2s ease;

      &:hover {
        background: rgba(0, 0, 0, 0.08);
        border-color: rgba(0, 0, 0, 0.15);
      }

      .mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #1a1a1a;
      }

      :host-context(body.dark-theme) & {
        color: white !important;
        border-color: rgba(255, 255, 255, 0.12);

        &:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .mat-icon {
          color: rgba(255, 255, 255, 0.85);
        }
      }
    }

    .nav-strip-arrow {
      font-size: 18px !important;
      width: 18px !important;
      height: 18px !important;
      margin-left: -0.2rem;
      opacity: 0.6;
    }

    .nav-strip-spacer {
      flex: 1;
    }

    .nav-strip-user {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0 0.5rem;
      font-size: 0.85rem;
      color: #1a1a1a;
      opacity: 0.85;

      :host-context(body.dark-theme) & {
        color: white;
      }
    }

    .nav-strip-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
    }

    .nav-strip-user-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .nav-strip-user-name {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-strip-signout {
      opacity: 0.7;
      &:hover {
        opacity: 1;
      }
    }

    @media (max-width: 1180px) {
      .nav-strip {
        gap: 0.5rem;
      }

      .nav-strip-item {
        padding: 0.3rem 0.5rem;
        gap: 0.25rem;
        font-size: 0.8rem;
      }
    }

    @media (max-width: 1010px) {
      .menu-btn {
        display: inline-flex;
      }

      .nav-strip {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .app-header {
        --header-icon-size: 40px;
        padding: 0.75rem 1rem;
      }
    }

    @media (max-width: 430px) {
      .app-header {
        padding: 0.6rem 0.75rem;
      }

      .hero-title {
        gap: 0.4rem;
      }
    }

    @media (max-width: 380px) {
      .header-top {
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.4rem;
      }

      .hero-title {
        order: -1;
        flex-basis: 100%;
        justify-content: center;

        .app-logo {
          height: 28px;
          width: 28px;
        }
      }

      .menu-btn {
        position: static;
      }

      .header-controls {
        position: static;
      }
    }

  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
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
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('navMenuTrigger') navMenuTrigger!: MatMenuTrigger;

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
  private lastScrollY = 0;
  private readonly scrollThreshold = 10;

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
      this.lastScrollY = this.getScrollY();
      this.ngZone.runOutsideAngular(() => {
        window.addEventListener('scroll', this.onScroll, { passive: true });
        document.body.addEventListener('scroll', this.onScroll, { passive: true });
      });
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.onScroll);
      document.body.removeEventListener('scroll', this.onScroll);
    }
  }

  private getScrollY(): number {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  private onScroll = (): void => {
    const currentY = this.getScrollY();
    if (currentY <= 0) {
      this.el.nativeElement.classList.remove('header-hidden');
      this.lastScrollY = currentY;
    } else if (currentY > this.lastScrollY + this.scrollThreshold) {
      this.el.nativeElement.classList.add('header-hidden');
      this.lastScrollY = currentY;
    } else if (currentY < this.lastScrollY - this.scrollThreshold) {
      this.el.nativeElement.classList.remove('header-hidden');
      this.lastScrollY = currentY;
    }
  };

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

  exportJSON(): void { this.handleExport(b => this.backupService.exportToJSON(b), 'Exported to JSON'); }
  exportCSV(): void { this.handleExport(b => this.backupService.exportToCSV(b), 'Exported to CSV'); }

  onImportJSON(event: Event): void { this.handleImport(event, f => this.backupService.importFromFile(f), 'Invalid backup file'); }
  onImportCSV(event: Event): void { this.handleImport(event, f => this.backupService.importFromCSV(f), 'Invalid CSV file'); }
  onImportVCard(event: Event): void { this.handleImport(event, f => this.backupService.importFromVCard(f), 'Invalid vCard file'); }

  private handleExport(exporter: (b: Birthday[]) => void, successMsg: string): void {
    const birthdays = this.birthdayFacade.birthdays();
    if (birthdays.length === 0) {
      this.notificationService.show('No birthdays to export', 'warning');
      return;
    }
    exporter(birthdays);
    this.notificationService.show(successMsg, 'success');
  }

  private async handleImport(event: Event, importer: (f: File) => Promise<Birthday[]>, errorMsg: string): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const birthdays = await importer(file);
      for (const birthday of birthdays) {
        this.birthdayFacade.addBirthday(birthday);
      }
      this.notificationService.show(`Imported ${birthdays.length} birthdays`, 'success');
    } catch {
      this.notificationService.show(errorMsg, 'error');
    }
    (event.target as HTMLInputElement).value = '';
  }
}
