import { PLATFORM_ID } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs';

import { provideTranslateTesting } from '../../testing/translate-testing';
import * as UIActions from '../store/ui/ui.actions';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let storeSpy: jasmine.SpyObj<Store>;
  let darkModeSubject: BehaviorSubject<boolean>;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    localStorageMock = {};
    darkModeSubject = new BehaviorSubject<boolean>(false);

    const storeSpyObj = jasmine.createSpyObj('Store', ['dispatch', 'select']);
    storeSpyObj.select.and.returnValue(darkModeSubject.asObservable());

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageMock[key] || null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: Store, useValue: storeSpyObj },
        { provide: PLATFORM_ID, useValue: 'browser' },
        provideTranslateTesting()
      ]
    });

    storeSpy = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  afterEach(() => {
    document.body.classList.remove('dark-theme', 'theme-transitioning');
  });

  it('should be created', () => {
    service = TestBed.inject(ThemeService);
    expect(service).toBeTruthy();
  });

  describe('Browser initialization', () => {
    it('should initialize with light theme when no saved preference', () => {
      service = TestBed.inject(ThemeService);

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        UIActions.setDarkMode({ enabled: false })
      );
    });

    it('should initialize with dark theme when saved preference is true', () => {
      localStorageMock['birthday-app-dark-mode'] = 'true';
      service = TestBed.inject(ThemeService);

      expect(storeSpy.dispatch).toHaveBeenCalledWith(
        UIActions.setDarkMode({ enabled: true })
      );
    });

    it('should apply dark theme class on initial load without transition', fakeAsync(() => {
      service = TestBed.inject(ThemeService);
      darkModeSubject.next(true);
      tick();

      expect(document.body.classList.contains('dark-theme')).toBe(true);
      // No transition on the very first apply (initial page load)
      expect(document.body.classList.contains('theme-transitioning')).toBe(false);
    }));

    it('should add transition on user-triggered toggle after initial load', fakeAsync(() => {
      service = TestBed.inject(ThemeService);
      tick(); // flush initial apply (first apply, isFirstApply set to false)

      darkModeSubject.next(true); // second apply — simulates user toggle
      tick();

      expect(document.body.classList.contains('dark-theme')).toBe(true);
      expect(document.body.classList.contains('theme-transitioning')).toBe(true);

      tick(600);
      expect(document.body.classList.contains('theme-transitioning')).toBe(false);
    }));

    it('should remove dark theme class from body when disabled', fakeAsync(() => {
      document.body.classList.add('dark-theme');
      service = TestBed.inject(ThemeService);
      darkModeSubject.next(false);
      tick();

      expect(document.body.classList.contains('dark-theme')).toBe(false);
      tick(600);
    }));

    it('should save theme preference to localStorage', fakeAsync(() => {
      service = TestBed.inject(ThemeService);
      darkModeSubject.next(true);
      tick();

      expect(localStorage.setItem).toHaveBeenCalledWith('birthday-app-dark-mode', 'true');
      tick(600);
    }));

    it('should update localStorage when theme changes', fakeAsync(() => {
      service = TestBed.inject(ThemeService);
      darkModeSubject.next(true);
      tick(600);
      darkModeSubject.next(false);
      tick(600);

      expect(localStorage.setItem).toHaveBeenCalledWith('birthday-app-dark-mode', 'false');
    }));

    it('should cancel the previous timer when theme changes rapidly', fakeAsync(() => {
      service = TestBed.inject(ThemeService);
      tick(); // flush initial apply so isFirstApply is false

      // Toggle theme 3 times in rapid succession (within 600 ms window)
      darkModeSubject.next(true);
      tick(100);
      darkModeSubject.next(false);
      tick(100);
      darkModeSubject.next(true);
      tick(100);

      // After only 300 ms total, the class should still be present (last timer pending)
      expect(document.body.classList.contains('theme-transitioning')).toBe(true);

      // Advance past the single surviving timer
      tick(500);
      expect(document.body.classList.contains('theme-transitioning')).toBe(false);
    }));
  });

  describe('Server-side rendering', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThemeService,
          { provide: Store, useValue: storeSpy },
          { provide: PLATFORM_ID, useValue: 'server' },
          provideTranslateTesting()
        ]
      });
    });

    it('should not initialize theme on server', () => {
      storeSpy.dispatch.calls.reset();
      service = TestBed.inject(ThemeService);

      expect(storeSpy.dispatch).not.toHaveBeenCalled();
    });

    it('should not access localStorage on server', () => {
      (localStorage.getItem as jasmine.Spy).calls.reset();
      service = TestBed.inject(ThemeService);

      expect(localStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('toggleDarkMode', () => {
    beforeEach(() => {
      service = TestBed.inject(ThemeService);
      storeSpy.dispatch.calls.reset();
    });

    it('should dispatch toggleDarkMode action', () => {
      service.toggleDarkMode();

      expect(storeSpy.dispatch).toHaveBeenCalledWith(UIActions.toggleDarkMode());
    });
  });

  describe('darkMode Signal', () => {
    beforeEach(() => {
      service = TestBed.inject(ThemeService);
    });

    it('should expose darkMode signal', () => {
      expect(typeof service.darkMode()).toBe('boolean');
    });

    it('should reflect dark mode changes', () => {
      expect(service.darkMode()).toBe(false);

      darkModeSubject.next(true);
      expect(service.darkMode()).toBe(true);

      darkModeSubject.next(false);
      expect(service.darkMode()).toBe(false);
    });
  });
});
