import { type AuthState } from './auth/auth.state';
import { type BirthdayState } from './birthday/birthday.state';
import { type CategoryState } from './category/category.state';
import { type SyncStatus } from './sync/sync.state';
import { type UIState } from './ui/ui.state';

export interface AppState {
  birthdays: BirthdayState;
  ui: UIState;
  categories: CategoryState;
  auth: AuthState;
  sync: SyncStatus;
}
