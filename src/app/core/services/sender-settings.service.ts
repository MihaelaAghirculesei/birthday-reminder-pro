import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SecureStorageService } from './secure-storage.service';

@Injectable({
  providedIn: 'root'
})
export class SenderSettingsService {
  private readonly SENDER_KEY = 'birthday-app-sender-name';
  private readonly SENDER_FULL_KEY = 'birthday-app-sender-full-name';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly secureStorage = inject(SecureStorageService);

  private readonly _senderName = signal<string>('');
  private readonly _senderFullName = signal<string>('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromStorage();
    }
  }

  private async loadFromStorage(): Promise<void> {
    const [name, fullName] = await Promise.all([
      this.secureStorage.getItem<string>(this.SENDER_KEY),
      this.secureStorage.getItem<string>(this.SENDER_FULL_KEY)
    ]);
    this._senderName.set(name ?? '');
    this._senderFullName.set(fullName ?? '');
  }

  getSenderName(): string {
    return this._senderName();
  }

  setSenderName(name: string): void {
    const trimmed = name.trim();
    this._senderName.set(trimmed);
    this.secureStorage.setItem(this.SENDER_KEY, trimmed);
  }

  getSenderFullName(): string {
    return this._senderFullName();
  }

  setSenderFullName(name: string): void {
    const trimmed = name.trim();
    this._senderFullName.set(trimmed);
    this.secureStorage.setItem(this.SENDER_FULL_KEY, trimmed);
  }
}
