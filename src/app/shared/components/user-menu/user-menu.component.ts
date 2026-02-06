import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { toSignal } from '@angular/core/rxjs-interop';

import * as AuthActions from '../../../core/store/auth/auth.actions';
import * as AuthSelectors from '../../../core/store/auth/auth.selectors';
import { SyncStatusComponent } from '../sync-status/sync-status.component';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    SyncStatusComponent
  ],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="userMenu"
      class="user-avatar-button"
      aria-label="User menu"
    >
      @if (photoURL()) {
        <img
          [src]="photoURL()"
          [alt]="displayName() || 'User'"
          class="user-avatar"
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
            [src]="photoURL()"
            [alt]="displayName() || 'User'"
            class="menu-avatar"
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
        <span>Sign out</span>
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

    ::ng-deep .user-menu .mat-mdc-menu-item[disabled] {
      opacity: 1;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserMenuComponent {
  private readonly store = inject(Store);

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

  signOut(): void {
    this.store.dispatch(AuthActions.signOut());
  }
}
