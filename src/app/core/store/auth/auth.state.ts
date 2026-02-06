import { AuthUser } from '../../services/firebase-auth.service';

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export const initialAuthState: AuthState = {
  user: null,
  loading: false,
  error: null,
  initialized: false
};
