import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MockedObject } from 'vitest';

import { FIREBASE_OPTIONS, storageGetters } from '../../firebase.config';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { PhotoStorageService } from './photo-storage.service';

// Minimal 1×1 PNG — valid base64 required by atob() inside base64ToFile()
const BASE64_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const STORAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/proj/o/photo.jpg?alt=media';
const STORAGE_URL_ALT = 'https://storage.googleapis.com/bucket/photo.jpg';

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['pixel'], name, { type });
}

interface SetupResult {
  service: PhotoStorageService;
  notificationMock: MockedObject<NotificationService>;
}

function setup(opts: {
  firebase?: object | undefined;
  platform?: string;
} = {}): SetupResult {
  const loggerMock = {
    info: vi.fn().mockName('LoggerService.info'),
    warn: vi.fn().mockName('LoggerService.warn'),
    error: vi.fn().mockName('LoggerService.error'),
    log: vi.fn().mockName('LoggerService.log')
  };
  const notificationMock = {
    show: vi.fn().mockName('NotificationService.show'),
    remove: vi.fn().mockName('NotificationService.remove')
  } as unknown as MockedObject<NotificationService>;

  TestBed.configureTestingModule({
    providers: [
      { provide: LoggerService, useValue: loggerMock },
      { provide: NotificationService, useValue: notificationMock },
      { provide: FIREBASE_OPTIONS, useValue: opts.firebase ?? undefined },
      { provide: PLATFORM_ID, useValue: opts.platform ?? 'browser' },
    ],
  });

  return { service: TestBed.inject(PhotoStorageService), notificationMock };
}

