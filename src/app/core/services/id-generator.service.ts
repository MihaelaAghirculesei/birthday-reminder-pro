import { isPlatformBrowser } from '@angular/common';
import { inject,Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class IdGeneratorService {
  private platformId = inject(PLATFORM_ID);

  generateId(): string {
    if (isPlatformBrowser(this.platformId) && typeof crypto !== 'undefined') {
      if ('randomUUID' in crypto) {
        return crypto.randomUUID();
      }

      return this.generateUUIDv4WithCrypto();
    }

    return this.generateFallbackId();
  }

  private generateUUIDv4WithCrypto(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private generateFallbackId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${randomPart}-${randomPart2}`;
  }
}
