import { TestBed } from '@angular/core/testing';
import type { MockedObject } from 'vitest';

import { type Birthday } from '../../shared/models/birthday.model';
import { CalendarIntegrationService } from './calendar-integration.service';
import { FeatureFlagsService } from './feature-flags.service';
import { GoogleCalendarService } from './google-calendar.service';
import { LoggerService } from './logger.service';

const BIRTHDAY: Birthday = { id: '1', name: 'Alice', birthDate: '1990-06-15' };
const BIRTHDAY_WITH_EVENT: Birthday = { ...BIRTHDAY, googleCalendarEventId: 'evt-123' };

describe('CalendarIntegrationService', () => {
  let service: CalendarIntegrationService;
  let googleCalendar: MockedObject<GoogleCalendarService>;
  let logger: MockedObject<LoggerService>;
  let featureFlags: MockedObject<FeatureFlagsService>;

  beforeEach(() => {
    googleCalendar = {
      isEnabled: vi.fn().mockName('GoogleCalendarService.isEnabled'),
      syncBirthdayToCalendar: vi.fn().mockName('GoogleCalendarService.syncBirthdayToCalendar'),
      updateBirthdayInCalendar: vi.fn().mockName('GoogleCalendarService.updateBirthdayInCalendar'),
      deleteBirthdayFromCalendar: vi.fn().mockName('GoogleCalendarService.deleteBirthdayFromCalendar')
    } as unknown as MockedObject<GoogleCalendarService>;
    logger = {
      error: vi.fn().mockName('LoggerService.error')
    } as unknown as MockedObject<LoggerService>;
    featureFlags = {
      isCalendarSyncEnabled: vi.fn().mockName('FeatureFlagsService.isCalendarSyncEnabled')
    } as unknown as MockedObject<FeatureFlagsService>;
    featureFlags.isCalendarSyncEnabled.mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        CalendarIntegrationService,
        { provide: GoogleCalendarService, useValue: googleCalendar },
        { provide: LoggerService, useValue: logger },
        { provide: FeatureFlagsService, useValue: featureFlags }
      ]
    });

    service = TestBed.inject(CalendarIntegrationService);
  });

  describe('syncToCalendar', () => {
    it('returns null immediately when calendar is disabled', async () => {
      googleCalendar.isEnabled.mockReturnValue(false);
      expect(await service.syncToCalendar(BIRTHDAY)).toBeNull();
      expect(googleCalendar.syncBirthdayToCalendar).not.toHaveBeenCalled();
    });

    it('returns event id on success', async () => {
      googleCalendar.isEnabled.mockReturnValue(true);
      googleCalendar.syncBirthdayToCalendar.mockResolvedValue('evt-123');
      expect(await service.syncToCalendar(BIRTHDAY)).toBe('evt-123');
    });

    it('returns null and logs on error', async () => {
      googleCalendar.isEnabled.mockReturnValue(true);
      googleCalendar.syncBirthdayToCalendar.mockRejectedValue(new Error('network'));
      expect(await service.syncToCalendar(BIRTHDAY)).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateInCalendar', () => {
    it('skips when birthday has no googleCalendarEventId', async () => {
      googleCalendar.isEnabled.mockReturnValue(true);
      await service.updateInCalendar(BIRTHDAY);
      expect(googleCalendar.updateBirthdayInCalendar).not.toHaveBeenCalled();
    });

    it('skips when calendar is disabled', async () => {
      googleCalendar.isEnabled.mockReturnValue(false);
      await service.updateInCalendar(BIRTHDAY_WITH_EVENT);
      expect(googleCalendar.updateBirthdayInCalendar).not.toHaveBeenCalled();
    });

    it('delegates to GoogleCalendarService with correct eventId', async () => {
      googleCalendar.isEnabled.mockReturnValue(true);
      googleCalendar.updateBirthdayInCalendar.mockResolvedValue(undefined);
      await service.updateInCalendar(BIRTHDAY_WITH_EVENT);
      expect(googleCalendar.updateBirthdayInCalendar).toHaveBeenCalledWith(BIRTHDAY_WITH_EVENT, 'evt-123');
    });

    it('logs on error without rethrowing', async () => {
      googleCalendar.isEnabled.mockReturnValue(true);
      googleCalendar.updateBirthdayInCalendar.mockRejectedValue(new Error('timeout'));
      await expect(service.updateInCalendar(BIRTHDAY_WITH_EVENT)).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteFromCalendar', () => {
    it('skips when calendar is disabled', async () => {
      googleCalendar.isEnabled.mockReturnValue(false);
      await service.deleteFromCalendar('evt-123');
      expect(googleCalendar.deleteBirthdayFromCalendar).not.toHaveBeenCalled();
    });

    it('delegates to GoogleCalendarService', async () => {
      googleCalendar.isEnabled.mockReturnValue(true);
      googleCalendar.deleteBirthdayFromCalendar.mockResolvedValue(undefined);
      await service.deleteFromCalendar('evt-123');
      expect(googleCalendar.deleteBirthdayFromCalendar).toHaveBeenCalledWith('evt-123');
    });

    it('logs on error without rethrowing', async () => {
      googleCalendar.isEnabled.mockReturnValue(true);
      googleCalendar.deleteBirthdayFromCalendar.mockRejectedValue(new Error('forbidden'));
      await expect(service.deleteFromCalendar('evt-123')).resolves.not.toThrow();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('feature flag kill-switch', () => {
    beforeEach(() => {
      googleCalendar.isEnabled.mockReturnValue(true);
      featureFlags.isCalendarSyncEnabled.mockReturnValue(false);
    });

    it('syncToCalendar returns null without calling GoogleCalendarService', async () => {
      expect(await service.syncToCalendar(BIRTHDAY)).toBeNull();
      expect(googleCalendar.syncBirthdayToCalendar).not.toHaveBeenCalled();
    });

    it('updateInCalendar skips GoogleCalendarService', async () => {
      await service.updateInCalendar(BIRTHDAY_WITH_EVENT);
      expect(googleCalendar.updateBirthdayInCalendar).not.toHaveBeenCalled();
    });

    it('deleteFromCalendar skips GoogleCalendarService', async () => {
      await service.deleteFromCalendar('evt-123');
      expect(googleCalendar.deleteBirthdayFromCalendar).not.toHaveBeenCalled();
    });
  });
});
