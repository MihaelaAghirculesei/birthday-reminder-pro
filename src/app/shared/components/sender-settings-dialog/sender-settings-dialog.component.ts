import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>person</mat-icon>
      Your Name (Message Signature)
    </h2>

    <mat-dialog-content>
      <p class="hint">This name will replace <strong>{{ '{' }}sender{{ '}' }}</strong> and <strong>{{ '{' }}senderFull{{ '}' }}</strong> in your messages.</p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>First Name</mat-label>
        <input matInput [(ngModel)]="senderName" placeholder="e.g. Mihaela" />
        <mat-hint>Used in informal messages ({{ '{' }}sender{{ '}' }})</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Full Name</mat-label>
        <input matInput [(ngModel)]="senderFullName" placeholder="e.g. Mihaela Aghirculesei" />
        <mat-hint>Used in formal messages ({{ '{' }}senderFull{{ '}' }})</mat-hint>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()">
        <mat-icon>check</mat-icon>
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 8px; }
    .hint { color: rgba(0,0,0,0.6); font-size: 14px; margin-bottom: 16px; }
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
