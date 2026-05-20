import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';

import { HeaderSettingsMenuComponent } from './header-settings-menu.component';
import { HeaderImportExportComponent } from './header-import-export.component';
import { HeaderUserMenuComponent } from './header-user-menu.component';

@Component({
  selector: 'app-header-nav-strip',
  imports: [
    RouterModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    HeaderSettingsMenuComponent,
    HeaderImportExportComponent,
    HeaderUserMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav-strip" role="navigation" aria-label="Main navigation">
      <a mat-button routerLink="/" class="nav-strip-item">
        <mat-icon aria-hidden="true">home</mat-icon>
        <span>{{ 'NAV.DASHBOARD' | translate }}</span>
      </a>
      <a mat-button routerLink="/scheduled-messages" class="nav-strip-item">
        <mat-icon aria-hidden="true">schedule_send</mat-icon>
        <span>{{ 'NAV.MESSAGES' | translate }}</span>
      </a>
      <button [matMenuTriggerFor]="stripSettings.settingsMenu" class="nav-strip-item" data-testid="nav-settings-btn">
        <img src="assets/icons/settings-button.svg" [attr.alt]="'NAV.SETTINGS' | translate" class="nav-strip-icon" width="20" height="20" loading="lazy" decoding="async"/>
        <span aria-hidden="true">{{ 'NAV.SETTINGS' | translate }}</span>
        <mat-icon aria-hidden="true" class="nav-strip-arrow">arrow_drop_down</mat-icon>
      </button>
      <button [matMenuTriggerFor]="stripImportExport.importMenu" class="nav-strip-item">
        <img src="assets/icons/import-button.svg" [attr.alt]="'NAV.IMPORT' | translate" class="nav-strip-icon" width="20" height="20" loading="lazy" decoding="async"/>
        <span aria-hidden="true">{{ 'NAV.IMPORT' | translate }}</span>
        <mat-icon aria-hidden="true" class="nav-strip-arrow">arrow_drop_down</mat-icon>
      </button>
      <button [matMenuTriggerFor]="stripImportExport.exportMenu" class="nav-strip-item">
        <img src="assets/icons/export-button.svg" [attr.alt]="'NAV.EXPORT' | translate" class="nav-strip-icon" width="20" height="20" loading="lazy" decoding="async"/>
        <span aria-hidden="true">{{ 'NAV.EXPORT' | translate }}</span>
        <mat-icon aria-hidden="true" class="nav-strip-arrow">arrow_drop_down</mat-icon>
      </button>
      <app-header-user-menu
        mode="desktop"
        [isAuthenticated]="isAuthenticated"
        [authLoading]="authLoading"
        [userDisplayName]="userDisplayName"
        [userEmail]="userEmail"
        [userPhotoURL]="userPhotoURL"
        (signOutClicked)="signOutClicked.emit()">
      </app-header-user-menu>
    </nav>
    <app-header-settings-menu #stripSettings menuClass="nav-strip-dropdown" />
    <app-header-import-export #stripImportExport menuClass="nav-strip-dropdown" />
  `,
  styles: [`
    :host {
      display: contents;
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

    button.nav-strip-item {
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
    }

    .nav-strip-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      filter: brightness(0);

      :host-context(body.dark-theme) & {
        filter: brightness(0) invert(1);
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
      .nav-strip {
        display: none;
      }
    }
  `]
})
export class HeaderNavStripComponent {
  @ViewChild('stripSettings') stripSettings!: HeaderSettingsMenuComponent;
  @ViewChild('stripImportExport') stripImportExport!: HeaderImportExportComponent;

  @Input() isAuthenticated = false;
  @Input() authLoading = true;
  @Input() userDisplayName: string | null = null;
  @Input() userEmail: string | null = null;
  @Input() userPhotoURL: string | null = null;
  @Output() signOutClicked = new EventEmitter<void>();
}
