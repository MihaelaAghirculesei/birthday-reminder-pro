import { TestBed } from '@angular/core/testing';
import { SenderSettingsService } from './sender-settings.service';

describe('SenderSettingsService', () => {
  let service: SenderSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SenderSettingsService);
    localStorage.removeItem('birthday-app-sender-name');
    localStorage.removeItem('birthday-app-sender-full-name');
  });

  afterEach(() => {
    localStorage.removeItem('birthday-app-sender-name');
    localStorage.removeItem('birthday-app-sender-full-name');
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
  });
});
