import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from './logger.service';

interface EncryptedData {
  iv: string;
  data: string;
  tag: string;
}

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  private cryptoKey: CryptoKey | null = null;
  private initPromise: Promise<void> | null = null;
  private dbName = 'SecureStorageDB';
  private storeName = 'keys';
  private keyId = 'encryption-key';

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private logger: LoggerService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.initPromise = this.initialize();
    }
  }

  private async initialize(): Promise<void> {
    try {
      this.cryptoKey = await this.getOrCreateKey();
    } catch (error) {
      this.logger.error('[SecureStorage] Failed to initialize encryption:', error);
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  private async getOrCreateKey(): Promise<CryptoKey> {
    try {
      const storedKey = await this.getKeyFromIndexedDB();
      if (storedKey) {
        return storedKey;
      }

      const key = await crypto.subtle.generateKey(
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );

      await this.storeKeyInIndexedDB(key);

      return key;
    } catch (error) {
      this.logger.error('[SecureStorage] Key operation failed:', error);
      throw error;
    }
  }

  private async getKeyFromIndexedDB(): Promise<CryptoKey | null> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(this.keyId);

        request.onerror = () => {
          reject(request.error);
          db.close();
        };

        request.onsuccess = () => {
          resolve(request.result ?? null);
          db.close();
        };
      });
    } catch (error) {
      this.logger.error('[SecureStorage] Failed to read key from IndexedDB:', error);
      return null;
    }
  }

  private async storeKeyInIndexedDB(key: CryptoKey): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(key, this.keyId);

        request.onerror = () => {
          reject(request.error);
          db.close();
        };

        request.onsuccess = () => {
          resolve();
          db.close();
        };
      });
    } catch (error) {
      this.logger.error('[SecureStorage] Failed to store key in IndexedDB:', error);
      throw error;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    await this.initPromise;

    if (!this.cryptoKey) {
      this.logger.warn('[SecureStorage] Encryption not available, using plain storage');
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }

    try {
      const encrypted = await this.encrypt(JSON.stringify(value));
      localStorage.setItem(key, JSON.stringify(encrypted));
    } catch (error) {
      this.logger.error('[SecureStorage] Failed to encrypt data:', error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    await this.initPromise;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return null;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stored);
      } catch {
        this.logger.warn(`[SecureStorage] Malformed data for key "${key}", returning null`);
        return null;
      }

      if (this.isEncryptedData(parsed)) {
        if (!this.cryptoKey) {
          this.logger.warn('[SecureStorage] Cannot decrypt without key');
          return null;
        }
        const decrypted = await this.decrypt(parsed);
        return JSON.parse(decrypted) as T;
      }

      return parsed as T;
    } catch (error) {
      this.logger.error('[SecureStorage] Failed to retrieve data:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(key);
    }
  }

  private isEncryptedData(data: unknown): data is EncryptedData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'iv' in data &&
      'data' in data &&
      'tag' in data
    );
  }

  private async encrypt(plaintext: string): Promise<EncryptedData> {
    if (!this.cryptoKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encodedData = new TextEncoder().encode(plaintext);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      this.cryptoKey,
      encodedData
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedArray.slice(0, -16);
    const tag = encryptedArray.slice(-16);

    return {
      iv: this.arrayBufferToBase64(iv),
      data: this.arrayBufferToBase64(ciphertext),
      tag: this.arrayBufferToBase64(tag)
    };
  }

  private async decrypt(encrypted: EncryptedData): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = this.base64ToArrayBuffer(encrypted.iv);
    const ciphertext = this.base64ToArrayBuffer(encrypted.data);
    const tag = this.base64ToArrayBuffer(encrypted.tag);

    const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    combined.set(new Uint8Array(ciphertext), 0);
    combined.set(new Uint8Array(tag), ciphertext.byteLength);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      this.cryptoKey,
      combined
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async clearEncryptionKey(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const db = await this.openDB();

        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(this.storeName, 'readwrite');
          const store = transaction.objectStore(this.storeName);
          const request = store.delete(this.keyId);

          request.onerror = () => {
            reject(request.error);
            db.close();
          };

          request.onsuccess = () => {
            resolve();
            db.close();
          };
        });

        this.cryptoKey = null;
      } catch (error) {
        this.logger.error('[SecureStorage] Failed to clear key:', error);
      }
    }
  }
}
