import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { NetworkStatusComponent } from '../../shared/components/network-status.component';
import { AuthButtonComponent } from '../../shared/components/auth-button/auth-button.component';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu.component';
import { ThemeService } from '../../core';
import * as AuthSelectors from '../../core/store/auth/auth.selectors';

@Component({
    selector: 'app-header',
    imports: [
      CommonModule,
      RouterModule,
      NetworkStatusComponent,
      AuthButtonComponent,
      UserMenuComponent,
      MatSlideToggleModule,
      MatIconModule,
      MatButtonModule,
      MatTooltipModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <header class="app-header" role="banner">
      <div class="header-top">
        <h1 class="hero-title" id="main-title">
          <picture>
            <source srcset="assets/icons/logo-reminder.webp" type="image/webp" width="60" height="60">
            <img src="assets/icons/logo-reminder.png" alt="Birthday Memories application logo" class="app-logo" width="60" height="60" loading="eager" decoding="sync">
          </picture>
          Birthday Memories
        </h1>
        <div class="header-controls" role="group" aria-label="Application settings">
          <mat-slide-toggle
            [checked]="themeService.darkMode()"
            (change)="themeService.toggleDarkMode()"
            class="theme-toggle"
            color="primary"
            aria-label="Toggle dark mode theme"
            [attr.aria-checked]="themeService.darkMode()"
            matTooltip="Toggle between light and dark theme for better visual comfort"
            matTooltipPosition="below">
            <mat-icon aria-hidden="true">{{ themeService.darkMode() ? 'dark_mode' : 'light_mode' }}</mat-icon>
            <span class="sr-only">{{ themeService.darkMode() ? 'Dark mode enabled' : 'Light mode enabled' }}</span>
          </mat-slide-toggle>
          <app-network-status></app-network-status>
          @if (isAuthenticated()) {
            <app-user-menu></app-user-menu>
          } @else if (!authLoading()) {
            <app-auth-button></app-auth-button>
          }
        </div>
      </div>
      <p class="hero-subtitle">Never forget the special moments that matter most. Keep track of all your loved ones' birthdays with style.</p>
      <nav class="nav-menu" role="navigation" aria-label="Main navigation">
        <a mat-button routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" aria-label="Go to dashboard page">
          <mat-icon aria-hidden="true">home</mat-icon>
          Dashboard
        </a>
        <a mat-button routerLink="/scheduled-messages" routerLinkActive="active" aria-label="Go to scheduled messages page">
          <mat-icon aria-hidden="true">schedule_send</mat-icon>
          Messages
        </a>
        <a mat-button routerLink="/calendar-sync" routerLinkActive="active" aria-label="Go to calendar sync page">
          <mat-icon aria-hidden="true">sync</mat-icon>
          Calendar
        </a>
      </nav>
    </header>
  `,
    styles: [`
    .app-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
      border-radius: 12px;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    }

    .header-top {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      position: relative;
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
      height: 60px;
      width: 60px;
      object-fit: contain;
      filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.2));
    }

    .hero-subtitle {
      font-size: 1.1rem;
      margin-top: 0.5rem;
      opacity: 0.95 !important;
      font-weight: 300;
      color: #ffffff !important;

      * {
        color: #ffffff !important;
      }
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      position: absolute;
      right: 0;
      top: 0;
    }

    .theme-toggle {
      ::ng-deep .mdc-switch {
        opacity: 0.9;
      }

      mat-icon {
        margin-left: 8px;
        vertical-align: middle;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    app-network-status {
      position: static;
    }

    @media (max-width: 768px) {
      .app-header {
        padding: 1.5rem;
      }

      .hero-title {
        font-size: 1.8rem;
      }

      .app-logo {
        height: 45px;
        width: 45px;
      }

      .hero-subtitle {
        font-size: 0.95rem;
      }

      .header-top {
        flex-direction: column;
        gap: 0.5rem;
      }

      .header-controls {
        position: static;
        justify-content: center;
        flex-wrap: wrap;
      }

      .theme-toggle {
        font-size: 0.9rem;
      }

      .nav-menu {
        margin-top: 8px;
      }
    }

    .nav-menu {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);

      a {
        color: white !important;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 20px;
        border-radius: 24px;
        transition: all 0.3s ease;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        &.active {
          background: rgba(255, 255, 255, 0.3);
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class HeaderComponent {
  private readonly store = inject(Store);
  public readonly themeService = inject(ThemeService);

  isAuthenticated = toSignal(
    this.store.select(AuthSelectors.selectIsAuthenticated),
    { initialValue: false }
  );

  authLoading = toSignal(
    this.store.select(AuthSelectors.selectAuthLoading),
    { initialValue: true }
  );
}
