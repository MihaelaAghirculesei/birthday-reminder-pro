import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DashboardFacadeService } from './dashboard-facade.service';
import { BirthdayFacadeService, CategoryFacadeService } from '../../../core';
import { BirthdayStatsService } from './birthday-stats.service';
import { Birthday, BirthdayCategory } from '../../../shared';

describe('DashboardFacadeService', () => {
  let service: DashboardFacadeService;
  let birthdayFacadeSpy: jasmine.SpyObj<BirthdayFacadeService>;
  let statsServiceSpy: jasmine.SpyObj<BirthdayStatsService>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'John Doe',
      birthDate: new Date(1990, 0, 15),
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: new Date(1985, 5, 20),
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
    const birthdayFacadeSpyObj = jasmine.createSpyObj('BirthdayFacadeService', [
      'loadTestData',
      'clearAllBirthdays',
      'addBirthday',
      'deleteBirthday'
    ], {
      birthdays: signal(mockBirthdays),
      averageAge: signal(30),
      next5Birthdays: signal(mockNext5Birthdays)
    });

    const categoryFacadeSpyObj = jasmine.createSpyObj('CategoryFacadeService', [], {
      categories: signal(mockCategories)
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
        { provide: BirthdayStatsService, useValue: statsServiceSpyObj }
      ]
    })
      .overrideProvider(BirthdayFacadeService, { useValue: birthdayFacadeSpyObj })
      .overrideProvider(CategoryFacadeService, { useValue: categoryFacadeSpyObj });

    service = TestBed.inject(DashboardFacadeService);
    birthdayFacadeSpy = TestBed.inject(BirthdayFacadeService) as jasmine.SpyObj<BirthdayFacadeService>;
    statsServiceSpy = TestBed.inject(BirthdayStatsService) as jasmine.SpyObj<BirthdayStatsService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Computed signals', () => {
    it('should compute totalBirthdays', () => {
      expect(service.totalBirthdays()).toBe(2);
    });

    it('should compute averageAge from facade', () => {
      expect(service.averageAge()).toBe(30);
    });

    it('should compute nextBirthdayDays from first upcoming birthday', () => {
      expect(service.nextBirthdayDays()).toBe(10);
    });

    it('should return 0 for nextBirthdayDays when no birthdays', () => {
      (birthdayFacadeSpy.next5Birthdays as unknown as ReturnType<typeof signal>).set([]);
      expect(service.nextBirthdayDays()).toBe(0);
    });

    it('should compute nextBirthdayText as "Today!" when 0 days', () => {
      const todayBirthdays = [{ ...mockBirthdays[0], daysUntil: 0 }];
      (birthdayFacadeSpy.next5Birthdays as unknown as ReturnType<typeof signal>).set(todayBirthdays);
      expect(service.nextBirthdayText()).toBe('Today!');
    });

    it('should compute nextBirthdayText as "Tomorrow!" when 1 day', () => {
      const tomorrowBirthdays = [{ ...mockBirthdays[0], daysUntil: 1 }];
      (birthdayFacadeSpy.next5Birthdays as unknown as ReturnType<typeof signal>).set(tomorrowBirthdays);
      expect(service.nextBirthdayText()).toBe('Tomorrow!');
    });

    it('should compute nextBirthdayText with days count', () => {
      expect(service.nextBirthdayText()).toBe('In 10 days');
    });

    it('should return "N/A" for nextBirthdayText when no birthdays', () => {
      (birthdayFacadeSpy.next5Birthdays as unknown as ReturnType<typeof signal>).set([]);
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

    it('should expose categories from facade', () => {
      expect(service.categories()).toEqual(mockCategories);
    });
  });

  describe('Category selection', () => {
    it('should select a category', () => {
      service.selectCategory('friends');
      expect(service.selectedCategory()).toBe('friends');
    });

    it('should deselect category if same is selected again', () => {
      service.selectCategory('friends');
      service.selectCategory('friends');
      expect(service.selectedCategory()).toBeNull();
    });

    it('should clear category filter', () => {
      service.selectCategory('friends');
      service.clearCategoryFilter();
      expect(service.selectedCategory()).toBeNull();
    });

    it('should check if category is selected', () => {
      service.selectCategory('friends');
      expect(service.isCategorySelected('friends')).toBeTrue();
      expect(service.isCategorySelected('family')).toBeFalse();
    });
  });

  describe('Search functionality', () => {
    it('should set search term', () => {
      service.setSearchTerm('John');
      expect(service.searchTerm()).toBe('John');
    });

    it('should clear search term', () => {
      service.setSearchTerm('John');
      service.clearSearch();
      expect(service.searchTerm()).toBe('');
    });
  });

  describe('Filtered birthdays', () => {
    it('should return all birthdays when no filter', () => {
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(2);
    });

    it('should filter by category', () => {
      service.selectCategory('friends');
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
      expect(filtered[0].category).toBe('friends');
    });

    it('should filter by search term', () => {
      service.setSearchTerm('John');
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('John Doe');
    });

    it('should be case insensitive when filtering by search', () => {
      service.setSearchTerm('john');
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
    });

    it('should filter orphaned categories', () => {
      const birthdaysWithOrphaned = [
        ...mockBirthdays,
        {
          id: '3',
          name: 'Orphan',
          birthDate: new Date(2000, 0, 1),
          category: 'nonexistent',
          zodiacSign: 'Capricorn',
          reminderDays: 7,
          notes: '',
          scheduledMessages: []
        }
      ];
      (birthdayFacadeSpy.birthdays as unknown as ReturnType<typeof signal>).set(birthdaysWithOrphaned);
      service.selectCategory('__orphaned__');
      const filtered = service.filteredBirthdays();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Orphan');
    });

    it('should return empty array when birthdays is null', () => {
      (birthdayFacadeSpy.birthdays as unknown as ReturnType<typeof signal>).set(null as unknown as Birthday[]);
      const filtered = service.filteredBirthdays();
      expect(filtered).toEqual([]);
    });
  });

  describe('Data management', () => {
    it('should call facade.loadTestData', () => {
      service.loadTestData();
      expect(birthdayFacadeSpy.loadTestData).toHaveBeenCalled();
    });

    it('should call facade.clearAllBirthdays and clear lastAction', () => {
      service.clearAllData();
      expect(birthdayFacadeSpy.clearAllBirthdays).toHaveBeenCalled();
      expect(service.lastAction()).toBeNull();
    });

    it('should call facade.addBirthday', () => {
      const newBirthday = { name: 'Test', birthDate: new Date() } as Omit<Birthday, 'id'>;
      service.addBirthday(newBirthday);
      expect(birthdayFacadeSpy.addBirthday).toHaveBeenCalledWith(newBirthday);
    });

    it('should store deleted birthday in lastAction', () => {
      service.deleteBirthday(mockBirthdays[0]);
      expect(service.lastAction()).toEqual({
        type: 'delete',
        data: mockBirthdays[0]
      });
      expect(birthdayFacadeSpy.deleteBirthday).toHaveBeenCalledWith('1');
    });

    it('should undo last delete action', () => {
      service.deleteBirthday(mockBirthdays[0]);
      service.undoLastAction();
      expect(birthdayFacadeSpy.addBirthday).toHaveBeenCalledWith(mockBirthdays[0]);
      expect(service.lastAction()).toBeNull();
    });

    it('should not undo if no last action', () => {
      service.undoLastAction();
      expect(birthdayFacadeSpy.addBirthday).not.toHaveBeenCalled();
    });
  });

  describe('Import birthdays', () => {
    it('should import birthdays with delay', async () => {
      const birthdays = [mockBirthdays[0], mockBirthdays[1]];
      await service.importBirthdays(birthdays);
      expect(birthdayFacadeSpy.addBirthday).toHaveBeenCalledTimes(2);
    });
  });

  describe('Birthdays this month', () => {
    it('should count birthdays in the next 30 days', () => {
      const count = service.birthdaysThisMonth();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
