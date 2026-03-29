import { Component, ChangeDetectionStrategy, inject, DestroyRef, ElementRef, ViewChild, PLATFORM_ID, NgZone, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { fromEvent, merge } from 'rxjs';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NetworkStatusComponent } from '../../shared/components/network-status.component';

import { AppState } from '../../core/store/app.state';
import * as AuthActions from '../../core/store/auth/auth.actions';
import * as AuthSelectors from '../../core/store/auth/auth.selectors';

import { HeaderSettingsMenuComponent } from './header-settings-menu.component';
import { HeaderImportExportComponent } from './header-import-export.component';
import { HeaderUserMenuComponent } from './header-user-menu.component';
import { HeaderNavStripComponent } from './header-nav-strip.component';

@Component({
    selector: 'app-header',
    imports: [
      CommonModule,
      RouterModule,
      NetworkStatusComponent,
      MatIconModule,
      MatButtonModule,
      MatMenuModule,
      MatDividerModule,
      HeaderSettingsMenuComponent,
      HeaderImportExportComponent,
      HeaderUserMenuComponent,
      HeaderNavStripComponent,
      TranslatePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <header class="app-header" role="banner">
      <div class="header-top">
        <button mat-icon-button [matMenuTriggerFor]="navMenu" #navMenuTrigger="matMenuTrigger" [attr.aria-label]="'NAV.OPEN_MENU' | translate" class="menu-btn">
          <mat-icon aria-hidden="true">menu</mat-icon>
        </button>
        <mat-menu #navMenu="matMenu" class="nav-menu-panel nav-menu-main" xPosition="after" yPosition="below" [overlapTrigger]="true">
          <a mat-menu-item routerLink="/" [attr.aria-label]="'NAV.GO_DASHBOARD' | translate">
            <mat-icon aria-hidden="true">home</mat-icon>
            <span>{{ 'NAV.DASHBOARD' | translate }}</span>
          </a>
          <a mat-menu-item routerLink="/scheduled-messages" [attr.aria-label]="'NAV.GO_MESSAGES' | translate">
            <mat-icon aria-hidden="true">schedule_send</mat-icon>
            <span>{{ 'NAV.MESSAGES' | translate }}</span>
          </a>
          <mat-divider></mat-divider>
          <button mat-menu-item [matMenuTriggerFor]="mobileSettings.settingsMenu">
            <mat-icon aria-hidden="true">settings</mat-icon>
            <span>{{ 'NAV.SETTINGS' | translate }}</span>
          </button>
          <button mat-menu-item [matMenuTriggerFor]="mobileImportExport.importMenu">
            <mat-icon aria-hidden="true">upload_file</mat-icon>
            <span>{{ 'NAV.IMPORT' | translate }}</span>
          </button>
          <button mat-menu-item [matMenuTriggerFor]="mobileImportExport.exportMenu">
            <mat-icon aria-hidden="true">download</mat-icon>
            <span>{{ 'NAV.EXPORT' | translate }}</span>
          </button>
          <mat-divider></mat-divider>
          <app-header-user-menu
            mode="mobile"
            [isAuthenticated]="isAuthenticated()"
            [authLoading]="authLoading()"
            [userDisplayName]="userDisplayName()"
            [userEmail]="userEmail()"
            [userPhotoURL]="userPhotoURL()"
            (signOutClicked)="signOut()">
          </app-header-user-menu>
        </mat-menu>
        <app-header-settings-menu #mobileSettings menuClass="nav-menu-panel nav-submenu" />
        <app-header-import-export #mobileImportExport menuClass="nav-menu-panel nav-submenu" />
        <h1 class="hero-title" id="main-title">
          <picture>
            <source srcset="assets/icons/logo-reminder.webp" type="image/webp" width="46" height="46">
            <img src="assets/icons/logo-reminder.png" alt="" class="app-logo" width="46" height="46" loading="eager" decoding="sync">
          </picture>
          {{ 'APP.TITLE' | translate }}
        </h1>
        <div class="header-controls" role="group" [attr.aria-label]="'NAV.APP_SETTINGS' | translate">
          <app-network-status></app-network-status>
        </div>
      </div>
      <p class="hero-subtitle">{{ 'APP.SUBTITLE' | translate }}</p>
      <app-header-nav-strip
        [isAuthenticated]="isAuthenticated()"
        [authLoading]="authLoading()"
        [userDisplayName]="userDisplayName()"
        [userEmail]="userEmail()"
        [userPhotoURL]="userPhotoURL()"
        (signOutClicked)="signOut()">
      </app-header-nav-strip>
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

    @media (max-width: 1010px) {
      .menu-btn {
        display: inline-flex;
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
export class HeaderComponent implements OnInit {
  private readonly store = inject(Store<AppState>);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('navMenuTrigger') navMenuTrigger!: MatMenuTrigger;

  private lastScrollY = 0;
  private readonly scrollThreshold = 10;

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

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.lastScrollY = this.getScrollY();
      const opts = { passive: true } as AddEventListenerOptions;
      this.ngZone.runOutsideAngular(() => {
        merge(
          fromEvent(window, 'scroll', opts as EventListenerOptions),
          fromEvent(document.body, 'scroll', opts as EventListenerOptions)
        )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => this.onScroll());
      });
    }
  }

  signOut(): void {
    this.store.dispatch(AuthActions.signOut());
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
}
