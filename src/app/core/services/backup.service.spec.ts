import { TestBed } from '@angular/core/testing';

import { provideTranslateTesting } from '../../testing/translate-testing';
import { BackupService } from './backup.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SILENT_LOGGER_PROVIDER, provideTranslateTesting()]
    });
    service = TestBed.inject(BackupService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  describe('importFromFile', () => {
    it('should import valid JSON backup', async () => {
      const backup = {
        version: 1,
        exportDate: '2025-12-09T00:00:00.000Z',
        birthdays: [
          { id: '1', name: 'John', birthDate: '1990-05-15T00:00:00.000Z', category: 'friends' }
        ]
      };
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });

      const result = await service.importFromFile(file);

      expect(result.valid.length).toBe(1);
      expect(result.invalid.length).toBe(0);
      expect(result.valid[0].name).toBe('John');
      expect(typeof result.valid[0].birthDate).toBe('string');
      expect(result.valid[0].birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should throw error for invalid JSON', async () => {
      const file = new File(['invalid json'], 'backup.json', { type: 'application/json' });

      await expectAsync(service.importFromFile(file)).toBeRejectedWithError('Invalid JSON file. Please select a valid backup file.');
    });

    it('should throw error for missing birthdays array', async () => {
      const file = new File([JSON.stringify({ version: 1 })], 'backup.json', { type: 'application/json' });

      await expectAsync(service.importFromFile(file)).toBeRejectedWithError(/Invalid backup format: exportDate/);
    });

    it('should return invalid entry for invalid date instead of throwing', async () => {
      const backup = {
        version: 1,
        exportDate: '2025-12-09T00:00:00.000Z',
        birthdays: [
          { id: '1', name: 'John', birthDate: 'invalid-date', category: 'friends' }
        ]
      };
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });

      const result = await service.importFromFile(file);

      expect(result.valid.length).toBe(0);
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].name).toBe('John');
      expect(result.invalid[0].error).toContain('Invalid date');
    });

    it('should import valid entries and collect invalid ones (partial import)', async () => {
      const backup = {
        version: 1,
        exportDate: '2025-12-09T00:00:00.000Z',
        birthdays: [
          { id: '1', name: 'John', birthDate: '1990-05-15', category: 'friends' },
          { id: '2', name: 'Bad Date', birthDate: 'not-a-date', category: 'friends' }
        ]
      };
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });

      const result = await service.importFromFile(file);

      expect(result.valid.length).toBe(1);
      expect(result.valid[0].name).toBe('John');
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].name).toBe('Bad Date');
    });

    it('should generate new id if missing', async () => {
      const backup = {
        version: 1,
        exportDate: '2025-12-09T00:00:00.000Z',
        birthdays: [
          { name: 'John', birthDate: '1990-05-15T00:00:00.000Z' }
        ]
      };
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });

      const result = await service.importFromFile(file);

      expect(result.valid[0].id).toBeTruthy();
    });
  });

  describe('importFromCSV', () => {
    it('should import valid CSV', async () => {
      const csv = 'Name,Birth Date,Category,Notes,Zodiac Sign\nJohn,1990-05-15,friends,Test note,Taurus';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.valid.length).toBe(1);
      expect(result.invalid.length).toBe(0);
      expect(result.valid[0].name).toBe('John');
      expect(result.valid[0].category).toBe('friends');
      expect(result.valid[0].notes).toBe('Test note');
    });

    it('should handle CSV with quoted values', async () => {
      const csv = 'Name,Birth Date,Category,Notes,Zodiac Sign\n"Smith, John",1990-05-15,friends,"Note, with comma",Taurus';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.valid[0].name).toBe('Smith, John');
      expect(result.valid[0].notes).toBe('Note, with comma');
    });

    it('should parse different date formats', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,15/05/1990,friends\nJane,1990-05-15,family';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.valid.length).toBe(2);
      expect(typeof result.valid[0].birthDate).toBe('string');
      expect(typeof result.valid[1].birthDate).toBe('string');
    });

    it('should collect invalid rows instead of silently skipping', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,1990-05-15,friends\n,invalid,test\nJane,1990-06-20,family';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.valid.length).toBe(2);
      expect(result.invalid.length).toBe(1);
    });

    it('should throw error for empty CSV', async () => {
      const file = new File(['Name,Birth Date\n'], 'backup.csv', { type: 'text/csv' });

      await expectAsync(service.importFromCSV(file)).toBeRejectedWithError('CSV file is empty or has no data rows');
    });

    it('should throw error when CSV exceeds 10,000 rows', async () => {
      const dataRows = Array.from({ length: 10_000 }, (_, i) => `Person${i},1990-05-15,friends`).join('\n');
      const csv = `Name,Birth Date,Category\n${dataRows}`;
      const file = new File([csv], 'large.csv', { type: 'text/csv' });

      await expectAsync(service.importFromCSV(file)).toBeRejectedWithError('CSV file exceeds the maximum limit of 10,000 rows');
    });
  });

  describe('importFromVCard', () => {
    it('should import vCard with birthday', async () => {
      const vcard = 'BEGIN:VCARD\nFN:John Smith\nBDAY:1990-05-15\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.valid.length).toBe(1);
      expect(result.invalid.length).toBe(0);
      expect(result.valid[0].name).toBe('John Smith');
      expect(typeof result.valid[0].birthDate).toBe('string');
      expect(result.valid[0].category).toBe('friends');
    });

    it('should collect vCards without birthday into invalid', async () => {
      const vcard = 'BEGIN:VCARD\nFN:John Smith\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.valid.length).toBe(0);
    });

    it('should handle vCard with BDAY property syntax', async () => {
      const vcard = 'BEGIN:VCARD\nFN:Jane Doe\nBDAY;VALUE=DATE:1990-05-15\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.valid.length).toBe(1);
      expect(result.valid[0].name).toBe('Jane Doe');
    });

    it('should parse multiple vCards', async () => {
      const vcard = 'BEGIN:VCARD\nFN:John\nBDAY:1990-05-15\nEND:VCARD\nBEGIN:VCARD\nFN:Jane\nBDAY:1985-06-20\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.valid.length).toBe(2);
    });

    it('should collect vCards with invalid birthdates into invalid', async () => {
      const vcard = 'BEGIN:VCARD\nFN:Invalid\nBDAY:not-a-date\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.valid.length).toBe(0);
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].name).toBe('Invalid');
    });
  });

  describe('exportToJSON', () => {
    it('should export birthdays to JSON', () => {
      const birthdays = [{
        id: '1',
        name: 'John',
        birthDate: '1990-05-15',
        zodiacSign: 'Taurus',
        reminderDays: 7
      }];

      spyOn(document, 'createElement').and.callThrough();

      service.exportToJSON(birthdays);

      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('exportToCSV', () => {
    it('should export birthdays to CSV', () => {
      const birthdays = [{
        id: '1',
        name: 'John',
        birthDate: '1990-05-15',
        category: 'friends',
        notes: 'Test',
        zodiacSign: 'Taurus',
        reminderDays: 7
      }];

      spyOn(document, 'createElement').and.callThrough();

      service.exportToCSV(birthdays);

      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should escape CSV special characters', () => {
      const birthdays = [{
        id: '1',
        name: 'Smith, John',
        birthDate: '1990-05-15',
        notes: 'Has "quotes"',
        category: 'Line\nbreak',
        zodiacSign: 'Taurus',
        reminderDays: 7
      }];

      spyOn(document, 'createElement').and.callThrough();

      service.exportToCSV(birthdays);

      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('importFromCSV edge cases', () => {
    it('should return all as invalid when no valid birthdays exist', async () => {
      const csv = 'Name,Birth Date\n,invalid-date';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.valid.length).toBe(0);
      expect(result.invalid.length).toBeGreaterThan(0);
    });

    it('should handle CSV with empty category fields', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,1990-05-15,';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.valid[0].category).toBeUndefined();
    });

    it('should collect invalid date rows and return valid ones', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,not-a-date,friends\nJane,1990-05-15,family';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.valid.length).toBe(1);
      expect(result.valid[0].name).toBe('Jane');
      expect(result.invalid.length).toBe(1);
      expect(result.invalid[0].name).toBe('John');
    });
  });
});
