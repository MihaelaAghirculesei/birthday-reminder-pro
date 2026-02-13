import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SenderSettingsService {
  private readonly SENDER_KEY = 'birthday-app-sender-name';
  private readonly SENDER_FULL_KEY = 'birthday-app-sender-full-name';

  getSenderName(): string {
    return localStorage.getItem(this.SENDER_KEY) || '';
  }

  setSenderName(name: string): void {
    localStorage.setItem(this.SENDER_KEY, name.trim());
  }

  getSenderFullName(): string {
    return localStorage.getItem(this.SENDER_FULL_KEY) || '';
  }

  setSenderFullName(name: string): void {
    localStorage.setItem(this.SENDER_FULL_KEY, name.trim());
  }
}
