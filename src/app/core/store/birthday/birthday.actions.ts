import { createAction, props } from '@ngrx/store';
import { Birthday, ScheduledMessage } from '../../../shared/models/birthday.model';

export const loadBirthdays = createAction(
  '[Birthday] Load Birthdays'
);

export const loadBirthdaysSuccess = createAction(
  '[Birthday] Load Birthdays Success',
  props<{ birthdays: Birthday[] }>()
);

export const loadBirthdaysFailure = createAction(
  '[Birthday] Load Birthdays Failure',
  props<{ error: string }>()
);

export const addBirthday = createAction(
  '[Birthday] Add Birthday',
  props<{ birthday: Omit<Birthday, 'id'> }>()
);

export const addBirthdaySuccess = createAction(
  '[Birthday] Add Birthday Success',
  props<{ birthday: Birthday }>()
);

export const addBirthdayFailure = createAction(
  '[Birthday] Add Birthday Failure',
  props<{ error: string; birthday?: Omit<Birthday, 'id'> }>()
);

export const updateBirthday = createAction(
  '[Birthday] Update Birthday',
  props<{ birthday: Birthday; operationId: string }>()
);

export const updateBirthdaySuccess = createAction(
  '[Birthday] Update Birthday Success',
  props<{ birthday: Birthday; operationId: string }>()
);

export const updateBirthdayFailure = createAction(
  '[Birthday] Update Birthday Failure',
  props<{ error: string; operationId: string; id?: string; birthday?: Birthday }>()
);

export const deleteBirthday = createAction(
  '[Birthday] Delete Birthday',
  props<{ id: string }>()
);

export const deleteBirthdaySuccess = createAction(
  '[Birthday] Delete Birthday Success',
  props<{ id: string; birthday: Birthday }>()
);

export const deleteBirthdayFailure = createAction(
  '[Birthday] Delete Birthday Failure',
  props<{ error: string; id?: string }>()
);

export const setSearchTerm = createAction(
  '[Birthday] Set Search Term',
  props<{ searchTerm: string }>()
);

export const setSelectedCategory = createAction(
  '[Birthday] Set Selected Category',
  props<{ category: string | null }>()
);

export const clearAllBirthdays = createAction(
  '[Birthday] Clear All Birthdays'
);

export const clearAllBirthdaysSuccess = createAction(
  '[Birthday] Clear All Birthdays Success'
);

export const clearAllBirthdaysFailure = createAction(
  '[Birthday] Clear All Birthdays Failure',
  props<{ error: string }>()
);

export const addMessageToBirthday = createAction(
  '[Birthday] Add Message To Birthday',
  props<{ birthdayId: string; message: ScheduledMessage }>()
);

export const addMessageToBirthdaySuccess = createAction(
  '[Birthday] Add Message To Birthday Success',
  props<{ birthdayId: string; message: ScheduledMessage }>()
);

export const addMessageToBirthdayFailure = createAction(
  '[Birthday] Add Message To Birthday Failure',
  props<{ error: string }>()
);

export const updateMessageInBirthday = createAction(
  '[Birthday] Update Message In Birthday',
  props<{ birthdayId: string; messageId: string; updates: Partial<ScheduledMessage> }>()
);

export const updateMessageInBirthdaySuccess = createAction(
  '[Birthday] Update Message In Birthday Success',
  props<{ birthdayId: string; messageId: string; updates: Partial<ScheduledMessage> }>()
);

export const updateMessageInBirthdayFailure = createAction(
  '[Birthday] Update Message In Birthday Failure',
  props<{ error: string }>()
);

export const deleteMessageFromBirthday = createAction(
  '[Birthday] Delete Message From Birthday',
  props<{ birthdayId: string; messageId: string }>()
);

export const deleteMessageFromBirthdaySuccess = createAction(
  '[Birthday] Delete Message From Birthday Success',
  props<{ birthdayId: string; messageId: string }>()
);

export const deleteMessageFromBirthdayFailure = createAction(
  '[Birthday] Delete Message From Birthday Failure',
  props<{ error: string }>()
);

export const importBirthdays = createAction(
  '[Birthday] Import Birthdays',
  props<{ birthdays: Omit<Birthday, 'id'>[] }>()
);

export const importBirthdaysSuccess = createAction(
  '[Birthday] Import Birthdays Success',
  props<{ birthdays: Birthday[] }>()
);

export const importBirthdaysFailure = createAction(
  '[Birthday] Import Birthdays Failure',
  props<{ error: string }>()
);

export const loadTestData = createAction(
  '[Birthday] Load Test Data'
);

export const loadTestDataSuccess = createAction(
  '[Birthday] Load Test Data Success',
  props<{ birthdays: Birthday[] }>()
);

export const loadTestDataFailure = createAction(
  '[Birthday] Load Test Data Failure',
  props<{ error: string }>()
);

export const calendarEventIdSet = createAction(
  '[Birthday/Calendar] Event ID Set',
  props<{ id: string; calendarEventId: string }>()
);

export const calendarSyncFailed = createAction(
  '[Birthday/Calendar] Sync Failed',
  props<{ operation: 'add' | 'update' | 'delete'; error: string }>()
);
