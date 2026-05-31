import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockStore,provideMockStore } from '@ngrx/store/testing';

import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CategoryFacadeService } from '../../../core';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';
import { type Birthday, type BirthdayCategory } from '../../../shared';
import { BirthdayStatsService } from './birthday-stats.service';
import { DashboardFacadeService } from './dashboard-facade.service';

describe('DashboardFacadeService', () => {
  let service: DashboardFacadeService;
  let store: MockStore;
  let statsServiceSpy: jasmine.SpyObj<BirthdayStatsService>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'John Doe',
      birthDate: '1990-01-15',
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: '1985-06-20',
      category: 'family',
      zodiacSign: 'Gemini',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    }
  ];

  const mockCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' }
  ];

  const mockNext5Birthdays = [
    { ...mockBirthdays[0], nextBirthday: new Date(2026, 0, 15), daysUntil: 10 },
    { ...mockBirthdays[1], nextBirthday: new Date(2026, 5, 20), daysUntil: 20 }
  ];

  beforeEach(() => {
    const categoryFacadeSpyObj = jasmine.createSpyObj('CategoryFacadeService', [], {
      categories: signal(mockCategories),
      resolvedCategories: signal(mockCategories)
    });

    const statsServiceSpyObj = jasmine.createSpyObj('BirthdayStatsService', [
      'getChartData',
      'getMaxCount',
      'getCategoriesStats'
    ]);

    statsServiceSpyObj.getChartData.and.returnValue([
      { month: 'Jan', count: 1, label: 'January' },
      { month: 'Jun', count: 1, label: 'June' }
    ]);
    statsServiceSpyObj.getMaxCount.and.returnValue(1);
    statsServiceSpyObj.getCategoriesStats.and.returnValue([
      { categoryId: 'friends', count: 1 },
      { categoryId: 'family', count: 1 }
    ]);

    TestBed.configureTestingModule({
      providers: [
        DashboardFacadeService,
        provideMockStore(),
        { provide: BirthdayStatsService, useValue: statsServiceSpyObj },
        provideTranslateTesting()
      ]
    })
      .overrideProvider(CategoryFacadeService, { useValue: categoryFacadeSpyObj });

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, mockBirthdays);
    store.overrideSelector(BirthdaySelectors.selectNext5Birthdays, mockNext5Birthdays);
    store.overrideSelector(BirthdaySelectors.selectAverageAge, 30);
    store.overrideSelector(BirthdaySelectors.selectSelectedCategory, null);
    store.overrideSelector(BirthdaySelectors.selectSearchTerm, '');

    service = TestBed.inject(DashboardFacadeService);
    statsServiceSpy = TestBed.inject(BirthdayStatsService) as jasmine.SpyObj<BirthdayStatsService>;
  });

  afterEach(() => store.resetSelectors());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Computed signals', () => {
    it('should compute totalBirthdays', () => {
      expect(service.totalBirthdays()).toBe(2);
    });

    it('should compute averageAge from store', () => {
      expect(service.averageAge()).toBe(30);
    });

    it('should compute nextBirthdayDays from first upcoming birthday', () => {
      expect(service.nextBirthdayDays()).toBe(10);
    });

    it('should return 0 for nextBirthdayDays when no birthdays', () => {
      store.overrideSelector(BirthdaySelectors.selectNext5Birthdays, []);
      store.refreshState();
      expect(service.nextBirthdayDays()).toBe(0);
    });

    it('should return nextBirthdayText as the person name', () => {
      expect(service.nextBirthdayText()).toBe('John Doe');
    });

    it('should return "N/A" for nextBirthdayText when no birthdays', () => {
      store.overrideSelector(BirthdaySelectors.selectNext5Birthdays, []);
      store.refreshState();
      expect(service.nextBirthdayText()).toBe('N/A');
    });

    it('should compute chartData from stats service', () => {
      const chartData = service.chartData();
      expect(chartData.length).toBe(2);
      expect(statsServiceSpy.getChartData).toHaveBeenCalled();
    });

    it('should compute maxCount from stats service', () => {
      expect(service.maxCount()).toBe(1);
    });

    it('should compute categoriesStats', () => {
      const stats = service.categoriesStats();
      expect(stats.length).toBe(2);
      expect(stats[0].name).toBe('Friends');
      expect(stats[1].name).toBe('Family');
    });

    it('should prepend orphaned entry in categoriesStats when birthdays have invalid category', () => {
      const birthdaysWithOrphaned = [
        ...mockBirthdays,
        {
          id: '99',
          name: 'Orphan Person',
          birthDate: '2000-03-15',
          category: 'nonexistent-cat',
          zodiacSign: 'Pisces',
          reminderDays: 7,
          notes: '',
          scheduledMessages: []
        }
      ];
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, birthdaysWithOrphaned);
      store.refreshState();

      const stats = service.categoriesStats();
      // Orphaned entry is prepended at index 0
      const orphanedEntry = stats.find(s => s.id === '__orphaned__');
      expect(orphanedEntry).toBeDefined();
      expect(orphanedEntry!.count).toBe(1);
    });

    it('should expose categories from facade', () => {
      expect(service.categories()).toEqual(mockCategories);
    });
  });

  describe('Category selection', () => {
    it('should dispatch setSelectedCategory', () => {
      spyOn(store, 'dispatch');
      service.selectCategory('friends');
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should dispatch null when same category is selected again (toggle)', () => {
      store.overrideSelector(BirthdaySelectors.selectSelectedCategory, 'friends');
      store.refreshState();
      spyOn(store, 'dispatch');
      service.selectCategory('friends');
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should clear category filter', () => {
      spyOn(store, 'dispatch');
      service.clearCategoryFilter();
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should check if category is selected', () => {
      store.overrideSelector(BirthdaySelectors.selectSelectedCategory, 'friends');
      store.refreshState();
      expect(service.isCategorySelected('friends')).toBeTrue();
      expect(service.isCategorySelected('family')).toBeFalse();
    });
  });

  describe('Search functionality', () => {
    it('should dispatch setSearchTerm', () => {
      spyOn(store, 'dispatch');
      service.setSearchTerm('John');
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should dispatch clearSearch', () => {
      spyOn(store, 'dispatch');
      service.clearSearch();
      expect(store.dispatch).toHaveBeenCalled();
    });
  });

  describe('Filtered birthdays', () => {
    it('should return all birthdays when no filter', () => {
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(2);
    });

    it('should filter by category', () => {
      store.overrideSelector(BirthdaySelectors.selectSelectedCategory, 'friends');
      store.refreshState();
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
      expect(filtered[0].category).toBe('friends');
    });

    it('should filter by search term', () => {
      store.overrideSelector(BirthdaySelectors.selectSearchTerm, 'John');
      store.refreshState();
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('John Doe');
    });

    it('should be case insensitive when filtering by search', () => {
      store.overrideSelector(BirthdaySelectors.selectSearchTerm, 'john');
      store.refreshState();
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
    });

    it('should filter orphaned categories', () => {
      const birthdaysWithOrphaned = [
        ...mockBirthdays,
        {
          id: '3',
          name: 'Orphan',
          birthDate: '2000-01-01',
          category: 'nonexistent',
          zodiacSign: 'Capricorn',
          reminderDays: 7,
          notes: '',
          scheduledMessages: []
        }
      ];
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, birthdaysWithOrphaned);
      store.overrideSelector(BirthdaySelectors.selectSelectedCategory, '__orphaned__');
      store.refreshState();
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Orphan');
    });

    it('should return empty array when birthdays is null', () => {
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, null as unknown as Birthday[]);
      store.refreshState();
      const filtered = service.filteredBirthdays();
      expect(filtered).toEqual([]);
    });
  });

  describe('Data management', () => {
    it('should dispatch loadTestData', () => {
      spyOn(store, 'dispatch');
      service.loadTestData();
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should dispatch clearAllBirthdays and clear lastAction', () => {
      spyOn(store, 'dispatch');
      service.clearAllData();
      expect(store.dispatch).toHaveBeenCalled();
      expect(service.lastAction()).toBeNull();
    });

    it('should dispatch addBirthday', () => {
      spyOn(store, 'dispatch');
      const newBirthday = { name: 'Test', birthDate: '2000-01-01' } as Omit<Birthday, 'id'>;
      service.addBirthday(newBirthday);
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should store deleted birthday in lastAction', () => {
      spyOn(store, 'dispatch');
      service.deleteBirthday(mockBirthdays[0]);
      expect(service.lastAction()).toEqual({
        type: 'delete',
        data: mockBirthdays[0]
      });
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should undo last delete action', () => {
      spyOn(store, 'dispatch');
      service.deleteBirthday(mockBirthdays[0]);
      (store.dispatch as jasmine.Spy).calls.reset();
      service.undoLastAction();
      expect(store.dispatch).toHaveBeenCalled();
      expect(service.lastAction()).toBeNull();
    });

    it('should not undo if no last action', () => {
      spyOn(store, 'dispatch');
      service.undoLastAction();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when the deleted birthday fails schema validation', () => {
      spyOn(store, 'dispatch');
      service.deleteBirthday({ id: 'x', name: 'X', birthDate: 'not-a-date' } as unknown as Birthday);
      (store.dispatch as jasmine.Spy).calls.reset();
      service.undoLastAction();
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Import birthdays', () => {
    it('should import birthdays with delay', () => {
      spyOn(store, 'dispatch');
      const birthdays = [mockBirthdays[0], mockBirthdays[1]];
      service.importBirthdays(birthdays);
      expect(store.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Birthdays this month', () => {
    it('should count birthdays in the next 30 days', () => {
      const count = service.birthdaysThisMonth();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
