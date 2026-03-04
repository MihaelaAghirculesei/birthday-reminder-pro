/**
 * Google Identity Services (GIS) Type Definitions
 * @see https://developers.google.com/identity/oauth2/web/reference/js-reference
 */

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: { type: string; message: string }) => void;
  prompt?: '' | 'none' | 'consent' | 'select_account';
  enable_granular_consent?: boolean;
  login_hint?: string;
  hd?: string;
  state?: string;
}

export interface OverridableTokenClientConfig {
  prompt?: '' | 'none' | 'consent' | 'select_account';
  enable_granular_consent?: boolean;
  login_hint?: string;
  state?: string;
}

export interface TokenClient {
  requestAccessToken(overrideConfig?: OverridableTokenClientConfig): void;
}

export interface RevokeResponse {
  successful: boolean;
  error?: string;
  error_description?: string;
}

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
  }): void;
  prompt(): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  disableAutoSelect(): void;
}

export interface GoogleAccountsOAuth2 {
  initTokenClient(config: TokenClientConfig): TokenClient;
  revoke(accessToken: string, callback?: (response: RevokeResponse) => void): void;
  hasGrantedAllScopes(tokenResponse: TokenResponse, ...scopes: string[]): boolean;
  hasGrantedAnyScope(tokenResponse: TokenResponse, ...scopes: string[]): boolean;
}

export interface GoogleAccounts {
  id: GoogleAccountsId;
  oauth2: GoogleAccountsOAuth2;
}

export interface Google {
  accounts: GoogleAccounts;
}

declare global {
  interface Window {
    google?: Google;
  }
}
