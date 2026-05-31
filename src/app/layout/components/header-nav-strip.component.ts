import { ChangeDetectionStrategy, Component, computed, DestroyRef,EventEmitter, inject, Input, Output, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd,Router, RouterModule } from '@angular/router';

import { Store } from '@ngrx/store';

import { TranslatePipe } from '@ngx-translate/core';
import { merge } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

import { FirebaseAuthService } from '../../core/services/firebase-auth.service';
import * as AuthActions from '../../core/store/auth/auth.actions';
import { HeaderImportExportComponent } from './header-import-export.component';
import { HeaderSettingsMenuComponent } from './header-settings-menu.component';
import { HeaderUserMenuComponent } from './header-user-menu.component';

@Component({
  selector: 'app-header-nav-strip',
  imports: [
    RouterModule,
    TranslatePipe,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    HeaderSettingsMenuComponent,
    HeaderImportExportComponent,
    HeaderUserMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav-strip" role="navigation" aria-label="Main navigation">

      <!-- Dashboard: active only when on '/' AND no menu is open -->
      <a mat-button
         routerLink="/"
         class="nav-strip-item"
         [class.nav-active]="isDashboardActive()">
        <mat-icon aria-hidden="true">home</mat-icon>
        <span>{{ 'NAV.DASHBOARD' | translate }}</span>
      </a>

      <!-- Messages: navigable link when authenticated, plain button when not -->
      @if (isAuthenticated) {
        <a mat-button
           routerLink="/scheduled-messages"
           class="nav-strip-item"
           [class.nav-active]="isMessagesActive()">
          <mat-icon aria-hidden="true">schedule_send</mat-icon>
          <span>{{ 'NAV.MESSAGES' | translate }}</span>
        </a>
      } @else {
        <button mat-button
                class="nav-strip-item nav-requires-auth"
                [matTooltip]="'NAV.SIGN_IN_FOR_MESSAGES' | translate"
                matTooltipPosition="below"
                (click)="signInForMessages()">
          <mat-icon aria-hidden="true">schedule_send</mat-icon>
          <span>{{ 'NAV.MESSAGES' | translate }}</span>
          <mat-icon aria-hidden="true" class="nav-lock-icon">lock</mat-icon>
        </button>
      }

      <!-- Menu buttons: active while their menu is open or a dialog/overlay is open -->
      <button #settingsTrigger="matMenuTrigger"
              [matMenuTriggerFor]="stripSettings.settingsMenu"
              [class.nav-active]="settingsTrigger.menuOpen || dialogOpen() || settingsOverlayOpen()"
              (menuOpened)="menuOpen.set(true)"
              (menuClosed)="menuOpen.set(false)"
              class="nav-strip-item" data-testid="nav-settings-btn">
        <img src="assets/icons/settings-button.svg" [attr.alt]="'NAV.SETTINGS' | translate" class="nav-strip-icon" width="20" height="20" loading="lazy" decoding="async"/>
        <span aria-hidden="true">{{ 'NAV.SETTINGS' | translate }}</span>
        <mat-icon aria-hidden="true" class="nav-strip-arrow">arrow_drop_down</mat-icon>
      </button>

      <button #importTrigger="matMenuTrigger"
              [matMenuTriggerFor]="stripImportExport.importMenu"
              [class.nav-active]="importTrigger.menuOpen"
              (menuOpened)="menuOpen.set(true)"
              (menuClosed)="menuOpen.set(false)"
              class="nav-strip-item">
        <img src="assets/icons/import-button.svg" [attr.alt]="'NAV.IMPORT' | translate" class="nav-strip-icon" width="20" height="20" loading="lazy" decoding="async"/>
        <span aria-hidden="true">{{ 'NAV.IMPORT' | translate }}</span>
        <mat-icon aria-hidden="true" class="nav-strip-arrow">arrow_drop_down</mat-icon>
      </button>

      <button #exportTrigger="matMenuTrigger"
              [matMenuTriggerFor]="stripImportExport.exportMenu"
              [class.nav-active]="exportTrigger.menuOpen"
              (menuOpened)="menuOpen.set(true)"
              (menuClosed)="menuOpen.set(false)"
              class="nav-strip-item">
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

      &.nav-active {
        background: rgba(0, 0, 0, 0.12);
        border-color: rgba(0, 0, 0, 0.2);
        font-weight: 600;
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

        &.nav-active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .mat-icon {
          color: rgba(255, 255, 255, 0.85);
        }
      }
    }

    .nav-requires-auth {
      opacity: 0.65;
    }

    .nav-lock-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      opacity: 0.6;
      margin-left: 2px;
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

  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly authService = inject(FirebaseAuthService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  menuOpen = signal(false);
  readonly settingsOverlayOpen = computed(() => this.dialogOpen());

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  dialogOpen = toSignal(
    merge(
      this.dialog.afterOpened.pipe(map(() => true)),
      this.dialog.afterAllClosed.pipe(map(() => false))
    ),
    { initialValue: false }
  );

  isDashboardActive = computed(() =>
    this.currentUrl() === '/' && !this.menuOpen() && !this.dialogOpen()
  );

  isMessagesActive = computed(() =>
    this.currentUrl().startsWith('/scheduled-messages') && !this.menuOpen() && !this.dialogOpen()
  );

  async signInForMessages(): Promise<void> {
    this.store.dispatch(AuthActions.signInWithGoogle());
    try {
      const user = await this.authService.performGoogleSignInDirect();
      this.store.dispatch(AuthActions.signInSuccess({ user }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sign-in failed';
      this.store.dispatch(AuthActions.signInFailure({ error: message }));
    }
  }
}
