import { TestBed } from '@angular/core/testing';

import { type Birthday, type ScheduledMessage } from '../../shared/models';
import { NotificationFormatterService } from './notification-formatter.service';
import { SenderSettingsService } from './sender-settings.service';

describe('NotificationFormatterService', () => {
  let service: NotificationFormatterService;
  let senderSettings: jasmine.SpyObj<SenderSettingsService>;

  const makeBirthday = (overrides: Partial<Birthday> = {}): Birthday => ({
    id: 'b1', name: 'Alice', birthDate: '1990-06-15',
    zodiacSign: 'Gemini', ...overrides,
  });

  const makeMessage = (overrides: Partial<ScheduledMessage> = {}): ScheduledMessage => ({
    id: 'm1', title: 'Happy Birthday', message: 'Hi {name}!',
    scheduledTime: '09:00', active: true, createdDate: new Date(),
    messageType: 'text', priority: 'normal', ...overrides,
  });

  beforeEach(() => {
    senderSettings = jasmine.createSpyObj('SenderSettingsService', [
      'getSenderName', 'getSenderFullName',
    ]);
    senderSettings.getSenderName.and.returnValue('Mario');
    senderSettings.getSenderFullName.and.returnValue('Mario Rossi');

    TestBed.configureTestingModule({
      providers: [
        NotificationFormatterService,
        { provide: SenderSettingsService, useValue: senderSettings },
      ],
    });
    service = TestBed.inject(NotificationFormatterService);
  });

  // ── formatMessage ─────────────────────────────────────────────────────────

  describe('formatMessage', () => {
    it('replaces {name} placeholder', () => {
      expect(service.formatMessage('Hello {name}!', makeBirthday())).toBe('Hello Alice!');
    });

    it('replaces {zodiac} placeholder', () => {
      expect(service.formatMessage('{zodiac}', makeBirthday())).toBe('Gemini');
    });

    it('replaces {sender} and {senderFull} placeholders', () => {
      expect(service.formatMessage('{sender} / {senderFull}', makeBirthday()))
        .toBe('Mario / Mario Rossi');
    });

    it('falls back to getSenderName when getSenderFullName returns empty string', () => {
      senderSettings.getSenderFullName.and.returnValue('');
      expect(service.formatMessage('{senderFull}', makeBirthday())).toBe('Mario');
    });

    it('replaces {age} with computed age string', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-06-15'));
      const result = service.formatMessage('Turns {age}', makeBirthday({ birthDate: '1990-06-15' }));
      expect(result).toBe('Turns 36');
      jasmine.clock().uninstall();
    });

    it('replaces {age} with empty string when birthDate is future', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2020-01-01'));
      const result = service.formatMessage('{age}', makeBirthday({ birthDate: '2025-06-15' }));
      expect(result).toBe('');
      jasmine.clock().uninstall();
    });

    it('replaces all occurrences of a placeholder', () => {
      expect(service.formatMessage('{name} {name}', makeBirthday())).toBe('Alice Alice');
    });
  });

  // ── calculateAge ──────────────────────────────────────────────────────────

  describe('calculateAge', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('returns correct age after birthday has passed this year', () => {
      jasmine.clock().mockDate(new Date('2026-07-01'));
      expect(service.calculateAge('1990-06-15')).toBe(36);
    });

    it('returns correct age on the birthday itself', () => {
      jasmine.clock().mockDate(new Date('2026-06-15'));
      expect(service.calculateAge('1990-06-15')).toBe(36);
    });

    it('returns age minus one before birthday this year', () => {
      jasmine.clock().mockDate(new Date('2026-06-14'));
      expect(service.calculateAge('1990-06-15')).toBe(35);
    });

    it('returns null for a future birthDate', () => {
      jasmine.clock().mockDate(new Date('2020-01-01'));
      expect(service.calculateAge('2025-06-15')).toBeNull();
    });
  });

  // ── generateNotificationId ────────────────────────────────────────────────

  describe('generateNotificationId', () => {
    it('returns a number', () => {
      expect(typeof service.generateNotificationId('b1', 'm1')).toBe('number');
    });

    it('is deterministic for the same inputs', () => {
      const id1 = service.generateNotificationId('birthday-42', 'msg-7');
      const id2 = service.generateNotificationId('birthday-42', 'msg-7');
      expect(id1).toBe(id2);
    });

    it('produces different IDs for different inputs', () => {
      expect(service.generateNotificationId('b1', 'm1'))
        .not.toBe(service.generateNotificationId('b1', 'm2'));
    });

    it('stays within 32-bit unsigned range', () => {
      const id = service.generateNotificationId('b1', 'm1');
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(0xFFFFFFFF);
    });
  });

  // ── getNextNotificationDate ───────────────────────────────────────────────

  describe('getNextNotificationDate', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('returns the next occurrence this year when birthday is still ahead', () => {
      jasmine.clock().mockDate(new Date('2026-03-27T08:00:00'));
      const result = service.getNextNotificationDate(
        makeBirthday({ birthDate: '1990-06-15' }),
        makeMessage({ scheduledTime: '09:00' }),
      )!;
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(5); // June = 5
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });

    it('rolls over to next year when birthday+time has already passed', () => {
      jasmine.clock().mockDate(new Date('2026-06-15T10:00:00'));
      const result = service.getNextNotificationDate(
        makeBirthday({ birthDate: '1990-06-15' }),
        makeMessage({ scheduledTime: '09:00' }),
      )!;
      expect(result.getFullYear()).toBe(2027);
    });

    it('does not roll over when birthday is today but time is later', () => {
      jasmine.clock().mockDate(new Date('2026-06-15T08:00:00'));
      const result = service.getNextNotificationDate(
        makeBirthday({ birthDate: '1990-06-15' }),
        makeMessage({ scheduledTime: '09:00' }),
      )!;
      expect(result.getFullYear()).toBe(2026);
    });
  });
});
