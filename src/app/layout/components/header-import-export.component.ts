import { Component, ChangeDetectionStrategy, inject, ViewChild, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenu } from '@angular/material/menu';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { NotificationService } from '../../core';
import { BackupService, ImportResult } from '../../core/services/backup.service';
import { Birthday } from '../../shared/models';
import { AppState } from '../../core/store/app.state';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

@Component({
  selector: 'app-header-import-export',
  imports: [
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-menu #importMenu="matMenu" [class]="menuClass">
      <button mat-menu-item (click)="importJSON.click()">
        <mat-icon aria-hidden="true">data_object</mat-icon>
        <span>{{ 'IMPORT_EXPORT.IMPORT_JSON' | translate }}</span>
      </button>
      <button mat-menu-item (click)="importCSV.click()">
        <mat-icon aria-hidden="true">table_chart</mat-icon>
        <span>{{ 'IMPORT_EXPORT.IMPORT_CSV' | translate }}</span>
      </button>
      <button mat-menu-item (click)="importVCard.click()">
        <mat-icon aria-hidden="true">contact_page</mat-icon>
        <span>{{ 'IMPORT_EXPORT.IMPORT_VCARD' | translate }}</span>
      </button>
    </mat-menu>
    <mat-menu #exportMenu="matMenu" [class]="menuClass">
      <button mat-menu-item (click)="exportJSON()">
        <mat-icon aria-hidden="true">data_object</mat-icon>
        <span>{{ 'IMPORT_EXPORT.EXPORT_JSON' | translate }}</span>
      </button>
      <button mat-menu-item (click)="exportCSV()">
        <mat-icon aria-hidden="true">table_chart</mat-icon>
        <span>{{ 'IMPORT_EXPORT.EXPORT_CSV' | translate }}</span>
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
  private readonly translate = inject(TranslateService);

  private readonly birthdays = toSignal(
    this.store.select(BirthdaySelectors.selectAllBirthdays),
    { initialValue: [] }
  );

  exportJSON(): void { this.handleExport(b => this.backupService.exportToJSON(b), 'IMPORT_EXPORT.EXPORTED_JSON'); }
  exportCSV(): void { this.handleExport(b => this.backupService.exportToCSV(b), 'IMPORT_EXPORT.EXPORTED_CSV'); }

  onImportJSON(event: Event): void { this.handleImport(event, f => this.backupService.importFromFile(f), 'IMPORT_EXPORT.INVALID_JSON'); }
  onImportCSV(event: Event): void { this.handleImport(event, f => this.backupService.importFromCSV(f), 'IMPORT_EXPORT.INVALID_CSV'); }
  onImportVCard(event: Event): void { this.handleImport(event, f => this.backupService.importFromVCard(f), 'IMPORT_EXPORT.INVALID_VCARD'); }

  private handleExport(exporter: (b: Birthday[]) => void, successKey: string): void {
    const birthdays = this.birthdays();
    if (birthdays.length === 0) {
      this.notificationService.show(this.translate.instant('IMPORT_EXPORT.NO_BIRTHDAYS'), 'warning');
      return;
    }
    exporter(birthdays);
    this.notificationService.show(this.translate.instant(successKey), 'success');
  }

  private async handleImport(event: Event, importer: (f: File) => Promise<ImportResult>, errorKey: string): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const { valid, invalid } = await importer(file);
      if (valid.length === 0) {
        this.notificationService.show(this.translate.instant(errorKey), 'error');
      } else {
        this.store.dispatch(BirthdayActions.importBirthdays({ birthdays: valid }));
        const msgKey = invalid.length > 0 ? 'IMPORT_EXPORT.IMPORTED_WITH_SKIPPED' : 'IMPORT_EXPORT.IMPORTED';
        const severity = invalid.length > 0 ? 'warning' : 'success';
        this.notificationService.show(
          this.translate.instant(msgKey, { count: valid.length, skipped: invalid.length }),
          severity
        );
      }
    } catch {
      this.notificationService.show(this.translate.instant(errorKey), 'error');
    }
    input.value = '';
  }
}
