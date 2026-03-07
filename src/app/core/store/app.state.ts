import { BirthdayState } from './birthday/birthday.state';
import { UIState } from './ui/ui.state';
import { CategoryState } from './category/category.state';
import { AuthState } from './auth/auth.state';
import { SyncStatus } from './sync/sync.state';

export interface AppState {
  birthdays: BirthdayState;
  ui: UIState;
  categories: CategoryState;
  auth: AuthState;
  sync: SyncStatus;
}
