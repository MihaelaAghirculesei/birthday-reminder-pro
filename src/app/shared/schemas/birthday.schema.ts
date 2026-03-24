import { z } from 'zod';

export const SyncStatusSchema = z.enum(['synced', 'pending', 'conflict', 'local-only']);

export const SyncMetadataSchema = z.object({
  updatedAt: z.number().optional(),
  ownerId: z.string().nullable().optional(),
  syncStatus: SyncStatusSchema.optional(),
  lastSyncedAt: z.number().optional()
});

export const ScheduledMessageSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  scheduledTime: z.string(),
  active: z.boolean(),
  createdDate: z.coerce.date(),
  lastSentDate: z.coerce.date().optional(),
  messageType: z.enum(['text', 'html']),
  priority: z.enum(['low', 'normal', 'high']),
  sentCount: z.number().optional(),
  nextScheduledDate: z.coerce.date().optional(),
  notificationSent: z.boolean().optional(),
  lastNotificationId: z.string().optional(),
  birthdayId: z.string().optional()
});

export const BirthdaySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  birthDate: z.string(),
  notes: z.string().max(1000).optional(),
  reminderDays: z.number().min(1).max(365).optional(),
  photo: z.string().max(7_000_000).optional(),
  rememberPhoto: z.string().max(7_000_000).optional(),
  zodiacSign: z.string().optional(),
  googleCalendarEventId: z.string().optional(),
  category: z.string().optional(),
  email: z.string().email().max(254).optional().catch(undefined),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,20}$/).optional().catch(undefined),
  telegramUsername: z.string().regex(/^[a-zA-Z0-9_]{5,32}$/).optional().catch(undefined),
  scheduledMessages: z.array(ScheduledMessageSchema).optional(),
  daysUntilBirthday: z.number().optional()
}).merge(SyncMetadataSchema);

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  icon: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isCustom: z.boolean().optional()
}).merge(SyncMetadataSchema);

export type ValidatedBirthday = z.infer<typeof BirthdaySchema>;
export type ValidatedCategory = z.infer<typeof CategorySchema>;

export function validateBirthday(data: unknown): ValidatedBirthday {
  return BirthdaySchema.parse(data);
}

export function validateCategory(data: unknown): ValidatedCategory {
  return CategorySchema.parse(data);
}

export function safeParseBirthday(data: unknown) {
  return BirthdaySchema.safeParse(data);
}

export function safeParseCategory(data: unknown) {
  return CategorySchema.safeParse(data);
}

export function safeParseScheduledMessage(data: unknown) {
  return ScheduledMessageSchema.safeParse(data);
}

export const GoogleCalendarSettingsSchema = z.object({
  enabled: z.boolean(),
  calendarId: z.string(),
  syncMode: z.enum(['one-way', 'two-way']),
  reminderMinutes: z.number()
});

export function safeParseGoogleCalendarSettings(data: unknown) {
  return GoogleCalendarSettingsSchema.safeParse(data);
}

export const GoogleCalendarItemSchema = z.object({
  id: z.string(),
  summary: z.string()
});

export const GoogleCalendarEventResponseSchema = z.object({
  id: z.string()
});

export function safeParseCalendarItems(data: unknown) {
  return z.array(GoogleCalendarItemSchema).safeParse(data);
}

export function safeParseEventResponse(data: unknown) {
  return GoogleCalendarEventResponseSchema.safeParse(data);
}

/**
 * Sanitizes raw data before Zod validation:
 * - Converts empty strings to undefined for optional fields with patterns
 * - Ensures data from IndexedDB/imports doesn't fail on trivially fixable issues
 */
export function sanitizeBirthdayData(data: Record<string, unknown>): Record<string, unknown> {
  const optionalStringFields = ['email', 'phone', 'telegramUsername', 'notes', 'photo', 'rememberPhoto', 'zodiacSign', 'googleCalendarEventId', 'category'];
  const sanitized = { ...data };

  for (const field of optionalStringFields) {
    if (sanitized[field] === '' || sanitized[field] === null) {
      sanitized[field] = undefined;
    }
  }

  return sanitized;
}
