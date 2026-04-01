import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Birthday } from '../../shared';
import { toDateString } from '../../shared/utils/date.utils';
import { z } from 'zod';
import { LoggerService } from './logger.service';
import { BirthdaySchema, sanitizeBirthdayData, safeParseBirthday } from '../../shared/schemas/birthday.schema';

export interface BackupData {
  version: number;
  exportDate: string;
  birthdays: Birthday[];
}

export interface ImportResult {
  valid: Birthday[];
  invalid: { name: string; error: string }[];
}

const BackupBirthdaySchema = BirthdaySchema.extend({
  id: z.string().optional(),
  // Accept any string here; toDateString() normalises ISO datetimes → YYYY-MM-DD after parse
  birthDate: z.string()
});

const BackupSchema = z.object({
  version: z.number(),
  exportDate: z.string(),
  birthdays: z.array(BackupBirthdaySchema)
});

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private readonly BACKUP_VERSION = 1;

  private readonly document = inject(DOCUMENT) as Document;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  exportToJSON(birthdays: Birthday[]): void {
    const backup: BackupData = {
      version: this.BACKUP_VERSION,
      exportDate: new Date().toISOString(),
      birthdays
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    this.downloadFile(blob, `birthday-backup-${this.getDateString()}.json`);
  }

  exportToCSV(birthdays: Birthday[]): void {
    const headers = ['Name', 'Birth Date', 'Category', 'Notes', 'Zodiac Sign'];
    const rows = birthdays.map(b => {
      return [
        this.escapeCSV(b.name),
        b.birthDate,
        this.escapeCSV(b.category || ''),
        this.escapeCSV(b.notes || ''),
        this.escapeCSV(b.zodiacSign || '')
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadFile(blob, `birthday-backup-${this.getDateString()}.csv`);
  }

  async importFromFile(file: File): Promise<ImportResult> {
    const text = await file.text();

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(text);
    } catch (error) {
      this.logger.error('Failed to parse JSON backup file:', error);
      throw new Error('Invalid JSON file. Please select a valid backup file.');
    }

    let validatedData: z.infer<typeof BackupSchema>;
    try {
      validatedData = BackupSchema.parse(parsedData);
    } catch (error) {
      this.logger.error('Backup validation failed:', error);
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        throw new Error(`Invalid backup format: ${firstError.path.join('.')} - ${firstError.message}`);
      }
      throw new Error('Invalid backup file format');
    }

    const valid: Birthday[] = [];
    const invalid: { name: string; error: string }[] = [];

    for (const b of validatedData.birthdays) {
      const birthDate = toDateString(b.birthDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        invalid.push({ name: b.name, error: `Invalid date for ${b.name}` });
        continue;
      }
      const assembled = { ...b, birthDate, id: b.id || crypto.randomUUID() };
      const result = safeParseBirthday(assembled);
      if (!result.success) {
        invalid.push({ name: b.name, error: result.error.issues[0]?.message ?? 'Invalid data' });
      } else {
        valid.push(result.data);
      }
    }

    return { valid, invalid };
  }

  async importFromCSV(file: File): Promise<ImportResult> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    if (lines.length > 10_000) {
      throw new Error('CSV file exceeds the maximum limit of 10,000 rows');
    }

    const valid: Birthday[] = [];
    const invalid: { name: string; error: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < 2) {
        invalid.push({ name: `Row ${i}`, error: 'Insufficient columns' });
        continue;
      }

      const [name, dateStr, category, notes, zodiacSign] = values;
      const birthDate = this.parseDate(dateStr);

      if (!name || !birthDate) {
        invalid.push({ name: name?.trim() || `Row ${i}`, error: !name ? 'Missing name' : 'Invalid date' });
        continue;
      }

      const candidate = sanitizeBirthdayData({
        id: crypto.randomUUID(),
        name: name.trim(),
        birthDate,
        category: category?.trim() || undefined,
        notes: notes?.trim() || undefined,
        zodiacSign: zodiacSign?.trim() || undefined
      });

      const result = safeParseBirthday(candidate);
      if (result.success) {
        valid.push(result.data);
      } else {
        invalid.push({ name: name.trim(), error: result.error.issues[0]?.message ?? 'Invalid data' });
        this.logger.warn(`[Import] Skipping invalid CSV row ${i}:`, result.error.issues);
      }
    }

    return { valid, invalid };
  }

  async importFromVCard(file: File): Promise<ImportResult> {
    const text = await file.text();
    const valid: Birthday[] = [];
    const invalid: { name: string; error: string }[] = [];

    const entries = text.split('BEGIN:VCARD')
      .filter(v => v.includes('FN:') && v.includes('BDAY'));

    for (const v of entries) {
      const name = v.match(/FN:(.+)/)?.[1].trim();
      const bday = v.match(/BDAY[;:](.+)/)?.[1].split(':').pop()?.trim();
      const birthDate = bday ? this.parseDate(bday) : null;

      if (!name || !birthDate) {
        invalid.push({ name: name ?? 'Unknown', error: !birthDate ? 'Invalid or missing birth date' : 'Missing name' });
        continue;
      }

      const candidate = sanitizeBirthdayData({
        id: crypto.randomUUID(),
        name,
        birthDate,
        category: 'friends'
      });

      const result = safeParseBirthday(candidate);
      if (result.success) {
        valid.push(result.data);
      } else {
        invalid.push({ name, error: result.error.issues[0]?.message ?? 'Invalid data' });
        this.logger.warn('[Import] Skipping invalid vCard entry:', name, result.error.issues);
      }
    }

    return { valid, invalid };
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null;

    const cleaned = dateStr.trim();

    const dmyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${String(+dmyMatch[2]).padStart(2, '0')}-${String(+dmyMatch[1]).padStart(2, '0')}`;
    }

    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return cleaned;
    }

    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : toDateString(parsed);
  }

  private downloadFile(blob: Blob, filename: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
