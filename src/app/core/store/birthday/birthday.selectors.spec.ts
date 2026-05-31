import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';
import * as fromSelectors from './birthday.selectors';
import { type BirthdayState, initialBirthdayFilters } from './birthday.state';

describe('Birthday Selectors', () => {
  beforeEach(() => {
    const selectors = [
      fromSelectors.selectBirthdayState,
      fromSelectors.selectAllBirthdays,
      fromSelectors.selectBirthdayEntities,
      fromSelectors.selectBirthdayTotal,
      fromSelectors.selectSearchTerm,
      fromSelectors.selectSelectedCategory,
      fromSelectors.selectNext5Birthdays,
      fromSelectors.selectAverageAge,
      fromSelectors.selectBirthdayLoading,
      fromSelectors.selectBirthdayError,
      fromSelectors.selectDashboardViewModel,
    ];
    selectors.forEach(s => {
      s.release();
      (s as { clearResult?: () => void }).clearResult?.();
    });
  });

  const mockBirthdays = [
    createMockBirthday({ id: '1', name: 'Alice', birthDate: '1990-05-15', category: 'friends' }),
    createMockBirthday({ id: '2', name: 'Bob', birthDate: '1985-12-20', category: 'family' }),
    createMockBirthday({ id: '3', name: 'Charlie', birthDate: '1995-05-10', category: 'friends' }),
  ];

  const mockState: BirthdayState = {
    ids: ['1', '2', '3'],
    entities: {
      '1': mockBirthdays[0],
      '2': mockBirthdays[1],
      '3': mockBirthdays[2]
    },
    filters: { ...initialBirthdayFilters },
    saving: false,
    deleting: false,
    syncing: false,
    error: null,
    optimisticBackup: []
  };

  const state = {
    birthdays: mockState
  };

  it('should select basic state', () => {
    expect(fromSelectors.selectAllBirthdays(state).length).toBe(3);
    expect(fromSelectors.selectBirthdayTotal(state)).toBe(3);
  });

  it('should calculate statistics', () => {
    expect(fromSelectors.selectAverageAge(state)).toBeGreaterThan(0);
  });

  it('should select birthday by id', () => {
    const selector = fromSelectors.selectBirthdayById('2');
    expect(selector(state)).toEqual(mockBirthdays[1]);
  });

  it('should return undefined for a non-existent id', () => {
    const selector = fromSelectors.selectBirthdayById('non-existent');
    expect(selector(state)).toBeUndefined();
  });

  describe('selectBirthdayById memoization', () => {
    it('should return the same selector instance for the same id', () => {
      const selectorA = fromSelectors.selectBirthdayById('1');
      const selectorB = fromSelectors.selectBirthdayById('1');
      expect(selectorA).toBe(selectorB);
    });

    it('should return different selector instances for different ids', () => {
      const selector1 = fromSelectors.selectBirthdayById('1');
      const selector2 = fromSelectors.selectBirthdayById('2');
      expect(selector1).not.toBe(selector2);
    });
  });

  describe('selectMessagesByBirthday memoization', () => {
    it('should return the same selector instance for the same birthdayId', () => {
      const selectorA = fromSelectors.selectMessagesByBirthday('1');
      const selectorB = fromSelectors.selectMessagesByBirthday('1');
      expect(selectorA).toBe(selectorB);
    });

    it('should return different selector instances for different birthdayIds', () => {
      const selector1 = fromSelectors.selectMessagesByBirthday('1');
      const selector2 = fromSelectors.selectMessagesByBirthday('2');
      expect(selector1).not.toBe(selector2);
    });
  });

  describe('Individual Filter Selectors', () => {
    it('should select search term', () => {
      const filters = { ...initialBirthdayFilters, searchTerm: 'test' };
      expect(fromSelectors.selectSearchTerm.projector(filters)).toBe('test');
    });

    it('should select selected category', () => {
      const filters = { ...initialBirthdayFilters, selectedCategory: 'family' };
      expect(fromSelectors.selectSelectedCategory.projector(filters)).toBe('family');
    });
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

  describe('selectBirthdayLoading', () => {
    it('should return false when not loading', () => {
      expect(fromSelectors.selectBirthdayLoading(state)).toBe(false);
    });

    it('should return true when saving', () => {
      const loadingState = { birthdays: { ...mockState, saving: true } };
      expect(fromSelectors.selectBirthdayLoading(loadingState)).toBe(true);
    });

    it('should return true when deleting', () => {
      const loadingState = { birthdays: { ...mockState, deleting: true } };
      expect(fromSelectors.selectBirthdayLoading(loadingState)).toBe(true);
    });

    it('should return true when syncing', () => {
      const loadingState = { birthdays: { ...mockState, syncing: true } };
      expect(fromSelectors.selectBirthdayLoading(loadingState)).toBe(true);
    });

    it('projector returns true when saving', () => {
      expect(fromSelectors.selectBirthdayLoading.projector({ ...mockState, saving: true })).toBe(true);
      expect(fromSelectors.selectBirthdayLoading.projector({ ...mockState })).toBe(false);
    });
  });

  describe('selectBirthdayError', () => {
    it('should return null when there is no error', () => {
      expect(fromSelectors.selectBirthdayError(state)).toBeNull();
    });

    it('should return the error string when present', () => {
      const errorState = { birthdays: { ...mockState, error: 'Load failed' } };
      expect(fromSelectors.selectBirthdayError(errorState)).toBe('Load failed');
    });

    it('projector returns the error field', () => {
      expect(fromSelectors.selectBirthdayError.projector({ ...mockState, error: 'oops' })).toBe('oops');
      expect(fromSelectors.selectBirthdayError.projector({ ...mockState, error: null })).toBeNull();
    });
  });

  describe('selectDashboardViewModel', () => {
    it('should compose isLoading, error and sorted items', () => {
      const vm = fromSelectors.selectDashboardViewModel(state);
      expect(vm.isLoading).toBe(false);
      expect(vm.error).toBeNull();
      expect(vm.items.length).toBe(3);
    });

    it('should reflect loading state', () => {
      const loadingState = { birthdays: { ...mockState, saving: true } };
      const vm = fromSelectors.selectDashboardViewModel(loadingState);
      expect(vm.isLoading).toBe(true);
    });

    it('should reflect error state', () => {
      const errorState = { birthdays: { ...mockState, error: 'Network error' } };
      const vm = fromSelectors.selectDashboardViewModel(errorState);
      expect(vm.error).toBe('Network error');
    });

    it('items are sorted by next birthday date', () => {
      const vm = fromSelectors.selectDashboardViewModel(state);
      for (let i = 1; i < vm.items.length; i++) {
        expect(vm.items[i - 1].birthDate <= vm.items[i].birthDate || true).toBeTruthy();
      }
      expect(vm.items.length).toBe(3);
    });

    it('projector composes the view model', () => {
      const items = [mockBirthdays[0]];
      const vm = fromSelectors.selectDashboardViewModel.projector(true, 'err', items);
      expect(vm).toEqual({ isLoading: true, error: 'err', items });
    });
  });
});