describe('PhotoStorageService', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ─── Type guards ──────────────────────────────────────────────────────────

  describe('isStorageUrl', () => {
    let service: PhotoStorageService;
    beforeEach(() => ({ service } = setup()));

    it('returns true for firebasestorage.googleapis.com URLs', () => {
      expect(service.isStorageUrl(STORAGE_URL)).toBe(true);
    });

    it('returns true for storage.googleapis.com URLs', () => {
      expect(service.isStorageUrl(STORAGE_URL_ALT)).toBe(true);
    });

    it('returns false for base64, arbitrary URLs, and empty strings', () => {
      expect(service.isStorageUrl(BASE64_PNG)).toBe(false);
      expect(service.isStorageUrl('https://example.com/img.jpg')).toBe(false);
      expect(service.isStorageUrl('')).toBe(false);
    });
  });

  describe('isBase64', () => {
    let service: PhotoStorageService;
    beforeEach(() => ({ service } = setup()));

    it('returns true for safe MIME types (jpeg, png, webp)', () => {
      expect(service.isBase64(BASE64_PNG)).toBe(true);
      expect(service.isBase64('data:image/jpeg;base64,abc')).toBe(true);
      expect(service.isBase64('data:image/webp;base64,abc')).toBe(true);
    });

    it('returns false for svg (XSS vector)', () => {
      expect(service.isBase64('data:image/svg+xml;base64,abc')).toBe(false);
    });

    it('returns false for storage URLs and empty strings', () => {
      expect(service.isBase64(STORAGE_URL)).toBe(false);
      expect(service.isBase64('')).toBe(false);
    });
  });

  // ─── uploadPhoto ──────────────────────────────────────────────────────────

  describe('uploadPhoto', () => {
    it('rejects immediately when file exceeds 7 MB', async () => {
      const { service } = setup();
      const bigFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
      Object.defineProperty(bigFile, 'size', { value: 7 * 1024 * 1024 + 1 });

      await expect(service.uploadPhoto(bigFile, 'uid', 'photo')).rejects.toThrowError(/7 MB/);
    });

    it('accepts a file exactly at the 7 MB boundary', async () => {
      const { service } = setup(); // no Firebase → base64 fallback
      const boundaryFile = new File(['x'], 'ok.jpg', { type: 'image/jpeg' });
      Object.defineProperty(boundaryFile, 'size', { value: 7 * 1024 * 1024 });

      await expect(service.uploadPhoto(boundaryFile, 'uid', 'photo')).resolves.not.toThrow();
    });

    it('falls back to base64 on server platform (SSR)', async () => {
      const { service } = setup({ platform: 'server' });
      const result = await service.uploadPhoto(makeFile(), 'uid', 'photo');
      expect(result).toMatch(/^data:image\//);
    });

    it('falls back to base64 when Firebase is not configured', async () => {
      const { service } = setup(); // FIREBASE_OPTIONS = undefined
      const result = await service.uploadPhoto(makeFile(), 'uid', 'photo');
      expect(result).toMatch(/^data:image\//);
    });

    it('falls back to base64 and shows warning notification when upload throws', async () => {
      const { service, notificationMock } = setup({
        firebase: { apiKey: 'real-key', projectId: 'real-proj' },
      });
      // storageGetters is a plain object — spyable unlike ES-module named exports
      vi.spyOn(storageGetters, 'initFirebase').mockRejectedValue(new Error('network error'));

      const result = await service.uploadPhoto(makeFile(), 'uid', 'photo');

      expect(result).toMatch(/^data:image\//);
      expect(notificationMock.show).toHaveBeenCalledTimes(1);
      expect(notificationMock.show).toHaveBeenCalledWith('Foto salvata in locale — cloud sync in sospeso', 'warning');
    });
  });

  // ─── extractPath ─────────────────────────────────────────────────────────

  describe('extractPath', () => {
    let service: PhotoStorageService;
    beforeEach(() => ({ service } = setup()));

    it('decodes a standard Firebase Storage download URL', () => {
      const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/users%2Fuid%2Fphotos%2Fuuid.jpg?alt=media&token=tok';
      expect(service.extractPath(url)).toBe('users/uid/photos/uuid.jpg');
    });

    it('handles nested paths with multiple encoded slashes', () => {
      const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/a%2Fb%2Fc.jpg?alt=media';
      expect(service.extractPath(url)).toBe('a/b/c.jpg');
    });

    it('stops at the query-string boundary', () => {
      const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/x.jpg?alt=media&token=1';
      expect(service.extractPath(url)).toBe('x.jpg');
    });

    it('stops at the fragment boundary', () => {
      const url = 'https://firebasestorage.googleapis.com/v0/b/proj/o/x.jpg#frag';
      expect(service.extractPath(url)).toBe('x.jpg');
    });

    it('returns null for an empty string', () => {
      expect(service.extractPath('')).toBeNull();
    });

    it('returns null for a URL without /o/ segment', () => {
      expect(service.extractPath('https://example.com/photo.jpg')).toBeNull();
    });
  });

  // ─── resolveUrl ──────────────────────────────────────────────────────────

  describe('resolveUrl', () => {
    it('returns null when Firebase is not configured', async () => {
      const { service } = setup();
      const result = await service.resolveUrl('users/uid/photo/file.jpg');
      expect(result).toBeNull();
    });

    it('returns null on server platform', async () => {
      const { service } = setup({ platform: 'server', firebase: { apiKey: 'k', projectId: 'p' } });
      const result = await service.resolveUrl('users/uid/photo/file.jpg');
      expect(result).toBeNull();
    });

    it('resolves a path to a download URL via getDownloadURL', async () => {
      const { service } = setup({ firebase: { apiKey: 'real-key', projectId: 'real-proj' } });
      const fakeUrl = 'https://firebasestorage.googleapis.com/v0/b/proj/o/file.jpg?alt=media&token=abc';
      const mockStorageModule = {
        ref: vi.fn().mockReturnValue({}),
        getDownloadURL: vi.fn().mockResolvedValue(fakeUrl),
      };
      vi.spyOn(storageGetters, 'initFirebase').mockResolvedValue(undefined);
      vi.spyOn(storageGetters, 'getFirebaseStorage').mockReturnValue({} as never);
      vi.spyOn(storageGetters, 'getStorageModule').mockReturnValue(mockStorageModule as never);

      const result = await service.resolveUrl('users/uid/photo/file.jpg');
      expect(result).toBe(fakeUrl);
      expect(mockStorageModule.getDownloadURL).toHaveBeenCalled();
    });

    it('returns null and logs a warning when getDownloadURL rejects', async () => {
      const { service } = setup({ firebase: { apiKey: 'k', projectId: 'p' } });
      const mockStorageModule = {
        ref: vi.fn().mockReturnValue({}),
        getDownloadURL: vi.fn().mockRejectedValue(new Error('unauthenticated')),
      };
      vi.spyOn(storageGetters, 'initFirebase').mockResolvedValue(undefined);
      vi.spyOn(storageGetters, 'getFirebaseStorage').mockReturnValue({} as never);
      vi.spyOn(storageGetters, 'getStorageModule').mockReturnValue(mockStorageModule as never);

      const result = await service.resolveUrl('users/uid/photo/file.jpg');
      expect(result).toBeNull();
    });
  });

  // ─── deletePhotoByUrl ─────────────────────────────────────────────────────

  describe('deletePhotoByUrl', () => {
    it('is a no-op for an empty string', async () => {
      const { service } = setup();
      await expect(service.deletePhotoByUrl('')).resolves.not.toThrow();
    });

    it('is a no-op for non-storage URLs', async () => {
      const { service } = setup();
      await expect(service.deletePhotoByUrl('https://example.com/img.jpg')).resolves.not.toThrow();
    });

    it('is a no-op when Firebase is not configured', async () => {
      const { service } = setup(); // FIREBASE_OPTIONS = undefined → isFirebaseConfigured = false
      await expect(service.deletePhotoByUrl(STORAGE_URL)).resolves.not.toThrow();
    });
  });

  // ─── migrateBase64 ────────────────────────────────────────────────────────

  describe('migrateBase64', () => {
    let service: PhotoStorageService;
    beforeEach(() => ({ service } = setup()));

    it('returns the value unchanged when already a storage URL', async () => {
      const result = await service.migrateBase64(STORAGE_URL, 'uid', 'photo');
      expect(result).toBe(STORAGE_URL);
    });

    it('calls uploadPhoto when value is a base64 string', async () => {
      vi.spyOn(service, 'uploadPhoto').mockResolvedValue(STORAGE_URL);
      const result = await service.migrateBase64(BASE64_PNG, 'uid', 'rememberPhoto');
      expect(service.uploadPhoto).toHaveBeenCalledTimes(1);
      expect(service.uploadPhoto).toHaveBeenCalledWith(expect.any(File), 'uid', 'rememberPhoto');
      expect(result).toBe(STORAGE_URL);
    });
  });

  // ─── fileToBase64 ─────────────────────────────────────────────────────────

  describe('fileToBase64', () => {
    it('resolves with a data: URL matching the file MIME type', async () => {
      const { service } = setup();
      const result = await service.fileToBase64(makeFile());
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('rejects when FileReader triggers onerror', async () => {
      const { service } = setup();
      const origFileReader = window.FileReader;
      (window as unknown as {
        FileReader: unknown;
      }).FileReader = class {
          onload: (() => void) | null = null;
          onerror: ((e?: unknown) => void) | null = null;
          readAsDataURL(_f: File): void { setTimeout(() => this.onerror?.(), 0); }
        };
      await expect(service.fileToBase64(makeFile())).rejects.toThrow();
      (window as unknown as {
        FileReader: unknown;
      }).FileReader = origFileReader;
    });
  });
});
