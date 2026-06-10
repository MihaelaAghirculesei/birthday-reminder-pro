import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy,Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { Store } from '@ngrx/store';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter, take } from 'rxjs/operators';

import * as AuthActions from '../../../core/store/auth/auth.actions';
import * as AuthSelectors from '../../../core/store/auth/auth.selectors';
import { ConfirmDialogComponent, type ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { SyncStatusComponent } from '../sync-status/sync-status.component';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    NgOptimizedImage,
    SyncStatusComponent,
    TranslatePipe
  ],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="userMenu"
      class="user-avatar-button"
      [attr.aria-label]="'AUTH.USER_MENU' | translate"
    >
      @if (photoURL()) {
        <img
          [ngSrc]="photoURL()!"
          [alt]="displayName() || 'User'"
          class="user-avatar"
          width="32"
          height="32"
          referrerpolicy="no-referrer"
        />
      } @else {
        <mat-icon>account_circle</mat-icon>
      }
    </button>

    <mat-menu #userMenu="matMenu" class="user-menu">
      <div class="user-info" mat-menu-item disabled>
        @if (photoURL()) {
          <img
            [ngSrc]="photoURL()!"
            [alt]="displayName() || 'User'"
            class="menu-avatar"
            width="40"
            height="40"
            referrerpolicy="no-referrer"
          />
        } @else {
          <mat-icon class="menu-avatar-icon">account_circle</mat-icon>
        }
        <div class="user-details">
          <span class="user-name">{{ displayName() || 'User' }}</span>
          <span class="user-email">{{ email() }}</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="sync-status-container" mat-menu-item disabled>
        <app-sync-status></app-sync-status>
      </div>

      <mat-divider></mat-divider>

      <button mat-menu-item (click)="signOut()">
        <mat-icon>logout</mat-icon>
        <span>{{ 'AUTH.SIGN_OUT' | translate }}</span>
      </button>

      <mat-divider></mat-divider>

      <button mat-menu-item class="delete-account-item" (click)="confirmDeleteAccount()">
        <mat-icon color="warn">delete_forever</mat-icon>
        <span class="warn-text">{{ 'AUTH.DELETE_ACCOUNT' | translate }}</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .user-avatar-button {
      padding: 0;
      overflow: hidden;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      min-width: 200px;
      pointer-events: none;
    }

    .menu-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .menu-avatar-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--text-secondary);
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 12px;
      color: var(--text-secondary, rgba(0, 0, 0, 0.6));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sync-status-container {
      padding: 8px 16px;
      pointer-events: none;
    }

    .warn-text {
      color: #f44336;
    }

    .delete-account-item mat-icon {
      color: #f44336 !important;
    }

  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserMenuComponent {
  private readonly store = inject(Store);
  private readonly dialog = inject(MatDialog);
  private readonly translate = inject(TranslateService);

  displayName = toSignal(
    this.store.select(AuthSelectors.selectUserDisplayName),
    { initialValue: null }
  );

  email = toSignal(
    this.store.select(AuthSelectors.selectUserEmail),
    { initialValue: null }
  );

  photoURL = toSignal(
    this.store.select(AuthSelectors.selectUserPhotoURL),
    { initialValue: null }
  );

  private userId = toSignal(
    this.store.select(AuthSelectors.selectUserId),
    { initialValue: null }
  );

  signOut(): void {
    this.store.dispatch(AuthActions.signOut());
  }

  confirmDeleteAccount(): void {
    const userId = this.userId();
    if (!userId) return;

    const data: ConfirmDialogData = {
      title: this.translate.instant('CONFIRM.DELETE_ACCOUNT_TITLE'),
      message: this.translate.instant('CONFIRM.DELETE_ACCOUNT_MESSAGE'),
      confirmText: this.translate.instant('CONFIRM.DELETE_ACCOUNT_BTN'),
      cancelText: this.translate.instant('CONFIRM.CANCEL_BTN'),
      icon: 'delete_forever',
      color: 'warn'
    };

    this.dialog.open(ConfirmDialogComponent, { data, maxWidth: '400px' })
      .afterClosed()
      .pipe(filter(Boolean), take(1))
      .subscribe(() => {
        this.store.dispatch(AuthActions.deleteAccount({ userId }));
      });
  }
}
