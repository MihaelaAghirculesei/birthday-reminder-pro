import { TestBed } from '@angular/core/testing';
import { SenderSettingsService } from './sender-settings.service';
import { SecureStorageService } from './secure-storage.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('SenderSettingsService', () => {
  let service: SenderSettingsService;
  let mockSecureStorage: jasmine.SpyObj<SecureStorageService>;

  beforeEach(() => {
    mockSecureStorage = jasmine.createSpyObj('SecureStorageService', ['setItem', 'getItem', 'removeItem']);
    mockSecureStorage.setItem.and.returnValue(Promise.resolve());
    mockSecureStorage.getItem.and.returnValue(Promise.resolve(null));
    mockSecureStorage.removeItem.and.returnValue(Promise.resolve());

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
