import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { LocaleService } from './locale.service';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('LocaleService', () => {
  let service: LocaleService;

  function setup(platformId = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        provideTranslateTesting(),
        { provide: PLATFORM_ID, useValue: platformId }
      ]
    });
    service = TestBed.inject(LocaleService);
  }

  afterEach(() => {
    localStorage.removeItem('app_lang');
    TestBed.resetTestingModule();
  });

  describe('initialize()', () => {
    it('should default to en-US locale when no saved language', () => {
      localStorage.removeItem('app_lang');
      setup();
      service.initialize();
      expect(service.currentLocale()).toBe('en-US');
      expect(service.lang()).toBe('en');
    });

    it('should restore saved language from localStorage', () => {
      localStorage.setItem('app_lang', 'it');
      setup();
      service.initialize();
      expect(service.currentLocale()).toBe('it-IT');
      expect(service.lang()).toBe('it');
    });

    it('should fall back to default lang if saved value is unsupported', () => {
      localStorage.setItem('app_lang', 'fr');
      setup();
      service.initialize();
      expect(service.lang()).toBe('en');
    });

    it('should use default lang on server (non-browser platform)', () => {
      setup('server');
      service.initialize();
      expect(service.lang()).toBe('en');
      expect(service.currentLocale()).toBe('en-US');
    });
  });

  describe('setLanguage()', () => {
    beforeEach(() => setup());

    it('should set locale to it-IT when language is "it"', () => {
      service.setLanguage('it');
      expect(service.currentLocale()).toBe('it-IT');
      expect(service.lang()).toBe('it');
    });

    it('should set locale to en-US when language is "en"', () => {
      service.setLanguage('it');
      service.setLanguage('en');
      expect(service.currentLocale()).toBe('en-US');
      expect(service.lang()).toBe('en');
    });

    it('should fall back to en-US for unknown language code', () => {
      service.setLanguage('de');
      expect(service.currentLocale()).toBe('en-US');
    });

    it('should persist the language in localStorage (browser)', () => {
      service.setLanguage('it');
      expect(localStorage.getItem('app_lang')).toBe('it');
    });

    it('should set document.documentElement.lang (browser)', () => {
      service.setLanguage('it');
      expect(document.documentElement.lang).toBe('it');
    });
  });

  describe('toggleLanguage()', () => {
    beforeEach(() => setup());

    it('should switch from en to it', () => {
      service.setLanguage('en');
      service.toggleLanguage();
      expect(service.lang()).toBe('it');
    });

    it('should switch from it to en', () => {
      service.setLanguage('it');
      service.toggleLanguage();
      expect(service.lang()).toBe('en');
    });
  });

  describe('currentLang getter', () => {
    beforeEach(() => setup());

    it('should return the currently active translate language', () => {
      service.setLanguage('it');
      expect(service.currentLang).toBe('it');
    });
  });
});
