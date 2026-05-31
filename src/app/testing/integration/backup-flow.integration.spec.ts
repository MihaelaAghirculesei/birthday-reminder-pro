import { TestBed } from '@angular/core/testing';

import { type BackupData,BackupService } from '../../core/services/backup.service';
import { LoggerService, SILENT_LOGGING } from '../../core/services/logger.service';
import { createMockBirthday } from '../mock-data/birthday-mock.data';
import { provideTranslateTesting } from '../translate-testing';

describe('Backup Flow Integration', () => {
  let backupService: BackupService;

  const mockBirthdays = [
    createMockBirthday({ id: 'test-1', name: 'Alice Johnson', birthDate: '1990-06-15', category: 'family', notes: 'Loves chocolate' }),
    createMockBirthday({ id: 'test-2', name: 'Bob Smith', birthDate: '1985-12-25', category: 'friends', notes: 'Birthday on Christmas!' }),
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BackupService,
        LoggerService,
        { provide: SILENT_LOGGING, useValue: true },
        provideTranslateTesting()
      ]
    });

    backupService = TestBed.inject(BackupService);
  });

  describe('JSON Import/Export', () => {
    it('should export and reimport birthdays without data loss', async () => {
      let exportedContent = '';
      spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => exportedContent = reader.result as string;
        reader.readAsText(blob);
        return 'blob:test';
      });
      spyOn(URL, 'revokeObjectURL');

      const mockAnchor = { href: '', download: '', click: jasmine.createSpy('click') };
      spyOn(document, 'createElement').and.returnValue(mockAnchor as unknown as HTMLAnchorElement);
      spyOn(document.body, 'appendChild').and.stub();
      spyOn(document.body, 'removeChild').and.stub();

      backupService.exportToJSON(mockBirthdays);

      await new Promise(resolve => setTimeout(resolve, 50));

      const parsed: BackupData = JSON.parse(exportedContent);

      expect(parsed.version).toBe(1);
      expect(parsed.birthdays.length).toBe(2);
      expect(parsed.birthdays[0].name).toBe('Alice Johnson');
      expect(parsed.birthdays[1].name).toBe('Bob Smith');

      const file = new File([exportedContent], 'backup.json', { type: 'application/json' });
      const imported = await backupService.importFromFile(file);

      expect(imported.valid.length).toBe(2);
      expect(imported.invalid.length).toBe(0);
      expect(imported.valid[0].name).toBe('Alice Johnson');
      expect(typeof imported.valid[0].birthDate).toBe('string');
      expect(imported.valid[0].birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(imported.valid[1].name).toBe('Bob Smith');
    });

    it('should reject invalid JSON structure', async () => {
      const invalidFile = new File(['{ invalid json }'], 'bad.json', { type: 'application/json' });

      await expectAsync(backupService.importFromFile(invalidFile))
        .toBeRejectedWithError(/Invalid JSON file/);
    });

    it('should reject missing required fields', async () => {
      const incompleteData = JSON.stringify({
        version: 1,
        exportDate: new Date().toISOString(),
        birthdays: [{ notes: 'Missing name and birthDate' }]
      });
      const file = new File([incompleteData], 'incomplete.json', { type: 'application/json' });

      await expectAsync(backupService.importFromFile(file))
        .toBeRejectedWithError(/Invalid backup format/);
    });
  });

  describe('CSV Import/Export', () => {
    it('should export to CSV format', async () => {
      let exportedContent = '';
      spyOn(URL, 'createObjectURL').and.callFake((blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => exportedContent = reader.result as string;
        reader.readAsText(blob);
        return 'blob:test';
      });
      spyOn(URL, 'revokeObjectURL');

      const mockAnchor = { href: '', download: '', click: jasmine.createSpy('click') };
      spyOn(document, 'createElement').and.returnValue(mockAnchor as unknown as HTMLAnchorElement);
      spyOn(document.body, 'appendChild').and.stub();
      spyOn(document.body, 'removeChild').and.stub();

      backupService.exportToCSV(mockBirthdays);

      await new Promise(resolve => setTimeout(resolve, 50));

      const lines = exportedContent.split('\n');
      expect(lines[0]).toBe('Name,Birth Date,Category,Notes,Zodiac Sign');
      expect(lines[1]).toContain('Alice Johnson');
      expect(lines[2]).toContain('Bob Smith');
    });

    it('should import from CSV format', async () => {
      const csvContent = `Name,Birth Date,Category,Notes,Zodiac Sign
Alice Johnson,1990-06-15,family,Loves chocolate,Gemini
Bob Smith,1985-12-25,friends,Birthday on Christmas,Capricorn`;

      const file = new File([csvContent], 'birthdays.csv', { type: 'text/csv' });
      const imported = await backupService.importFromCSV(file);

      expect(imported.valid.length).toBe(2);
      expect(imported.valid[0].name).toBe('Alice Johnson');
      expect(imported.valid[0].category).toBe('family');
      expect(imported.valid[1].name).toBe('Bob Smith');
    });

    it('should handle CSV with quoted fields', async () => {
      const csvContent = `Name,Birth Date,Category,Notes,Zodiac Sign
"Smith, John",1990-01-15,family,"Note with, comma",Capricorn`;

      const file = new File([csvContent], 'quoted.csv', { type: 'text/csv' });
      const imported = await backupService.importFromCSV(file);

      expect(imported.valid[0].name).toBe('Smith, John');
      expect(imported.valid[0].notes).toBe('Note with, comma');
    });

    it('should reject empty CSV', async () => {
      const file = new File(['Name,Birth Date'], 'empty.csv', { type: 'text/csv' });

      await expectAsync(backupService.importFromCSV(file))
        .toBeRejectedWithError(/CSV file is empty/);
    });
  });

  describe('VCard Import', () => {
    it('should import from VCard format', async () => {
      const vcardContent = `BEGIN:VCARD
VERSION:3.0
FN:Alice Johnson
BDAY:1990-06-15
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Bob Smith
BDAY:1985-12-25
END:VCARD`;

      const file = new File([vcardContent], 'contacts.vcf', { type: 'text/vcard' });
      const imported = await backupService.importFromVCard(file);

      expect(imported.valid.length).toBe(2);
      expect(imported.valid[0].name).toBe('Alice Johnson');
      expect(imported.valid[1].name).toBe('Bob Smith');
    });

    it('should skip VCard entries without birthday', async () => {
      const vcardContent = `BEGIN:VCARD
FN:No Birthday Person
END:VCARD
BEGIN:VCARD
FN:Has Birthday
BDAY:1990-01-01
END:VCARD`;

      const file = new File([vcardContent], 'contacts.vcf', { type: 'text/vcard' });
      const imported = await backupService.importFromVCard(file);

      expect(imported.valid.length).toBe(1);
      expect(imported.valid[0].name).toBe('Has Birthday');
    });
  });
});
