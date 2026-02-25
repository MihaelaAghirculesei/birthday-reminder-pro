import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  color?: 'warn' | 'primary' | 'accent';
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confirm-dialog">
      <div class="dialog-header">
        <div class="header-icon">
          <mat-icon>{{ data.icon || 'warning' }}</mat-icon>
        </div>
        <h2>{{ data.title }}</h2>
      </div>

      <div class="dialog-body">
        <p>{{ data.message }}</p>
      </div>

      <div class="dialog-actions">
        <button mat-stroked-button class="cancel-btn" (click)="onCancel()">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button mat-flat-button class="confirm-btn" [class.warn]="data.color === 'warn'" (click)="onConfirm()">
          <mat-icon>{{ data.icon || 'check' }}</mat-icon>
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/mixins' as *;
    @include gradient-dialog-surface;

    .confirm-dialog {
      min-width: min(380px, 80vw);
      background: transparent !important;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);

      .header-icon {
        @include glass-icon-circle(48px, 28px);
        min-width: 48px;
        min-height: 48px;
        padding: 10px;

        mat-icon { color: white; }
      }

      h2 {
        margin: 0;
        font-size: clamp(0.95rem, 3.5vw, 1.25rem);
        font-weight: 700;
        color: white;
      }
    }

    .dialog-body {
      padding: 24px;

      p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
        color: $white-90;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
    }

    .cancel-btn {
      color: white !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
      font-weight: 600 !important;

      &:hover {
        background: rgba(255, 255, 255, 0.1) !important;
      }
    }

    .confirm-btn {
      background: white !important;
      color: #764ba2 !important;
      font-weight: 700 !important;
      border: 2px solid rgba(255, 255, 255, 0.5) !important;
      border-radius: 4px !important;
      display: flex;
      align-items: center;
      gap: 6px;

      .mdc-button__label { color: #764ba2 !important; }
      mat-icon { color: #764ba2 !important; font-size: 18px; width: 18px; height: 18px; }

      &:hover {
        background: rgba(255, 255, 255, 0.1) !important;
        color: white !important;
        border-color: rgba(255, 255, 255, 0.5) !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        .mdc-button__label { color: white !important; }
        mat-icon { color: white !important; }
      }

      &.warn {
        background: #f44336 !important;
        color: white !important;
        border-color: #f44336 !important;
        .mdc-button__label { color: white !important; }
        mat-icon { color: white !important; }

        &:hover {
          background: #d32f2f !important;
          border-color: #d32f2f !important;
          box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
        }
      }
    }

    :host-context(body.dark-theme) {
      .dialog-header {
        background: rgba(255, 255, 255, 0.05);
        border-bottom-color: rgba(255, 255, 255, 0.1);

        .header-icon {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
      }

      .dialog-body p {
        color: rgba(255, 255, 255, 0.75);
      }

      .dialog-actions {
        border-top-color: rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.03);
      }

      .cancel-btn {
        color: rgba(255, 255, 255, 0.9) !important;
        border-color: rgba(255, 255, 255, 0.25) !important;

        &:hover {
          background: rgba(255, 255, 255, 0.08) !important;
        }
      }

      .confirm-btn {
        background: rgba(255, 255, 255, 0.12) !important;
        color: white !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
        .mdc-button__label { color: white !important; }
        mat-icon { color: white !important; }

        &:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
          .mdc-button__label { color: white !important; }
          mat-icon { color: white !important; }
        }

        &.warn {
          background: #f44336 !important;
          color: white !important;
          border-color: rgba(244, 67, 54, 0.6) !important;
          .mdc-button__label { color: white !important; }
          mat-icon { color: white !important; }

          &:hover {
            background: #d32f2f !important;
            border-color: rgba(211, 47, 47, 0.8) !important;
            box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
          }
        }
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
