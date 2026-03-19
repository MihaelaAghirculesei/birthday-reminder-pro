import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SenderSettingsService {
  private readonly SENDER_KEY = 'birthday-app-sender-name';
  private readonly SENDER_FULL_KEY = 'birthday-app-sender-full-name';

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  getSenderName(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    return localStorage.getItem(this.SENDER_KEY) || '';
  }

  setSenderName(name: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.SENDER_KEY, name.trim());
  }

  getSenderFullName(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    return localStorage.getItem(this.SENDER_FULL_KEY) || '';
  }

  setSenderFullName(name: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.SENDER_FULL_KEY, name.trim());
  }
}
