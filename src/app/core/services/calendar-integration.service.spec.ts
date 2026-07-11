import { TestBed } from '@angular/core/testing';

import { type Birthday } from '../../shared/models/birthday.model';
import { CalendarIntegrationService } from './calendar-integration.service';
import { FeatureFlagsService } from './feature-flags.service';
import { GoogleCalendarService } from './google-calendar.service';
import { LoggerService } from './logger.service';

const BIRTHDAY: Birthday = { id: '1', name: 'Alice', birthDate: '1990-06-15' };
const BIRTHDAY_WITH_EVENT: Birthday = { ...BIRTHDAY, googleCalendarEventId: 'evt-123' };

describe('CalendarIntegrationService', () => {
  let service: CalendarIntegrationService;
  let googleCalendar: jasmine.SpyObj<GoogleCalendarService>;
  let logger: jasmine.SpyObj<LoggerService>;
  let featureFlags: jasmine.SpyObj<FeatureFlagsService>;

  beforeEach(() => {
    googleCalendar = jasmine.createSpyObj('GoogleCalendarService', [
      'isEnabled',
      'syncBirthdayToCalendar',
      'updateBirthdayInCalendar',
      'deleteBirthdayFromCalendar'
    ]);
    logger = jasmine.createSpyObj('LoggerService', ['error']);
    featureFlags = jasmine.createSpyObj('FeatureFlagsService', ['isCalendarSyncEnabled']);
    featureFlags.isCalendarSyncEnabled.and.returnValue(true);

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
      googleCalendar.isEnabled.and.returnValue(false);
      expect(await service.syncToCalendar(BIRTHDAY)).toBeNull();
      expect(googleCalendar.syncBirthdayToCalendar).not.toHaveBeenCalled();
    });

    it('returns event id on success', async () => {
      googleCalendar.isEnabled.and.returnValue(true);
      googleCalendar.syncBirthdayToCalendar.and.resolveTo('evt-123');
      expect(await service.syncToCalendar(BIRTHDAY)).toBe('evt-123');
    });

    it('returns null and logs on error', async () => {
      googleCalendar.isEnabled.and.returnValue(true);
      googleCalendar.syncBirthdayToCalendar.and.rejectWith(new Error('network'));
      expect(await service.syncToCalendar(BIRTHDAY)).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateInCalendar', () => {
    it('skips when birthday has no googleCalendarEventId', async () => {
      googleCalendar.isEnabled.and.returnValue(true);
      await service.updateInCalendar(BIRTHDAY);
      expect(googleCalendar.updateBirthdayInCalendar).not.toHaveBeenCalled();
    });

    it('skips when calendar is disabled', async () => {
      googleCalendar.isEnabled.and.returnValue(false);
      await service.updateInCalendar(BIRTHDAY_WITH_EVENT);
      expect(googleCalendar.updateBirthdayInCalendar).not.toHaveBeenCalled();
    });

    it('delegates to GoogleCalendarService with correct eventId', async () => {
      googleCalendar.isEnabled.and.returnValue(true);
      googleCalendar.updateBirthdayInCalendar.and.resolveTo();
      await service.updateInCalendar(BIRTHDAY_WITH_EVENT);
      expect(googleCalendar.updateBirthdayInCalendar).toHaveBeenCalledWith(BIRTHDAY_WITH_EVENT, 'evt-123');
    });

    it('logs on error without rethrowing', async () => {
      googleCalendar.isEnabled.and.returnValue(true);
      googleCalendar.updateBirthdayInCalendar.and.rejectWith(new Error('timeout'));
      await expectAsync(service.updateInCalendar(BIRTHDAY_WITH_EVENT)).toBeResolved();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteFromCalendar', () => {
    it('skips when calendar is disabled', async () => {
      googleCalendar.isEnabled.and.returnValue(false);
      await service.deleteFromCalendar('evt-123');
      expect(googleCalendar.deleteBirthdayFromCalendar).not.toHaveBeenCalled();
    });

    it('delegates to GoogleCalendarService', async () => {
      googleCalendar.isEnabled.and.returnValue(true);
      googleCalendar.deleteBirthdayFromCalendar.and.resolveTo();
      await service.deleteFromCalendar('evt-123');
      expect(googleCalendar.deleteBirthdayFromCalendar).toHaveBeenCalledWith('evt-123');
    });

    it('logs on error without rethrowing', async () => {
      googleCalendar.isEnabled.and.returnValue(true);
      googleCalendar.deleteBirthdayFromCalendar.and.rejectWith(new Error('forbidden'));
      await expectAsync(service.deleteFromCalendar('evt-123')).toBeResolved();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('feature flag kill-switch', () => {
    beforeEach(() => {
      googleCalendar.isEnabled.and.returnValue(true);
      featureFlags.isCalendarSyncEnabled.and.returnValue(false);
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
