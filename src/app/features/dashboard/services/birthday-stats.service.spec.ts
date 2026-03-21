import { TestBed } from '@angular/core/testing';
import { BirthdayStatsService } from './birthday-stats.service';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { Birthday } from '../../../shared';
import { parseLocalDate } from '../../../shared/utils/date.utils';

describe('BirthdayStatsService', () => {
  let service: BirthdayStatsService;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice',
      birthDate: '1990-01-15',
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Bob',
      birthDate: '1985-06-20',
      category: 'family',
      zodiacSign: 'Gemini',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '3',
      name: 'Charlie',
      birthDate: '1992-01-10',
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
    service = TestBed.inject(BirthdayStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateStats', () => {
    it('should calculate total birthdays', () => {
      const stats = service.calculateStats(mockBirthdays);
      expect(stats.total).toBe(3);
    });

    it('should calculate birthdays this month', () => {
      const currentMonth = new Date().getMonth();
      const birthdaysThisMonth = mockBirthdays.filter(
        b => parseLocalDate(b.birthDate).getMonth() === currentMonth
      );
      const stats = service.calculateStats(mockBirthdays);
      expect(stats.thisMonth).toBe(birthdaysThisMonth.length);
    });

    it('should calculate average age', () => {
      const stats = service.calculateStats(mockBirthdays);
      expect(stats.averageAge).toBeGreaterThan(0);
      expect(typeof stats.averageAge).toBe('number');
    });

    it('should return 0 average age for empty birthdays', () => {
      const stats = service.calculateStats([]);
      expect(stats.averageAge).toBe(0);
    });

    it('should calculate next birthday days', () => {
      const stats = service.calculateStats(mockBirthdays);
      expect(stats.nextBirthdayDays).toBeGreaterThanOrEqual(0);
      expect(stats.nextBirthdayDays).toBeLessThanOrEqual(365);
    });

    it('should provide next birthday text', () => {
      const stats = service.calculateStats(mockBirthdays);
      expect(stats.nextBirthdayText).toBeTruthy();
      expect(typeof stats.nextBirthdayText).toBe('string');
    });

    it('should return "No upcoming birthdays" for empty array', () => {
      const stats = service.calculateStats([]);
      expect(stats.nextBirthdayText).toBe('No upcoming birthdays');
      expect(stats.nextBirthdayDays).toBe(0);
    });
  });

  describe('getChartData', () => {
    it('should return data for all 12 months', () => {
      const chartData = service.getChartData(mockBirthdays);
      expect(chartData.length).toBe(12);
    });

    it('should have correct month labels', () => {
      const chartData = service.getChartData(mockBirthdays);
      expect(chartData[0].month).toBe('Jan');
      expect(chartData[11].month).toBe('Dec');
    });

    it('should have correct full month labels', () => {
      const chartData = service.getChartData(mockBirthdays);
      expect(chartData[0].label).toBe('January');
      expect(chartData[11].label).toBe('December');
    });

    it('should count birthdays per month correctly', () => {
      const chartData = service.getChartData(mockBirthdays);
      const januaryCount = mockBirthdays.filter(b => parseLocalDate(b.birthDate).getMonth() === 0).length;
      expect(chartData[0].count).toBe(januaryCount);
    });

    it('should return zero counts for months with no birthdays', () => {
      const singleBirthday = [mockBirthdays[0]]; 
      const chartData = service.getChartData(singleBirthday);
      expect(chartData[1].count).toBe(0); 
    });

    it('should handle empty birthdays array', () => {
      const chartData = service.getChartData([]);
      expect(chartData.length).toBe(12);
      expect(chartData.every(item => item.count === 0)).toBe(true);
    });
  });

  describe('getMaxCount', () => {
    it('should return maximum count from chart data', () => {
      const chartData = service.getChartData(mockBirthdays);
      const maxCount = service.getMaxCount(chartData);
      expect(maxCount).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for empty chart data', () => {
      const maxCount = service.getMaxCount([]);
      expect(maxCount).toBe(0);
    });

    it('should find correct max value', () => {
      const chartData = [
        { month: 'Jan', count: 5, label: 'January' },
        { month: 'Feb', count: 10, label: 'February' },
        { month: 'Mar', count: 3, label: 'March' }
      ];
      const maxCount = service.getMaxCount(chartData);
      expect(maxCount).toBe(10);
    });
  });

  describe('getCategoriesStats', () => {
    it('should count birthdays per category', () => {
      const categoryStats = service.getCategoriesStats(mockBirthdays);
      expect(categoryStats.length).toBeGreaterThan(0);
    });

    it('should return correct category counts', () => {
      const categoryStats = service.getCategoriesStats(mockBirthdays);
      const friendsCategory = categoryStats.find(s => s.categoryId === 'friends');
      expect(friendsCategory).toBeTruthy();
      expect(friendsCategory?.count).toBe(2);
    });

    it('should handle birthdays without category', () => {
      const birthdayNoCategory: Birthday = {
        ...mockBirthdays[0],
        id: '4',
        category: undefined
      };
      const categoryStats = service.getCategoriesStats([birthdayNoCategory]);
      const defaultCategory = categoryStats.find(s => s.categoryId === 'default');
      expect(defaultCategory).toBeTruthy();
      expect(defaultCategory?.count).toBe(1);
    });

    it('should return empty array for empty birthdays', () => {
      const categoryStats = service.getCategoriesStats([]);
      expect(categoryStats).toEqual([]);
    });

    it('should handle multiple categories', () => {
      const categoryStats = service.getCategoriesStats(mockBirthdays);
      expect(categoryStats.length).toBe(2); 
    });
  });

  describe('getBarHeight', () => {
    it('should calculate percentage height correctly', () => {
      const height = service.getBarHeight(5, 10);
      expect(height).toBe(50);
    });

    it('should return 100 for max value', () => {
      const height = service.getBarHeight(10, 10);
      expect(height).toBe(100);
    });

    it('should return 0 when count is 0', () => {
      const height = service.getBarHeight(0, 10);
      expect(height).toBe(0);
    });

    it('should return 0 when maxCount is 0', () => {
      const height = service.getBarHeight(5, 0);
      expect(height).toBe(0);
    });

    it('should return 0 when maxCount is null', () => {
      const height = service.getBarHeight(5, null);
      expect(height).toBe(0);
    });

    it('should handle decimal percentages', () => {
      const height = service.getBarHeight(3, 7);
      expect(height).toBeCloseTo(42.86, 1);
    });
  });
});
