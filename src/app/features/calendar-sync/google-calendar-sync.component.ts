import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { GoogleCalendarService, GoogleCalendarItem, BirthdayFacadeService, LoggerService } from '../../core';

@Component({
    selector: 'app-google-calendar-sync',
    imports: [
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatIconModule,
        MatButtonModule
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <mat-card class="sync-card">
      <mat-card-header>
        <mat-card-title>📅 Google Calendar Sync</mat-card-title>
      </mat-card-header>
    
      <mat-card-content>
        <div class="sync-status" [class.connected]="isSignedIn">
          <mat-icon [color]="isSignedIn ? 'primary' : 'warn'">
            {{ isSignedIn ? 'cloud_done' : 'cloud_off' }}
          </mat-icon>
          <span class="status-text">
            {{ isSignedIn ? 'Connected to Google Calendar' : 'Not connected' }}
          </span>
        </div>
    
        @if (!isSignedIn) {
          <div class="auth-section">
            <p class="auth-description">
              Connect your Google account to automatically sync birthdays to your calendar.
              Each birthday will be added as an annual recurring event.
            </p>
            <button mat-raised-button
              color="primary"
              (click)="signIn()"
              [disabled]="isConnecting"
              class="submit-button">
              <mat-icon>login</mat-icon>
              {{ isConnecting ? 'Connecting...' : 'Connect Google Calendar' }}
            </button>
          </div>
        }
    
        @if (isSignedIn) {
          <div class="settings-section">
            <form [formGroup]="settingsForm" class="settings-form">
              <mat-slide-toggle
                formControlName="enabled"
                color="primary"
                class="sync-toggle">
                Enable automatic sync
              </mat-slide-toggle>
              @if (settingsForm.get('enabled')?.value) {
                <div class="settings-content">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Target Calendar</mat-label>
                    <mat-select formControlName="calendarId">
                      <mat-option value="primary">Primary Calendar</mat-option>
                      @for (calendar of calendars; track calendar.id) {
                        <mat-option [value]="calendar.id">
                          {{ calendar.summary }}
                        </mat-option>
                      }
                    </mat-select>
                    <mat-icon matSuffix>calendar_today</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Sync Mode</mat-label>
                    <mat-select formControlName="syncMode">
                      <mat-option value="one-way">One-way (App → Calendar)</mat-option>
                      <mat-option value="two-way">Two-way (Bidirectional)</mat-option>
                    </mat-select>
                    <mat-hint>
                      One-way: Only sync from app to calendar.
                      Two-way: Sync changes in both directions.
                    </mat-hint>
                    <mat-icon matSuffix>sync</mat-icon>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Reminder Time</mat-label>
                    <mat-select formControlName="reminderMinutes">
                      <mat-option [value]="60">1 hour before</mat-option>
                      <mat-option [value]="360">6 hours before</mat-option>
                      <mat-option [value]="1440">1 day before</mat-option>
                      <mat-option [value]="2880">2 days before</mat-option>
                      <mat-option [value]="10080">1 week before</mat-option>
                    </mat-select>
                    <mat-icon matSuffix>notifications</mat-icon>
                  </mat-form-field>
                  <div class="sync-actions">
                    <button mat-raised-button
                      color="primary"
                      (click)="syncAllBirthdays()"
                      [disabled]="isSyncing"
                      class="sync-button">
                      <mat-icon>sync</mat-icon>
                      {{ isSyncing ? 'Syncing...' : 'Sync All Birthdays' }}
                    </button>
                    <button mat-stroked-button
                      (click)="saveSettings()"
                      [disabled]="settingsForm.pristine"
                      class="save-button">
                      <mat-icon>save</mat-icon>
                      Save Settings
                    </button>
                  </div>
                  @if (lastSyncResult) {
                    <div class="sync-info">
                      <mat-icon [color]="lastSyncResult.failed > 0 ? 'warn' : 'primary'">
                        {{ lastSyncResult.failed > 0 ? 'warning' : 'check_circle' }}
                      </mat-icon>
                      <span>
                        Last sync: {{ lastSyncResult.success }} successful,
                        {{ lastSyncResult.failed }} failed
                      </span>
                    </div>
                  }
                </div>
              }
            </form>
            <div class="disconnect-section">
              <button mat-stroked-button
                color="warn"
                (click)="signOut()"
                class="disconnect-button">
                <mat-icon>logout</mat-icon>
                Disconnect Google Calendar
              </button>
            </div>
          </div>
        }
      </mat-card-content>
    </mat-card>
    `,
    styles: [`
    .sync-card {
      max-width: 600px;
      margin: 0 auto;
      background: var(--surface) !important;
      border-radius: var(--radius-lg) !important;
      box-shadow: var(--shadow) !important;
      border: 1px solid var(--border-light) !important;

      .mat-mdc-card-header {
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        color: var(--text-primary);
        padding: 32px;

        .mat-mdc-card-title {
          font-size: clamp(1rem, 4vw, 1.75rem);
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
          text-shadow: none;
        }
      }

      .mat-mdc-card-content {
        padding: 32px !important;
      }
    }

    .sync-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: var(--radius);
      background: var(--surface-elevated);
      border: 2px solid var(--border);
      margin-bottom: 24px;
      transition: all 0.3s ease;

      &.connected {
        background: rgba(76, 175, 80, 0.1);
        border-color: var(--success);
        color: var(--success);
      }

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .status-text {
        font-size: 1.1rem;
        font-weight: 600;
      }
    }

    .auth-section {
      text-align: center;
      padding: 24px;

      .auth-description {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 24px;
        font-size: 1rem;
      }

      .submit-button {
        min-width: 220px;
        height: 56px;
        font-size: 1.1rem;
        font-weight: 600;
        border-radius: var(--radius) !important;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .sync-toggle {
        margin-bottom: 16px;
      }

      .settings-content {
        padding-left: 16px;
        border-left: 3px solid var(--primary);
        margin-top: 16px;
      }

      .full-width {
        width: 100%;
      }
    }

    .sync-actions {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 24px;

      button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        font-weight: 600;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .sync-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background: var(--surface-elevated);
      border-radius: var(--radius-sm);
      font-size: 0.9rem;
      color: var(--text-secondary);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .disconnect-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid var(--border-light);
      text-align: center;

      .disconnect-button {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 auto;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    @media (max-width: 768px) {
      .sync-card {
        margin: 0;
        border-radius: var(--radius) !important;

        .mat-mdc-card-content {
          padding: 16px !important;
        }

        .mat-mdc-card-header {
          padding: 16px;
        }
      }

      .auth-section {
        padding: 16px;

        .connect-button {
          font-size: 0.9rem;
          padding: 10px 16px;
          white-space: nowrap;
          min-width: 0;

          span {
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }
      }

      .settings-form {
        gap: 16px;

        .full-width {
          margin-bottom: 8px;
        }
      }

      .sync-actions {
        flex-direction: column;
        gap: 12px;

        button {
          width: 100%;
          justify-content: center;
          font-size: 0.9rem;
          padding: 10px 16px;
        }
      }

      .disconnect-section {
        margin-top: 24px;
        padding-top: 16px;

        .disconnect-button {
          font-size: 0.9rem;
          padding: 8px 16px;
        }
      }
    }
  `]
})
export class GoogleCalendarSyncComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  isSignedIn = false;
  isConnecting = false;
  isSyncing = false;
  calendars: GoogleCalendarItem[] = [];
  settingsForm: FormGroup;
  lastSyncResult: { success: number; failed: number; errors: string[] } | null = null;

  constructor(
    private googleCalendarService: GoogleCalendarService,
    private birthdayFacade: BirthdayFacadeService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private logger: LoggerService
  ) {
    this.settingsForm = this.fb.group({
      enabled: [false],
      calendarId: ['primary'],
      syncMode: ['one-way'],
      reminderMinutes: [1440]
    });
  }

  ngOnInit() {
    this.googleCalendarService.initialize().catch(() => {
      // Silent failure for Google Calendar initialization
    });

    this.googleCalendarService.isSignedIn$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isSignedIn => {
        this.isSignedIn = isSignedIn;
        if (isSignedIn) {
          this.loadCalendars();
        }
        this.cdr.markForCheck();
      });

    this.googleCalendarService.settings$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(settings => {
        this.settingsForm.patchValue(settings);
        this.cdr.markForCheck();
      });

    this.settingsForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        if (this.settingsForm.valid) {
          this.googleCalendarService.updateSettings(value);
        }
      });
  }


  async signIn() {
    this.isConnecting = true;
    this.cdr.markForCheck();
    try {
      await this.googleCalendarService.signIn();
    } catch (error) {
      this.logger.error('Google Calendar sign in failed:', error);
    } finally {
      this.isConnecting = false;
      this.cdr.markForCheck();
    }
  }

  async signOut() {
    try {
      await this.googleCalendarService.signOut();
      this.calendars = [];
      this.lastSyncResult = null;
      this.cdr.markForCheck();
    } catch (error) {
      this.logger.error('Google Calendar sign out failed:', error);
    }
  }

  async loadCalendars() {
    try {
      this.calendars = await this.googleCalendarService.getCalendars();
      this.cdr.markForCheck();
    } catch (error) {
      this.logger.error('Loading calendars failed:', error);
    }
  }

  async syncAllBirthdays() {
    this.isSyncing = true;
    this.cdr.markForCheck();
    try {
      const birthdays = this.birthdayFacade.birthdays();
      if (birthdays) {
        this.lastSyncResult = await this.googleCalendarService.syncAllBirthdays(birthdays);
        this.cdr.markForCheck();
      }
    } catch (error) {
      this.logger.error('Syncing birthdays failed:', error);
    } finally {
      this.isSyncing = false;
      this.cdr.markForCheck();
    }
  }

  saveSettings() {
    if (this.settingsForm.valid) {
      this.googleCalendarService.updateSettings(this.settingsForm.value);
      this.settingsForm.markAsPristine();
    }
  }

}