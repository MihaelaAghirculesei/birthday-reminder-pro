import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthButtonComponent } from '../../shared/components/auth-button/auth-button.component';

@Component({
  selector: 'app-header-user-menu',
  imports: [
    NgOptimizedImage,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    AuthButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mode === 'mobile') {
      @if (isAuthenticated) {
        <div mat-menu-item disabled class="user-info-menu-item">
          @if (userPhotoURL) {
            <mat-icon class="avatar-icon">
              <img [ngSrc]="userPhotoURL" [alt]="userDisplayName || 'User'" class="menu-user-avatar" width="24" height="24" referrerpolicy="no-referrer" />
            </mat-icon>
          } @else {
            <mat-icon>account_circle</mat-icon>
          }
          <span>{{ userDisplayName || 'User' }} · <small class="menu-user-email">{{ userEmail }}</small></span>
        </div>
        <button mat-menu-item (click)="signOutClicked.emit()">
          <mat-icon>logout</mat-icon>
          <span>Sign out</span>
        </button>
      } @else if (!authLoading) {
        <app-auth-button></app-auth-button>
      }
    } @else {
      @if (isAuthenticated) {
        <div class="nav-strip-spacer"></div>
        <div class="nav-strip-user">
          @if (userPhotoURL) {
            <img [ngSrc]="userPhotoURL" [alt]="userDisplayName || 'User'" class="nav-strip-avatar" width="28" height="28" referrerpolicy="no-referrer" />
          } @else {
            <mat-icon class="nav-strip-user-icon">account_circle</mat-icon>
          }
          <span class="nav-strip-user-name">{{ userDisplayName || 'User' }}</span>
        </div>
        <button mat-button (click)="signOutClicked.emit()" class="nav-strip-item nav-strip-signout">
          <mat-icon>logout</mat-icon>
          <span>Sign out</span>
        </button>
      } @else if (!authLoading) {
        <div class="nav-strip-spacer"></div>
        <app-auth-button></app-auth-button>
      }
    }
  `,
  styles: [`
    :host {
      display: contents;
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

    .nav-strip-signout {
      opacity: 0.7;
      &:hover {
        opacity: 1;
      }
    }
  `]
})
export class HeaderUserMenuComponent {
  @Input() mode: 'mobile' | 'desktop' = 'mobile';
  @Input() isAuthenticated = false;
  @Input() authLoading = true;
  @Input() userDisplayName: string | null = null;
  @Input() userEmail: string | null = null;
  @Input() userPhotoURL: string | null = null;
  @Output() signOutClicked = new EventEmitter<void>();
}
