import { BirthdayState } from './birthday/birthday.state';
import { UIState } from './ui/ui.state';
import { CalendarState } from './calendar/calendar.state';
import { CategoryState } from './category/category.state';
import { AuthState } from './auth/auth.state';
import { SyncStatus } from './sync/sync.state';

export interface AppState {
  birthdays: BirthdayState;
  ui: UIState;
  calendar: CalendarState;
  categories: CategoryState;
  auth: AuthState;
  sync: SyncStatus;
}
