import { signal } from '@angular/core';
import { type ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import type { MockedObject } from 'vitest';

import { CategoryFacadeService } from '../../core/services/category-facade.service';
import { FirebaseAuthService } from '../../core/services/firebase-auth.service';
import { SILENT_LOGGER_PROVIDER } from '../../core/services/logger.service';
import { PhotoStorageService } from '../../core/services/photo-storage.service';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';
import { type Birthday } from '../../shared/models';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { HomeComponent } from './home.component';

const MOCK_BIRTHDAY: Birthday = {
  id: '1',
  name: 'Alice',
  birthDate: '1990-06-15',
  category: 'Family',
  zodiacSign: 'Gemini',
};

const INITIAL_STATE = {
  birthdays: { ids: [], entities: {}, filters: { searchTerm: '', selectedCategory: null }, loading: false, error: null, optimisticBackup: [] },
  auth: { user: null, loading: false, error: null, initialized: true },
  categories: { ids: [], entities: {}, loaded: false, loading: false, error: null },
  sync: { status: 'idle', lastSyncedAt: null, error: null },
};

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let store: MockStore;
  let categoryFacadeSpy: MockedObject<CategoryFacadeService>;

  beforeEach(async () => {
    categoryFacadeSpy = {
      loadCategories: vi.fn().mockName('CategoryFacadeService.loadCategories'),
      categories: signal([])
    } as unknown as MockedObject<CategoryFacadeService>;

    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        SILENT_LOGGER_PROVIDER,
        provideTranslateTesting(),
        provideMockStore({ initialState: INITIAL_STATE }),
        { provide: CategoryFacadeService, useValue: categoryFacadeSpy },
        {
          provide: PhotoStorageService, useValue: {
            uploadPhoto: vi.fn().mockName('PhotoStorageService.uploadPhoto')
          }
        },
        { provide: FirebaseAuthService, useValue: { currentUser: null } },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, []);
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => store.resetSelectors());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call loadCategories on init', () => {
      expect(categoryFacadeSpy.loadCategories).toHaveBeenCalledTimes(1);
      expect(categoryFacadeSpy.loadCategories).toHaveBeenCalledWith();
    });
  });

  describe('toggleAddBirthdaySection', () => {
    it('should expand the form on first toggle', () => {
      expect(component.isAddBirthdayExpanded).toBe(false);
      component.toggleAddBirthdaySection();
      expect(component.isAddBirthdayExpanded).toBe(true);
    });

    it('should collapse the form on second toggle', () => {
      component.toggleAddBirthdaySection();
      component.toggleAddBirthdaySection();
      expect(component.isAddBirthdayExpanded).toBe(false);
    });
  });

  describe('onBirthdaySubmitted', () => {
    it('should dispatch addBirthday and collapse the form', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      component.isAddBirthdayExpanded = true;
      const { id: _id, ...payload } = MOCK_BIRTHDAY;

      component.onBirthdaySubmitted(payload);

      expect(dispatchSpy).toHaveBeenCalledTimes(1);

      expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.addBirthday({ birthday: payload }));
      expect(component.isAddBirthdayExpanded).toBe(false);
    });
  });

  describe('addTestData', () => {
    it('should dispatch loadTestData and set isAddingTestData to true then false', fakeAsync(() => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      component.addTestData();

      expect(component.isAddingTestData()).toBe(true);
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy).toHaveBeenCalledWith(BirthdayActions.loadTestData());

      tick(1000);
      expect(component.isAddingTestData()).toBe(false);
    }));
  });

  describe('dashboard lazy loading', () => {
    it('should not render dashboard container when birthdays list is empty', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-dashboard')).toBeNull();
    });

    it('should load dashboard after birthdays become available', async () => {
      // loadDashboard() is fired without being awaited and lazily imports the dashboard,
      // so wait on the promise it returns rather than on Angular's stability.
      const loadDashboard = vi.spyOn(component as unknown as {
        loadDashboard(): Promise<void>;
      }, 'loadDashboard');
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [MOCK_BIRTHDAY]);
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();
      await loadDashboard.mock.results.at(-1)!.value;

      // dashboard is loaded into the ViewContainerRef — verify via the private flag
      expect((component as unknown as {
        isDashboardLoaded: boolean;
      }).isDashboardLoaded).toBe(true);
    });
  });
});
