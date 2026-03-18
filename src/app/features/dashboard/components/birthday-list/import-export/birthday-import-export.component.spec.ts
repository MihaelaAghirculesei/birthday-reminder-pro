import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BirthdayImportExportComponent } from './birthday-import-export.component';
import { BackupService, NotificationService } from '../../../../../core';
import { Birthday } from '../../../../../shared';

interface MockFileInputEvent {
  target: HTMLInputElement | { files: File[] };
}

describe('BirthdayImportExportComponent', () => {
  let component: BirthdayImportExportComponent;
  let fixture: ComponentFixture<BirthdayImportExportComponent>;
  let backupServiceSpy: jasmine.SpyObj<BackupService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'John Doe',
      birthDate: '1990-01-15',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      category: 'friends'
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: '1992-05-20',
      zodiacSign: 'Taurus',
      reminderDays: 7,
      category: 'family'
    }
  ];

  beforeEach(async () => {
    const backupSpy = jasmine.createSpyObj('BackupService', [
      'exportToJSON',
      'exportToCSV',
      'importFromFile',
      'importFromCSV',
      'importFromVCard'
    ]);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['show']);

    await TestBed.configureTestingModule({
      imports: [BirthdayImportExportComponent],
      providers: [
        { provide: BackupService, useValue: backupSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BirthdayImportExportComponent);
    component = fixture.componentInstance;
    backupServiceSpy = TestBed.inject(BackupService) as jasmine.SpyObj<BackupService>;
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Export functionality', () => {
    it('should export birthdays to JSON using array input', () => {
      component.allBirthdays = mockBirthdays;
      component.onExportJSON();

      expect(backupServiceSpy.exportToJSON).toHaveBeenCalledWith(mockBirthdays);
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Exported 2 birthdays to JSON',
        'success'
      );
    });

    it('should export birthdays to JSON using Signal input', () => {
      component.allBirthdays = signal(mockBirthdays);
      component.onExportJSON();

      expect(backupServiceSpy.exportToJSON).toHaveBeenCalledWith(mockBirthdays);
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Exported 2 birthdays to JSON',
        'success'
      );
    });

    it('should export birthdays to CSV using array input', () => {
      component.allBirthdays = mockBirthdays;
      component.onExportCSV();

      expect(backupServiceSpy.exportToCSV).toHaveBeenCalledWith(mockBirthdays);
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Exported 2 birthdays to CSV',
        'success'
      );
    });

    it('should export birthdays to CSV using Signal input', () => {
      component.allBirthdays = signal(mockBirthdays);
      component.onExportCSV();

      expect(backupServiceSpy.exportToCSV).toHaveBeenCalledWith(mockBirthdays);
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Exported 2 birthdays to CSV',
        'success'
      );
    });

    it('should disable export buttons when importing', () => {
      component.totalBirthdays = 2;
      component.isImporting.set(true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const exportButtons = Array.from(buttons as NodeListOf<HTMLButtonElement>).filter((btn) =>
        btn.textContent?.includes('JSON') || btn.textContent?.includes('CSV')
      );

      exportButtons.forEach((btn) => {
        expect(btn.disabled).toBe(true);
      });
    });
  });

  describe('Import functionality', () => {
    let mockFile: File;
    let mockEvent: MockFileInputEvent;
    let mockInput: HTMLInputElement;

    beforeEach(() => {
      mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      mockInput = document.createElement('input');
      mockInput.type = 'file';
      Object.defineProperty(mockInput, 'files', {
        value: [mockFile],
        writable: false
      });
      mockEvent = { target: mockInput };
    });

    it('should import birthdays from JSON and emit event', async () => {
      backupServiceSpy.importFromFile.and.returnValue(Promise.resolve(mockBirthdays));
      spyOn(component.birthdaysImported, 'emit');

      await component.onImportBackup(mockEvent as unknown as Event);

      expect(backupServiceSpy.importFromFile).toHaveBeenCalledWith(mockFile);
      expect(component.birthdaysImported.emit).toHaveBeenCalledWith(mockBirthdays);
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Imported 2 birthdays',
        'success'
      );
      expect(component.isImporting()).toBe(false);
      expect(mockInput.value).toBe('');
    });

    it('should import birthdays from CSV and emit event', async () => {
      backupServiceSpy.importFromCSV.and.returnValue(Promise.resolve(mockBirthdays));
      spyOn(component.birthdaysImported, 'emit');

      await component.onImportCSV(mockEvent as unknown as Event);

      expect(backupServiceSpy.importFromCSV).toHaveBeenCalledWith(mockFile);
      expect(component.birthdaysImported.emit).toHaveBeenCalledWith(mockBirthdays);
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Imported 2 birthdays from CSV',
        'success'
      );
      expect(component.isImporting()).toBe(false);
      expect(mockInput.value).toBe('');
    });

    it('should import birthdays from vCard and emit event', async () => {
      backupServiceSpy.importFromVCard.and.returnValue(Promise.resolve(mockBirthdays));
      spyOn(component.birthdaysImported, 'emit');

      await component.onImportVCard(mockEvent as unknown as Event);

      expect(backupServiceSpy.importFromVCard).toHaveBeenCalledWith(mockFile);
      expect(component.birthdaysImported.emit).toHaveBeenCalledWith(mockBirthdays);
      expect(notificationServiceSpy.show).toHaveBeenCalledWith(
        'Imported 2 birthdays from vCard',
        'success'
      );
      expect(component.isImporting()).toBe(false);
      expect(mockInput.value).toBe('');
    });

    it('should set isImporting to true during JSON import', async () => {
      backupServiceSpy.importFromFile.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve(mockBirthdays), 100))
      );

      const importPromise = component.onImportBackup(mockEvent as unknown as Event);
      expect(component.isImporting()).toBe(true);

      await importPromise;
      expect(component.isImporting()).toBe(false);
    });

    it('should set isImporting to true during CSV import', async () => {
      backupServiceSpy.importFromCSV.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve(mockBirthdays), 100))
      );

      const importPromise = component.onImportCSV(mockEvent as unknown as Event);
      expect(component.isImporting()).toBe(true);

      await importPromise;
      expect(component.isImporting()).toBe(false);
    });

    it('should set isImporting to true during vCard import', async () => {
      backupServiceSpy.importFromVCard.and.returnValue(
        new Promise(resolve => setTimeout(() => resolve(mockBirthdays), 100))
      );

      const importPromise = component.onImportVCard(mockEvent as unknown as Event);
      expect(component.isImporting()).toBe(true);

      await importPromise;
      expect(component.isImporting()).toBe(false);
    });

    it('should handle JSON import error', async () => {
      spyOn(console, 'error');
      backupServiceSpy.importFromFile.and.returnValue(Promise.reject(new Error('Invalid file')));

      await component.onImportBackup(mockEvent as unknown as Event);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith('Invalid backup file', 'error');
      expect(component.isImporting()).toBe(false);
      expect(mockInput.value).toBe('');
    });

    it('should handle CSV import error', async () => {
      spyOn(console, 'error');
      backupServiceSpy.importFromCSV.and.returnValue(Promise.reject(new Error('Invalid file')));

      await component.onImportCSV(mockEvent as unknown as Event);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith('Invalid CSV file', 'error');
      expect(component.isImporting()).toBe(false);
      expect(mockInput.value).toBe('');
    });

    it('should handle vCard import error', async () => {
      spyOn(console, 'error');
      backupServiceSpy.importFromVCard.and.returnValue(Promise.reject(new Error('Invalid file')));

      await component.onImportVCard(mockEvent as unknown as Event);

      expect(notificationServiceSpy.show).toHaveBeenCalledWith('Invalid vCard file', 'error');
      expect(component.isImporting()).toBe(false);
      expect(mockInput.value).toBe('');
    });

    it('should not import if no file is selected for JSON', async () => {
      const emptyEvent: MockFileInputEvent = { target: { files: [] } };
      spyOn(component.birthdaysImported, 'emit');

      await component.onImportBackup(emptyEvent as unknown as Event);

      expect(backupServiceSpy.importFromFile).not.toHaveBeenCalled();
      expect(component.birthdaysImported.emit).not.toHaveBeenCalled();
    });

    it('should not import if no file is selected for CSV', async () => {
      const emptyEvent: MockFileInputEvent = { target: { files: [] } };
      spyOn(component.birthdaysImported, 'emit');

      await component.onImportCSV(emptyEvent as unknown as Event);

      expect(backupServiceSpy.importFromCSV).not.toHaveBeenCalled();
      expect(component.birthdaysImported.emit).not.toHaveBeenCalled();
    });

    it('should not import if no file is selected for vCard', async () => {
      const emptyEvent: MockFileInputEvent = { target: { files: [] } };
      spyOn(component.birthdaysImported, 'emit');

      await component.onImportVCard(emptyEvent as unknown as Event);

      expect(backupServiceSpy.importFromVCard).not.toHaveBeenCalled();
      expect(component.birthdaysImported.emit).not.toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should not render when totalBirthdays is 0', () => {
      component.totalBirthdays = 0;
      fixture.detectChanges();

      const backupCard = fixture.nativeElement.querySelector('.backup-card');
      expect(backupCard).toBeFalsy();
    });

    it('should render when totalBirthdays is greater than 0', () => {
      component.totalBirthdays = 1;
      fixture.detectChanges();

      const backupCard = fixture.nativeElement.querySelector('.backup-card');
      expect(backupCard).toBeTruthy();
    });

    it('should show "Importing..." text on buttons when importing', () => {
      component.totalBirthdays = 1;
      component.isImporting.set(true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const importButtons = Array.from(buttons as NodeListOf<HTMLButtonElement>).filter((btn) =>
        btn.textContent?.includes('Importing...')
      );

      expect(importButtons.length).toBeGreaterThan(0);
    });
  });
});
