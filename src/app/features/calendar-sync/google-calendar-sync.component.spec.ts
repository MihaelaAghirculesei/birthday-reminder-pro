import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { GoogleCalendarSyncComponent } from './google-calendar-sync.component';
import { GoogleCalendarService, GoogleCalendarItem, SILENT_LOGGER_PROVIDER } from '../../core';
import { Birthday } from '../../shared';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

interface GoogleCalendarSettings {
  enabled: boolean;
  calendarId: string;
  syncMode: string;
  reminderMinutes: number;
}

describe('GoogleCalendarSyncComponent', () => {
  let component: GoogleCalendarSyncComponent;
  let fixture: ComponentFixture<GoogleCalendarSyncComponent>;
  let googleCalendarServiceSpy: jasmine.SpyObj<GoogleCalendarService>;
  let store: MockStore;
  let isSignedInSubject: BehaviorSubject<boolean>;
  let settingsSubject: BehaviorSubject<GoogleCalendarSettings>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice',
      birthDate: new Date(1990, 0, 15),
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    }
  ];

  const mockCalendars: GoogleCalendarItem[] = [
    { id: 'calendar1', summary: 'Personal Calendar' },
    { id: 'calendar2', summary: 'Work Calendar' }
  ];

  const mockSettings = {
    enabled: false,
    calendarId: 'primary',
    syncMode: 'one-way',
    reminderMinutes: 1440
  };

  beforeEach(async () => {
    isSignedInSubject = new BehaviorSubject<boolean>(false);
    settingsSubject = new BehaviorSubject<GoogleCalendarSettings>(mockSettings);

    const googleCalendarSpyObj = jasmine.createSpyObj('GoogleCalendarService', [
      'initialize',
      'signIn',
      'signOut',
      'getCalendars',
      'syncAllBirthdays',
      'updateSettings'
    ], {
      isSignedIn$: isSignedInSubject.asObservable(),
      settings$: settingsSubject.asObservable()
    });

    googleCalendarSpyObj.initialize.and.returnValue(Promise.resolve());
    googleCalendarSpyObj.signIn.and.returnValue(Promise.resolve());
    googleCalendarSpyObj.signOut.and.returnValue(Promise.resolve());
    googleCalendarSpyObj.getCalendars.and.returnValue(Promise.resolve(mockCalendars));
    googleCalendarSpyObj.syncAllBirthdays.and.returnValue(Promise.resolve({
      success: 1,
      failed: 0,
      errors: []
    }));

    await TestBed.configureTestingModule({
      imports: [
        GoogleCalendarSyncComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        provideMockStore(),
        FormBuilder,
        { provide: GoogleCalendarService, useValue: googleCalendarSpyObj },
        SILENT_LOGGER_PROVIDER
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, mockBirthdays);
    googleCalendarServiceSpy = TestBed.inject(GoogleCalendarService) as jasmine.SpyObj<GoogleCalendarService>;
    fixture = TestBed.createComponent(GoogleCalendarSyncComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize Google Calendar service', () => {
      fixture.detectChanges();
      expect(googleCalendarServiceSpy.initialize).toHaveBeenCalled();
    });

    it('should initialize settings form with default values', () => {
      expect(component.settingsForm.value).toEqual({
        enabled: false,
        calendarId: 'primary',
        syncMode: 'one-way',
        reminderMinutes: 1440
      });
    });

    it('should update isSignedIn when service emits', () => {
      fixture.detectChanges();
      expect(component.isSignedIn()).toBe(false);

      isSignedInSubject.next(true);
      expect(component.isSignedIn()).toBe(true);
    });

    it('should load calendars when signed in', () => {
      fixture.detectChanges();
      isSignedInSubject.next(true);

      expect(googleCalendarServiceSpy.getCalendars).toHaveBeenCalled();
    });

    it('should patch form when settings change', () => {
      fixture.detectChanges();
      const newSettings = {
        enabled: true,
        calendarId: 'calendar1',
        syncMode: 'two-way',
        reminderMinutes: 2880
      };

      settingsSubject.next(newSettings);

      expect(component.settingsForm.value).toEqual(newSettings);
    });

    it('should update settings when form changes', (done) => {
      fixture.detectChanges();

      component.settingsForm.patchValue({ enabled: true });

      setTimeout(() => {
        expect(googleCalendarServiceSpy.updateSettings).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Sign in', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should sign in to Google Calendar', async () => {
      await component.signIn();

      expect(googleCalendarServiceSpy.signIn).toHaveBeenCalled();
    });

    it('should set isConnecting flag during sign in', async () => {
      const signInPromise = component.signIn();
      expect(component.isConnecting()).toBe(true);

      await signInPromise;
      expect(component.isConnecting()).toBe(false);
    });

    it('should handle sign in error', async () => {
      googleCalendarServiceSpy.signIn.and.returnValue(Promise.reject(new Error('Sign in failed')));

      await component.signIn();

      expect(component.isConnecting()).toBe(false);
    });
  });

  describe('Sign out', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.calendars.set(mockCalendars);
      component.lastSyncResult.set({ success: 1, failed: 0, errors: [] });
    });

    it('should sign out from Google Calendar', async () => {
      await component.signOut();

      expect(googleCalendarServiceSpy.signOut).toHaveBeenCalled();
    });

    it('should clear calendars on sign out', async () => {
      await component.signOut();

      expect(component.calendars()).toEqual([]);
    });

    it('should clear last sync result on sign out', async () => {
      await component.signOut();

      expect(component.lastSyncResult()).toBeNull();
    });

    it('should handle sign out error', async () => {
      googleCalendarServiceSpy.signOut.and.returnValue(Promise.reject(new Error('Sign out failed')));

      await expectAsync(component.signOut()).toBeResolved();
    });
  });

  describe('Load calendars', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should load calendars from service', async () => {
      await component.loadCalendars();

      expect(googleCalendarServiceSpy.getCalendars).toHaveBeenCalled();
      expect(component.calendars()).toEqual(mockCalendars);
    });

    it('should handle calendar loading error', async () => {
      googleCalendarServiceSpy.getCalendars.and.returnValue(Promise.reject(new Error('Failed to load calendars')));

      await expectAsync(component.loadCalendars()).toBeResolved();
    });
  });

  describe('Sync birthdays', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should sync all birthdays', async () => {
      await component.syncAllBirthdays();

      expect(googleCalendarServiceSpy.syncAllBirthdays).toHaveBeenCalledWith(mockBirthdays);
    });

    it('should set isSyncing flag during sync', async () => {
      const syncPromise = component.syncAllBirthdays();
      expect(component.isSyncing()).toBe(true);

      await syncPromise;
      expect(component.isSyncing()).toBe(false);
    });

    it('should update last sync result', async () => {
      const syncResult = { success: 5, failed: 2, errors: ['error1', 'error2'] };
      googleCalendarServiceSpy.syncAllBirthdays.and.returnValue(Promise.resolve(syncResult));

      await component.syncAllBirthdays();

      expect(component.lastSyncResult()).toEqual(syncResult);
    });

    it('should handle sync error', async () => {
      googleCalendarServiceSpy.syncAllBirthdays.and.returnValue(Promise.reject(new Error('Sync failed')));

      await component.syncAllBirthdays();

      expect(component.isSyncing()).toBe(false);
    });
  });

  describe('Save settings', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should save valid settings', () => {
      component.settingsForm.patchValue({ enabled: true });
      component.settingsForm.markAsDirty();

      component.saveSettings();

      expect(googleCalendarServiceSpy.updateSettings).toHaveBeenCalled();
    });

    it('should mark form as pristine after save', () => {
      component.settingsForm.patchValue({ enabled: true });
      component.settingsForm.markAsDirty();

      component.saveSettings();

      expect(component.settingsForm.pristine).toBe(true);
    });

    it('should not save invalid form', () => {
      component.settingsForm.setErrors({ invalid: true });
      googleCalendarServiceSpy.updateSettings.calls.reset();

      component.saveSettings();

      expect(googleCalendarServiceSpy.updateSettings).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should use DestroyRef for subscription cleanup', () => {
      fixture.detectChanges();
      expect(component['destroyRef']).toBeTruthy();
    });
  });
});
