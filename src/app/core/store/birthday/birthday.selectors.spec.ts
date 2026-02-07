import * as fromSelectors from './birthday.selectors';
import { BirthdayState, initialBirthdayFilters } from './birthday.state';
import { Birthday } from '../../../shared/models/birthday.model';

describe('Birthday Selectors', () => {
  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice',
      birthDate: new Date(1990, 4, 15),
      category: 'friends'
    },
    {
      id: '2',
      name: 'Bob',
      birthDate: new Date(1985, 11, 20),
      category: 'family'
    },
    {
      id: '3',
      name: 'Charlie',
      birthDate: new Date(1995, 4, 10),
      category: 'friends'
    }
  ];

  const mockState: BirthdayState = {
    ids: ['1', '2', '3'],
    entities: {
      '1': mockBirthdays[0],
      '2': mockBirthdays[1],
      '3': mockBirthdays[2]
    },
    selectedId: '1',
    filters: { ...initialBirthdayFilters },
    loading: false,
    error: null,
    optimisticBackup: {}
  };

  const state = {
    birthdays: mockState
  };

  it('should select basic state', () => {
    expect(fromSelectors.selectAllBirthdays(state).length).toBe(3);
    expect(fromSelectors.selectBirthdayTotal(state)).toBe(3);
    expect(fromSelectors.selectBirthdayLoading(state)).toBe(false);
    expect(fromSelectors.selectBirthdayError(state)).toBeNull();
    expect(fromSelectors.selectBirthdayFilters(state)).toEqual(initialBirthdayFilters);
  });

  it('should select specific birthday', () => {
    expect(fromSelectors.selectSelectedBirthdayId(state)).toBe('1');
    expect(fromSelectors.selectSelectedBirthday(state)).toEqual(mockBirthdays[0]);
  });

  describe('Filtered Birthdays', () => {
    it('should filter by search term', () => {
      const stateWithSearch = {
        birthdays: {
          ...mockState,
          filters: { ...initialBirthdayFilters, searchTerm: 'ali' }
        }
      };

      const result = fromSelectors.selectFilteredBirthdays(stateWithSearch);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Alice');
    });

    it('should filter by month', () => {
      const stateWithMonth = {
        birthdays: {
          ...mockState,
          filters: { ...initialBirthdayFilters, selectedMonth: 4 }
        }
      };

      const result = fromSelectors.selectFilteredBirthdays(stateWithMonth);
      expect(result.length).toBe(2);
    });

    it('should filter by category', () => {
      const stateWithCategory = {
        birthdays: {
          ...mockState,
          filters: { ...initialBirthdayFilters, selectedCategory: 'family' }
        }
      };

      const result = fromSelectors.selectFilteredBirthdays(stateWithCategory);
      expect(result.length).toBe(1);
      expect(result[0].category).toBe('family');
    });

    it('should sort by name', () => {
      const result = fromSelectors.selectFilteredBirthdays(state);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });
  });

  it('should calculate statistics', () => {
    expect(fromSelectors.selectAverageAge(state)).toBeGreaterThan(0);
    const byMonth = fromSelectors.selectBirthdaysByMonth(state);
    expect(byMonth.length).toBe(12);
    expect(byMonth[4].count).toBe(2);
  });

  it('should select birthday by id', () => {
    const selector = fromSelectors.selectBirthdayById('2');
    expect(selector(state)).toEqual(mockBirthdays[1]);
  });

  describe('Individual Filter Selectors', () => {
    it('should select search term', () => {
      const stateWithSearch = {
        birthdays: {
          ...mockState,
          filters: { ...mockState.filters, searchTerm: 'test' }
        }
      };
      expect(fromSelectors.selectSearchTerm(stateWithSearch)).toBe('test');
    });

    it('should select selected month', () => {
      const stateWithMonth = {
        birthdays: {
          ...mockState,
          filters: { ...mockState.filters, selectedMonth: 5 }
        }
      };
      expect(fromSelectors.selectSelectedMonth(stateWithMonth)).toBe(5);
    });

    it('should select selected category', () => {
      const stateWithCategory = {
        birthdays: {
          ...mockState,
          filters: { ...mockState.filters, selectedCategory: 'family' }
        }
      };
      expect(fromSelectors.selectSelectedCategory(stateWithCategory)).toBe('family');
    });

    it('should select sort order', () => {
      const stateWithSort = {
        birthdays: {
          ...mockState,
          filters: { ...mockState.filters, sortOrder: 'age' as const }
        }
      };
      expect(fromSelectors.selectSortOrder(stateWithSort)).toBe('age');
    });
  });

  describe('Sorting in Filtered Birthdays', () => {
    it('should sort by age', () => {
      const stateWithAgeSort = {
        birthdays: {
          ...mockState,
          filters: { ...mockState.filters, sortOrder: 'age' as const }
        }
      };
      const result = fromSelectors.selectFilteredBirthdays(stateWithAgeSort);
      expect(result[0].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    it('should sort by next birthday', () => {
      const stateWithNextBirthdaySort = {
        birthdays: {
          ...mockState,
          filters: { ...mockState.filters, sortOrder: 'nextBirthday' as const }
        }
      };
      const result = fromSelectors.selectFilteredBirthdays(stateWithNextBirthdaySort);
      expect(result.length).toBe(3);
    });
  });

  describe('Upcoming Birthdays', () => {
    it('should select upcoming birthdays within 30 days', () => {
      const selector = fromSelectors.selectUpcomingBirthdays(30);
      const result = selector(state);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should select upcoming birthdays with custom days', () => {
      const selector = fromSelectors.selectUpcomingBirthdays(60);
      const result = selector(state);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  it('should select birthdays this month', () => {
    const result = fromSelectors.selectBirthdaysThisMonth(state);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should select next 5 birthdays', () => {
    const result = fromSelectors.selectNext5Birthdays(state);
    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.length).toBe(3);
    expect(result[0].nextBirthday).toBeDefined();
    expect(result[0].daysUntil).toBeDefined();
  });

  it('should select average age with empty birthdays', () => {
    const emptyState = {
      birthdays: {
        ...mockState,
        ids: [],
        entities: {}
      }
    };
    expect(fromSelectors.selectAverageAge(emptyState)).toBe(0);
  });

  it('should select messages by birthday id', () => {
    const mockMessage = {
      id: 'msg1',
      birthdayId: '1',
      title: 'Test',
      message: 'Test message',
      scheduledTime: '10:00',
      priority: 'normal' as const,
      active: true,
      messageType: 'text' as const,
      createdDate: new Date()
    };

    const stateWithMessages = {
      birthdays: {
        ...mockState,
        entities: {
          ...mockState.entities,
          '1': {
            ...mockState.entities['1']!,
            scheduledMessages: [mockMessage]
          }
        }
      }
    };

    const selector = fromSelectors.selectMessagesByBirthday('1');
    const result = selector(stateWithMessages);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual(mockMessage);
  });

  it('should return empty array for messages when birthday has no messages', () => {
    const selector = fromSelectors.selectMessagesByBirthday('2');
    const result = selector(state);
    expect(result).toEqual([]);
  });

  it('should return empty array for messages when birthday not found', () => {
    const selector = fromSelectors.selectMessagesByBirthday('non-existent');
    const result = selector(state);
    expect(result).toEqual([]);
  });
});
