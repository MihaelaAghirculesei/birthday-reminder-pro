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
  createdDate: z.union([z.string(), z.date()]),
  lastSentDate: z.union([z.string(), z.date()]).optional(),
  messageType: z.enum(['text', 'html']),
  priority: z.enum(['low', 'normal', 'high']),
  sentCount: z.number().optional(),
  nextScheduledDate: z.union([z.string(), z.date()]).optional(),
  notificationSent: z.boolean().optional(),
  lastNotificationId: z.string().optional(),
  birthdayId: z.string().optional()
});

export const BirthdaySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  birthDate: z.union([z.string(), z.date()]),
  notes: z.string().max(1000).optional(),
  reminderDays: z.number().min(1).max(365).optional(),
  photo: z.string().optional(),
  rememberPhoto: z.string().optional(),
  zodiacSign: z.string().optional(),
  googleCalendarEventId: z.string().optional(),
  category: z.string().optional(),
  scheduledMessages: z.array(ScheduledMessageSchema).optional()
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
