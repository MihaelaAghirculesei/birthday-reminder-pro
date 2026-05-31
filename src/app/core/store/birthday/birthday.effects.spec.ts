import * as barrel from './birthday.effects';
import { BirthdayCalendarSyncEffects } from './birthday-calendar-sync.effects';
import { BirthdayCrudEffects } from './birthday-crud.effects';
import { BirthdayMessageEffects } from './birthday-message.effects';
import { BirthdayNotificationEffects } from './birthday-notification.effects';

/**
 * Barrel contract test for birthday.effects.ts.
 *
 * The file contains no logic — it only re-exports the four effect classes.
 * These tests guard against accidental omissions during future refactoring
 * (e.g. a class gets renamed or its export is dropped from the barrel).
 */
describe('birthday.effects barrel', () => {
  it('should export BirthdayCrudEffects', () => {
    expect(barrel.BirthdayCrudEffects).toBe(BirthdayCrudEffects);
  });

  it('should export BirthdayCalendarSyncEffects', () => {
    expect(barrel.BirthdayCalendarSyncEffects).toBe(BirthdayCalendarSyncEffects);
  });

  it('should export BirthdayMessageEffects', () => {
    expect(barrel.BirthdayMessageEffects).toBe(BirthdayMessageEffects);
  });

  it('should export BirthdayNotificationEffects', () => {
    expect(barrel.BirthdayNotificationEffects).toBe(BirthdayNotificationEffects);
  });
});
