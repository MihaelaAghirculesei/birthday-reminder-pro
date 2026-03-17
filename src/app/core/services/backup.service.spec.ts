import { TestBed } from '@angular/core/testing';
import { BackupService } from './backup.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('BackupService', () => {
  let service: BackupService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SILENT_LOGGER_PROVIDER]
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

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John');
      expect(typeof result[0].birthDate).toBe('string');
      expect(result[0].birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should throw error for invalid JSON', async () => {
      const file = new File(['invalid json'], 'backup.json', { type: 'application/json' });

      await expectAsync(service.importFromFile(file)).toBeRejectedWithError('Invalid JSON file. Please select a valid backup file.');
    });

    it('should throw error for missing birthdays array', async () => {
      const file = new File([JSON.stringify({ version: 1 })], 'backup.json', { type: 'application/json' });

      await expectAsync(service.importFromFile(file)).toBeRejectedWithError(/Invalid backup format: exportDate/);
    });

    it('should throw error for invalid date', async () => {
      const backup = {
        version: 1,
        exportDate: '2025-12-09T00:00:00.000Z',
        birthdays: [
          { id: '1', name: 'John', birthDate: 'invalid-date', category: 'friends' }
        ]
      };
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });

      await expectAsync(service.importFromFile(file)).toBeRejectedWithError('Invalid date for John');
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

      expect(result[0].id).toBeTruthy();
    });
  });

  describe('importFromCSV', () => {
    it('should import valid CSV', async () => {
      const csv = 'Name,Birth Date,Category,Notes,Zodiac Sign\nJohn,1990-05-15,friends,Test note,Taurus';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John');
      expect(result[0].category).toBe('friends');
      expect(result[0].notes).toBe('Test note');
    });

    it('should handle CSV with quoted values', async () => {
      const csv = 'Name,Birth Date,Category,Notes,Zodiac Sign\n"Smith, John",1990-05-15,friends,"Note, with comma",Taurus';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result[0].name).toBe('Smith, John');
      expect(result[0].notes).toBe('Note, with comma');
    });

    it('should parse different date formats', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,15/05/1990,friends\nJane,1990-05-15,family';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.length).toBe(2);
      expect(typeof result[0].birthDate).toBe('string');
      expect(typeof result[1].birthDate).toBe('string');
    });

    it('should skip rows with invalid data', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,1990-05-15,friends\n,invalid,test\nJane,1990-06-20,family';
      const file = new File([csv], 'backup.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.length).toBe(2);
    });

    it('should throw error for empty CSV', async () => {
      const file = new File(['Name,Birth Date\n'], 'backup.csv', { type: 'text/csv' });

      await expectAsync(service.importFromCSV(file)).toBeRejectedWithError('CSV file is empty or has no data rows');
    });
  });

  describe('importFromVCard', () => {
    it('should import vCard with birthday', async () => {
      const vcard = 'BEGIN:VCARD\nFN:John Smith\nBDAY:1990-05-15\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('John Smith');
      expect(typeof result[0].birthDate).toBe('string');
      expect(result[0].category).toBe('friends');
    });

    it('should skip vCards without birthday', async () => {
      const vcard = 'BEGIN:VCARD\nFN:John Smith\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.length).toBe(0);
    });

    it('should handle vCard with BDAY property syntax', async () => {
      const vcard = 'BEGIN:VCARD\nFN:Jane Doe\nBDAY;VALUE=DATE:1990-05-15\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Jane Doe');
    });

    it('should parse multiple vCards', async () => {
      const vcard = 'BEGIN:VCARD\nFN:John\nBDAY:1990-05-15\nEND:VCARD\nBEGIN:VCARD\nFN:Jane\nBDAY:1985-06-20\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.length).toBe(2);
    });

    it('should skip vCards with invalid birthdates', async () => {
      const vcard = 'BEGIN:VCARD\nFN:Invalid\nBDAY:not-a-date\nEND:VCARD';
      const file = new File([vcard], 'contacts.vcf', { type: 'text/vcard' });

      const result = await service.importFromVCard(file);

      expect(result.length).toBe(0);
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
    it('should throw error when no valid birthdays after parsing', async () => {
      const csv = 'Name,Birth Date\n,invalid-date';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });

      await expectAsync(service.importFromCSV(file)).toBeRejectedWithError('No valid birthdays found in CSV');
    });

    it('should handle CSV with empty category fields', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,1990-05-15,';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result[0].category).toBeUndefined();
    });

    it('should handle invalid date strings', async () => {
      const csv = 'Name,Birth Date,Category\nJohn,not-a-date,friends\nJane,1990-05-15,family';
      const file = new File([csv], 'test.csv', { type: 'text/csv' });

      const result = await service.importFromCSV(file);

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Jane');
    });
  });
});
