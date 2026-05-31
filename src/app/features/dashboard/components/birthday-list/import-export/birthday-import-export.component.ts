import { ChangeDetectionStrategy, Component, EventEmitter, inject,Input, Output, type Signal, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TranslatePipe } from '@ngx-translate/core';

import { BackupService, type ImportResult,LoggerService, NotificationService } from '../../../../../core';
import { type Birthday } from '../../../../../shared';

@Component({
    selector: 'app-birthday-import-export',
    imports: [
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        TranslatePipe
    ],
    templateUrl: './birthday-import-export.component.html',
    styleUrls: ['./birthday-import-export.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BirthdayImportExportComponent {
  private backupService = inject(BackupService);
  private notificationService = inject(NotificationService);

  @Input() totalBirthdays = 0;
  @Input() allBirthdays: Signal<Birthday[]> | Birthday[] = [];
  @Output() birthdaysImported = new EventEmitter<Birthday[]>();

  isImporting = signal(false);

  private readonly logger = inject(LoggerService);

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

  onImportBackup(event: Event): Promise<void> { return this.handleImport(event, f => this.backupService.importFromFile(f), '', 'Invalid backup file'); }
  onImportCSV(event: Event): Promise<void> { return this.handleImport(event, f => this.backupService.importFromCSV(f), ' from CSV', 'Invalid CSV file'); }
  onImportVCard(event: Event): Promise<void> { return this.handleImport(event, f => this.backupService.importFromVCard(f), ' from vCard', 'Invalid vCard file'); }

  private async handleImport(event: Event, importer: (f: File) => Promise<ImportResult>, suffix: string, errorMsg: string): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isImporting.set(true);
    try {
      const { valid, invalid } = await importer(file);
      this.birthdaysImported.emit(valid);
      if (valid.length === 0) {
        this.notificationService.show(errorMsg, 'error');
      } else if (invalid.length > 0) {
        this.notificationService.show(`Imported ${valid.length} birthdays${suffix} (${invalid.length} skipped)`, 'warning');
      } else {
        this.notificationService.show(`Imported ${valid.length} birthdays${suffix}`, 'success');
      }
    } catch (error) {
      this.logger.error('Import failed:', error);
      this.notificationService.show(errorMsg, 'error');
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
