import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { signal } from '@angular/core';

import { HomeComponent } from './home.component';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { SILENT_LOGGER_PROVIDER } from '../../core/services/logger.service';
import { CategoryFacadeService } from '../../core/services/category-facade.service';
import { PhotoStorageService } from '../../core/services/photo-storage.service';
import { FirebaseAuthService } from '../../core/services/firebase-auth.service';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';
import { Birthday } from '../../shared/models';

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
  let categoryFacadeSpy: jasmine.SpyObj<CategoryFacadeService>;

  beforeEach(async () => {
    categoryFacadeSpy = jasmine.createSpyObj('CategoryFacadeService', ['loadCategories'], {
      categories: signal([]),
    });

    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        SILENT_LOGGER_PROVIDER,
        provideTranslateTesting(),
        provideMockStore({ initialState: INITIAL_STATE }),
        { provide: CategoryFacadeService, useValue: categoryFacadeSpy },
        { provide: PhotoStorageService, useValue: jasmine.createSpyObj('PhotoStorageService', ['uploadPhoto']) },
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
      expect(categoryFacadeSpy.loadCategories).toHaveBeenCalledOnceWith();
    });
  });

  describe('toggleAddBirthdaySection', () => {
    it('should expand the form on first toggle', () => {
      expect(component.isAddBirthdayExpanded).toBeFalse();
      component.toggleAddBirthdaySection();
      expect(component.isAddBirthdayExpanded).toBeTrue();
    });

    it('should collapse the form on second toggle', () => {
      component.toggleAddBirthdaySection();
      component.toggleAddBirthdaySection();
      expect(component.isAddBirthdayExpanded).toBeFalse();
    });
  });

  describe('onBirthdaySubmitted', () => {
    it('should dispatch addBirthday and collapse the form', () => {
      const dispatchSpy = spyOn(store, 'dispatch');
      component.isAddBirthdayExpanded = true;
      const { id: _id, ...payload } = MOCK_BIRTHDAY;

      component.onBirthdaySubmitted(payload);

      expect(dispatchSpy).toHaveBeenCalledOnceWith(BirthdayActions.addBirthday({ birthday: payload }));
      expect(component.isAddBirthdayExpanded).toBeFalse();
    });
  });

  describe('addTestData', () => {
    it('should dispatch loadTestData and set isAddingTestData to true then false', fakeAsync(() => {
      const dispatchSpy = spyOn(store, 'dispatch');

      component.addTestData();

      expect(component.isAddingTestData()).toBeTrue();
      expect(dispatchSpy).toHaveBeenCalledOnceWith(BirthdayActions.loadTestData());

      tick(1000);
      expect(component.isAddingTestData()).toBeFalse();
    }));
  });

  describe('dashboard lazy loading', () => {
    it('should not render dashboard container when birthdays list is empty', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('app-dashboard')).toBeNull();
    });

    it('should load dashboard after birthdays become available', async () => {
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [MOCK_BIRTHDAY]);
      store.refreshState();
      fixture.detectChanges();
      await fixture.whenStable();

      // dashboard is loaded into the ViewContainerRef — verify via the private flag
      expect((component as unknown as { isDashboardLoaded: boolean }).isDashboardLoaded).toBeTrue();
    });
  });
});
