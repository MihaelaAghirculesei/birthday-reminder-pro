import { Component, Input, Output, EventEmitter, signal, ChangeDetectionStrategy, isDevMode, Signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Birthday } from '../../../../../shared';
import { BackupService, NotificationService } from '../../../../../core';

@Component({
    selector: 'app-birthday-import-export',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule
    ],
    templateUrl: './birthday-import-export.component.html',
    styleUrls: ['./birthday-import-export.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayImportExportComponent {
  @Input() totalBirthdays = 0;
  @Input() allBirthdays: Signal<Birthday[]> | Birthday[] = [];
  @Output() birthdaysImported = new EventEmitter<Birthday[]>();

  isImporting = signal(false);

  constructor(
    private backupService: BackupService,
    private notificationService: NotificationService
  ) {}

  onExportJSON(): void {
    const birthdays = this.getBirthdays();
    this.backupService.exportToJSON(birthdays);
    this.notificationService.show(`Exported ${birthdays.length} birthdays to JSON`, 'success');
  }

  onExportCSV(): void {
    const birthdays = this.getBirthdays();
    this.backupService.exportToCSV(birthdays);
    this.notificationService.show(`Exported ${birthdays.length} birthdays to CSV`, 'success');
  }

  async onImportBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting.set(true);
    try {
      const birthdays = await this.backupService.importFromFile(file);
      this.birthdaysImported.emit(birthdays);
      this.notificationService.show(`Imported ${birthdays.length} birthdays`, 'success');
    } catch (error) {
      if (isDevMode()) {
        console.error('Import failed:', error);
      }
      this.notificationService.show('Invalid backup file', 'error');
    } finally {
      this.isImporting.set(false);
      input.value = '';
    }
  }

  async onImportCSV(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting.set(true);
    try {
      const birthdays = await this.backupService.importFromCSV(file);
      this.birthdaysImported.emit(birthdays);
      this.notificationService.show(`Imported ${birthdays.length} birthdays from CSV`, 'success');
    } catch (error) {
      if (isDevMode()) {
        console.error('CSV import failed:', error);
      }
      this.notificationService.show('Invalid CSV file', 'error');
    } finally {
      this.isImporting.set(false);
      input.value = '';
    }
  }

  async onImportVCard(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting.set(true);
    try {
      const birthdays = await this.backupService.importFromVCard(file);
      this.birthdaysImported.emit(birthdays);
      this.notificationService.show(`Imported ${birthdays.length} birthdays from vCard`, 'success');
    } catch (error) {
      if (isDevMode()) {
        console.error('vCard import failed:', error);
      }
      this.notificationService.show('Invalid vCard file', 'error');
    } finally {
      this.isImporting.set(false);
      input.value = '';
    }
  }

  private getBirthdays(): Birthday[] {
    return typeof this.allBirthdays === 'function'
      ? this.allBirthdays()
      : this.allBirthdays;
  }
}
