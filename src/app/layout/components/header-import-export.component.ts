import { Component, ChangeDetectionStrategy, inject, ViewChild, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenu } from '@angular/material/menu';
import { toSignal } from '@angular/core/rxjs-interop';

import { NotificationService } from '../../core';
import { BackupService } from '../../core/services/backup.service';
import { Birthday } from '../../shared/models';
import { AppState } from '../../core/store/app.state';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

@Component({
  selector: 'app-header-import-export',
  imports: [
    MatIconModule,
    MatMenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-menu #importMenu="matMenu" [class]="menuClass">
      <button mat-menu-item (click)="importJSON.click()">
        <mat-icon>data_object</mat-icon>
        <span>Import JSON</span>
      </button>
      <button mat-menu-item (click)="importCSV.click()">
        <mat-icon>table_chart</mat-icon>
        <span>Import CSV</span>
      </button>
      <button mat-menu-item (click)="importVCard.click()">
        <mat-icon>contact_page</mat-icon>
        <span>Import vCard</span>
      </button>
    </mat-menu>
    <mat-menu #exportMenu="matMenu" [class]="menuClass">
      <button mat-menu-item (click)="exportJSON()">
        <mat-icon>data_object</mat-icon>
        <span>Export JSON</span>
      </button>
      <button mat-menu-item (click)="exportCSV()">
        <mat-icon>table_chart</mat-icon>
        <span>Export CSV</span>
      </button>
    </mat-menu>
    <input #importJSON type="file" accept=".json" hidden (change)="onImportJSON($event)">
    <input #importCSV type="file" accept=".csv" hidden (change)="onImportCSV($event)">
    <input #importVCard type="file" accept=".vcf" hidden (change)="onImportVCard($event)">
  `
})
export class HeaderImportExportComponent {
  @Input() menuClass = '';
  @ViewChild('importMenu', { static: true }) importMenu!: MatMenu;
  @ViewChild('exportMenu', { static: true }) exportMenu!: MatMenu;

  private readonly store = inject(Store<AppState>);
  private readonly backupService = inject(BackupService);
  private readonly notificationService = inject(NotificationService);

  private readonly birthdays = toSignal(
    this.store.select(BirthdaySelectors.selectAllBirthdays),
    { initialValue: [] }
  );

  exportJSON(): void { this.handleExport(b => this.backupService.exportToJSON(b), 'Exported to JSON'); }
  exportCSV(): void { this.handleExport(b => this.backupService.exportToCSV(b), 'Exported to CSV'); }

  onImportJSON(event: Event): void { this.handleImport(event, f => this.backupService.importFromFile(f), 'Invalid backup file'); }
  onImportCSV(event: Event): void { this.handleImport(event, f => this.backupService.importFromCSV(f), 'Invalid CSV file'); }
  onImportVCard(event: Event): void { this.handleImport(event, f => this.backupService.importFromVCard(f), 'Invalid vCard file'); }

  private handleExport(exporter: (b: Birthday[]) => void, successMsg: string): void {
    const birthdays = this.birthdays();
    if (birthdays.length === 0) {
      this.notificationService.show('No birthdays to export', 'warning');
      return;
    }
    exporter(birthdays);
    this.notificationService.show(successMsg, 'success');
  }

  private async handleImport(event: Event, importer: (f: File) => Promise<Birthday[]>, errorMsg: string): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const birthdays = await importer(file);
      for (const birthday of birthdays) {
        this.store.dispatch(BirthdayActions.addBirthday({ birthday }));
      }
      this.notificationService.show(`Imported ${birthdays.length} birthdays`, 'success');
    } catch {
      this.notificationService.show(errorMsg, 'error');
    }
    (event.target as HTMLInputElement).value = '';
  }
}
