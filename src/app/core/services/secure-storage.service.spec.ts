import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { SecureStorageService } from './secure-storage.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('SecureStorageService', () => {
  let service: SecureStorageService;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        SecureStorageService,
        SILENT_LOGGER_PROVIDER,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(SecureStorageService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setItem and getItem', () => {
    it('should store and retrieve string data', async () => {
      await service.setItem('testKey', 'testValue');
      const result = await service.getItem<string>('testKey');
      expect(result).toBe('testValue');
    });

    it('should store and retrieve object data', async () => {
      const testData = { name: 'John', age: 30 };
      await service.setItem('testObj', testData);
      const result = await service.getItem<typeof testData>('testObj');
      expect(result).toEqual(testData);
    });

    it('should store and retrieve complex nested data', async () => {
      const complexData = {
        user: { name: 'Jane', email: 'jane@test.com' },
        tokens: { access: 'abc123', refresh: 'xyz789' },
        settings: { theme: 'dark', notifications: true }
      };
      await service.setItem('complex', complexData);
      const result = await service.getItem<typeof complexData>('complex');
      expect(result).toEqual(complexData);
    });

    it('should return null for non-existent key', async () => {
      const result = await service.getItem('nonExistent');
      expect(result).toBeNull();
    });

    it('should store data encrypted', async () => {
      const sensitiveData = { token: 'super_secret_token_12345' };
      await service.setItem('sensitive', sensitiveData);

      const rawStored = localStorage.getItem('sensitive');
      expect(rawStored).toBeTruthy();

      const parsed = JSON.parse(rawStored!);
      expect(parsed.iv).toBeDefined();
      expect(parsed.data).toBeDefined();
      expect(parsed.tag).toBeDefined();
      expect(rawStored).not.toContain('super_secret_token_12345');
    });

    it('should handle boolean values', async () => {
      await service.setItem('boolTrue', true);
      await service.setItem('boolFalse', false);

      expect(await service.getItem<boolean>('boolTrue')).toBe(true);
      expect(await service.getItem<boolean>('boolFalse')).toBe(false);
    });

    it('should handle numeric values', async () => {
      await service.setItem('number', 42);
      await service.setItem('float', 3.14159);

      expect(await service.getItem<number>('number')).toBe(42);
      expect(await service.getItem<number>('float')).toBe(3.14159);
    });

    it('should handle array values', async () => {
      const arr = [1, 2, 3, 'four', { five: 5 }];
      await service.setItem('array', arr);

      const result = await service.getItem<typeof arr>('array');
      expect(result).toEqual(arr);
    });

    it('should handle null values', async () => {
      await service.setItem('nullValue', null);
      const result = await service.getItem('nullValue');
      expect(result).toBeNull();
    });

    it('should handle empty string', async () => {
      await service.setItem('empty', '');
      const result = await service.getItem<string>('empty');
      expect(result).toBe('');
    });

    it('should handle special characters', async () => {
      const specialData = {
        emoji: '🎂🎉',
        unicode: 'ñoño',
        symbols: '!@#$%^&*()',
        quotes: '"single\' and "double"'
      };
      await service.setItem('special', specialData);

      const result = await service.getItem<typeof specialData>('special');
      expect(result).toEqual(specialData);
    });
  });

  describe('removeItem', () => {
    it('should remove stored item', async () => {
      await service.setItem('toRemove', 'value');
      expect(await service.getItem('toRemove')).toBe('value');

      await service.removeItem('toRemove');
      expect(await service.getItem('toRemove')).toBeNull();
    });

    it('should not throw when removing non-existent item', async () => {
      await expectAsync(service.removeItem('nonExistent')).toBeResolved();
    });
  });

  describe('encryption key management', () => {
    it('should persist encryption key in session storage', async () => {
      await service.setItem('test', 'data');

      const keyExists = sessionStorage.getItem('app_encryption_key');
      expect(keyExists).toBeTruthy();
    });

    it('should use same key for encrypt/decrypt within session', async () => {
      const testData = { secret: 'mySecret' };
      await service.setItem('key1', testData);
      await service.setItem('key2', testData);

      const result1 = await service.getItem<typeof testData>('key1');
      const result2 = await service.getItem<typeof testData>('key2');

      expect(result1).toEqual(testData);
      expect(result2).toEqual(testData);
    });

    it('should clear encryption key', async () => {
      await service.setItem('test', 'data');
      expect(sessionStorage.getItem('app_encryption_key')).toBeTruthy();

      service.clearEncryptionKey();
      expect(sessionStorage.getItem('app_encryption_key')).toBeNull();
    });
  });

  describe('backward compatibility', () => {
    it('should read unencrypted legacy data', async () => {
      const legacyData = { oldToken: 'legacy123' };
      localStorage.setItem('legacyKey', JSON.stringify(legacyData));

      const result = await service.getItem<typeof legacyData>('legacyKey');
      expect(result).toEqual(legacyData);
    });

    it('should handle malformed JSON gracefully', async () => {
      localStorage.setItem('malformed', 'not valid json{');

      const result = await service.getItem('malformed');
      expect(result).toBeNull();
    });
  });

  describe('token storage simulation', () => {
    it('should securely store OAuth tokens', async () => {
      const tokenData = {
        access_token: 'ya29.a0AfH6SMBx...',
        expires_at: Date.now() + 3600000,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar'
      };

      await service.setItem('googleCalendarToken', tokenData);

      const rawStored = localStorage.getItem('googleCalendarToken');
      expect(rawStored).not.toContain('ya29');
      expect(rawStored).not.toContain('access_token');

      const retrieved = await service.getItem<typeof tokenData>('googleCalendarToken');
      expect(retrieved).toEqual(tokenData);
    });
  });
});

describe('SecureStorageService (Server Platform)', () => {
  let service: SecureStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SecureStorageService,
        SILENT_LOGGER_PROVIDER,
        { provide: PLATFORM_ID, useValue: 'server' }
      ]
    });

    service = TestBed.inject(SecureStorageService);
  });

  it('should return null on server platform', async () => {
    const result = await service.getItem('anyKey');
    expect(result).toBeNull();
  });

  it('should not throw on setItem in server platform', async () => {
    await expectAsync(service.setItem('key', 'value')).toBeResolved();
  });

  it('should not throw on removeItem in server platform', async () => {
    await expectAsync(service.removeItem('key')).toBeResolved();
  });
});
