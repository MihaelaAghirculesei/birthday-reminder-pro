import { TestBed } from '@angular/core/testing';
import type { MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../testing/translate-testing';
import { SecureStorageService } from './secure-storage.service';
import { SenderSettingsService } from './sender-settings.service';

describe('SenderSettingsService', () => {
  let service: SenderSettingsService;
  let mockSecureStorage: MockedObject<SecureStorageService>;

  beforeEach(() => {
    mockSecureStorage = {
      setItem: vi.fn().mockName('SecureStorageService.setItem'),
      getItem: vi.fn().mockName('SecureStorageService.getItem'),
      removeItem: vi.fn().mockName('SecureStorageService.removeItem')
    } as unknown as MockedObject<SecureStorageService>;
    mockSecureStorage.setItem.mockReturnValue(Promise.resolve());
    mockSecureStorage.getItem.mockReturnValue(Promise.resolve(null));
    mockSecureStorage.removeItem.mockReturnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        { provide: SecureStorageService, useValue: mockSecureStorage },
        provideTranslateTesting()
      ]
    });
    service = TestBed.inject(SenderSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sender name', () => {
    it('should return empty string when no name is set', () => {
      expect(service.getSenderName()).toBe('');
    });

    it('should set and get sender name', () => {
      service.setSenderName('Alice');
      expect(service.getSenderName()).toBe('Alice');
    });

    it('should trim whitespace from sender name', () => {
      service.setSenderName('  Alice  ');
      expect(service.getSenderName()).toBe('Alice');
    });

    it('should persist name via SecureStorageService', () => {
      service.setSenderName('Alice');
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('birthday-app-sender-name', 'Alice');
    });
  });

  describe('sender full name', () => {
    it('should return empty string when no full name is set', () => {
      expect(service.getSenderFullName()).toBe('');
    });

    it('should set and get sender full name', () => {
      service.setSenderFullName('Alice Johnson');
      expect(service.getSenderFullName()).toBe('Alice Johnson');
    });

    it('should trim whitespace from sender full name', () => {
      service.setSenderFullName('  Alice Johnson  ');
      expect(service.getSenderFullName()).toBe('Alice Johnson');
    });

    it('should persist full name via SecureStorageService', () => {
      service.setSenderFullName('Alice Johnson');
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith('birthday-app-sender-full-name', 'Alice Johnson');
    });
  });
});
