import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Birthday } from '../../shared';
import { z } from 'zod';
import { LoggerService } from './logger.service';
import { ScheduledMessageSchema } from '../../shared/schemas/birthday.schema';

export interface BackupData {
  version: number;
  exportDate: string;
  birthdays: Birthday[];
}

const BackupSchema = z.object({
  version: z.number(),
  exportDate: z.string(),
  birthdays: z.array(z.object({
    name: z.string().min(1).max(200),
    birthDate: z.union([z.string(), z.date()]),
    id: z.string().optional(),
    notes: z.string().max(1000).optional(),
    category: z.string().max(100).optional(),
    photo: z.string().max(500).optional(),
    rememberPhoto: z.string().max(500).optional(),
    zodiacSign: z.string().max(50).optional(),
    googleCalendarEventId: z.string().optional(),
    reminderDays: z.number().optional(),
    scheduledMessages: z.array(ScheduledMessageSchema).optional()
  }))
});

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private readonly BACKUP_VERSION = 1;

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  constructor(private logger: LoggerService) {}

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
      const date = new Date(b.birthDate);
      const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return [
        this.escapeCSV(b.name),
        isoDate,
        this.escapeCSV(b.category || ''),
        this.escapeCSV(b.notes || ''),
        this.escapeCSV(b.zodiacSign || '')
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    this.downloadFile(blob, `birthday-backup-${this.getDateString()}.csv`);
  }

  async importFromFile(file: File): Promise<Birthday[]> {
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

    return validatedData.birthdays.map(b => {
      const date = new Date(b.birthDate);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date for ${b.name || 'birthday'}`);
      }
      return {
        ...b,
        birthDate: date,
        id: b.id || crypto.randomUUID()
      } as Birthday;
    });
  }

  async importFromCSV(file: File): Promise<Birthday[]> {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    const birthdays: Birthday[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < 2) continue;

      const [name, dateStr, category, notes, zodiacSign] = values;
      const birthDate = this.parseDate(dateStr);

      if (!name || !birthDate) continue;

      birthdays.push({
        id: crypto.randomUUID(),
        name: name.trim(),
        birthDate,
        category: category?.trim() || undefined,
        notes: notes?.trim() || undefined,
        zodiacSign: zodiacSign?.trim() || undefined
      });
    }

    if (birthdays.length === 0) {
      throw new Error('No valid birthdays found in CSV');
    }

    return birthdays;
  }

  async importFromVCard(file: File): Promise<Birthday[]> {
    const text = await file.text();
    return text.split('BEGIN:VCARD')
      .filter(v => v.includes('FN:') && v.includes('BDAY'))
      .flatMap(v => {
        const name = v.match(/FN:(.+)/)?.[1].trim();
        const bday = v.match(/BDAY[;:](.+)/)?.[1].split(':').pop()?.trim();
        const birthDate = bday ? this.parseDate(bday) : null;
        return name && birthDate ? [{ id: crypto.randomUUID(), name, birthDate, category: 'friends' }] : [];
      });
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

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    const cleaned = dateStr.trim();

    const dmyMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      return new Date(+dmyMatch[3], +dmyMatch[2] - 1, +dmyMatch[1]);
    }

    const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    }

    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed;
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
