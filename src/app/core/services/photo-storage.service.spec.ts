import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { PhotoStorageService } from './photo-storage.service';
import { LoggerService } from './logger.service';
import { NotificationService } from './notification.service';
import { FIREBASE_OPTIONS, storageGetters } from '../../firebase.config';

// Minimal 1×1 PNG — valid base64 required by atob() inside base64ToFile()
const BASE64_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const STORAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/proj/o/photo.jpg?alt=media';
const STORAGE_URL_ALT = 'https://storage.googleapis.com/bucket/photo.jpg';

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['pixel'], name, { type });
}

interface SetupResult {
  service: PhotoStorageService;
  notificationMock: jasmine.SpyObj<NotificationService>;
}

function setup(opts: { firebase?: object | undefined; platform?: string } = {}): SetupResult {
  const loggerMock = jasmine.createSpyObj<LoggerService>('LoggerService', ['info', 'warn', 'error', 'log']);
  const notificationMock = jasmine.createSpyObj<NotificationService>('NotificationService', ['show', 'remove']);

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
      expect(service.isStorageUrl(STORAGE_URL)).toBeTrue();
    });

    it('returns true for storage.googleapis.com URLs', () => {
      expect(service.isStorageUrl(STORAGE_URL_ALT)).toBeTrue();
    });

    it('returns false for base64, arbitrary URLs, and empty strings', () => {
      expect(service.isStorageUrl(BASE64_PNG)).toBeFalse();
      expect(service.isStorageUrl('https://example.com/img.jpg')).toBeFalse();
      expect(service.isStorageUrl('')).toBeFalse();
    });
  });

  describe('isBase64', () => {
    let service: PhotoStorageService;
    beforeEach(() => ({ service } = setup()));

    it('returns true for safe MIME types (jpeg, png, webp)', () => {
      expect(service.isBase64(BASE64_PNG)).toBeTrue();
      expect(service.isBase64('data:image/jpeg;base64,abc')).toBeTrue();
      expect(service.isBase64('data:image/webp;base64,abc')).toBeTrue();
    });

    it('returns false for svg (XSS vector)', () => {
      expect(service.isBase64('data:image/svg+xml;base64,abc')).toBeFalse();
    });

    it('returns false for storage URLs and empty strings', () => {
      expect(service.isBase64(STORAGE_URL)).toBeFalse();
      expect(service.isBase64('')).toBeFalse();
    });
  });

  // ─── uploadPhoto ──────────────────────────────────────────────────────────

  describe('uploadPhoto', () => {
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
      spyOn(storageGetters, 'initFirebase').and.rejectWith(new Error('network error'));

      const result = await service.uploadPhoto(makeFile(), 'uid', 'photo');

      expect(result).toMatch(/^data:image\//);
      expect(notificationMock.show).toHaveBeenCalledOnceWith(
        'Foto salvata in locale — cloud sync in sospeso',
        'warning'
      );
    });
  });

  // ─── deletePhotoByUrl ─────────────────────────────────────────────────────

  describe('deletePhotoByUrl', () => {
    it('is a no-op for an empty string', async () => {
      const { service } = setup();
      await expectAsync(service.deletePhotoByUrl('')).toBeResolved();
    });

    it('is a no-op for non-storage URLs', async () => {
      const { service } = setup();
      await expectAsync(service.deletePhotoByUrl('https://example.com/img.jpg')).toBeResolved();
    });

    it('is a no-op when Firebase is not configured', async () => {
      const { service } = setup(); // FIREBASE_OPTIONS = undefined → isFirebaseConfigured = false
      await expectAsync(service.deletePhotoByUrl(STORAGE_URL)).toBeResolved();
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
      spyOn(service, 'uploadPhoto').and.resolveTo(STORAGE_URL);
      const result = await service.migrateBase64(BASE64_PNG, 'uid', 'rememberPhoto');
      expect(service.uploadPhoto).toHaveBeenCalledOnceWith(jasmine.any(File), 'uid', 'rememberPhoto');
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
      (window as unknown as { FileReader: unknown }).FileReader = class {
        onload: (() => void) | null = null;
        onerror: ((e?: unknown) => void) | null = null;
        readAsDataURL(_f: File): void { setTimeout(() => this.onerror?.(), 0); }
      };
      await expectAsync(service.fileToBase64(makeFile())).toBeRejected();
      (window as unknown as { FileReader: unknown }).FileReader = origFileReader;
    });
  });
});
