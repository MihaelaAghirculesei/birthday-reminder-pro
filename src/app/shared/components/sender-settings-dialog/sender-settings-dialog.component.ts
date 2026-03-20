import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { SenderSettingsService } from '../../../core';

@Component({
  selector: 'app-sender-settings-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>person</mat-icon>
      {{ 'SENDER_SETTINGS.TITLE' | translate }}
    </h2>

    <mat-dialog-content>
      <p class="hint" [innerHTML]="'SENDER_SETTINGS.HINT' | translate"></p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'SENDER_SETTINGS.FIRST_NAME_LABEL' | translate }}</mat-label>
        <input matInput [(ngModel)]="senderName" [placeholder]="'SENDER_SETTINGS.FIRST_NAME_PLACEHOLDER' | translate" />
        <mat-hint>{{ 'SENDER_SETTINGS.FIRST_NAME_HINT' | translate }}</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ 'SENDER_SETTINGS.FULL_NAME_LABEL' | translate }}</mat-label>
        <input matInput [(ngModel)]="senderFullName" [placeholder]="'SENDER_SETTINGS.FULL_NAME_PLACEHOLDER' | translate" />
        <mat-hint>{{ 'SENDER_SETTINGS.FULL_NAME_HINT' | translate }}</mat-hint>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">{{ 'SENDER_SETTINGS.CANCEL' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()">
        <mat-icon>check</mat-icon>
        {{ 'SENDER_SETTINGS.SAVE' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 8px; }
    .hint { opacity: 0.7; font-size: 14px; margin-bottom: 16px; }
    mat-dialog-content { min-width: 320px; }
    h2 { display: flex; align-items: center; gap: 8px; }
  `]
})
export class SenderSettingsDialogComponent {
  private readonly senderSettings = inject(SenderSettingsService);
  readonly dialogRef = inject(MatDialogRef<SenderSettingsDialogComponent>);

  senderName = this.senderSettings.getSenderName();
  senderFullName = this.senderSettings.getSenderFullName();

  save(): void {
    this.senderSettings.setSenderName(this.senderName);
    this.senderSettings.setSenderFullName(this.senderFullName);
    this.dialogRef.close(true);
  }
}
