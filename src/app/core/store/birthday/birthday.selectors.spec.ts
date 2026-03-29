import * as fromSelectors from './birthday.selectors';
import { BirthdayState, initialBirthdayFilters } from './birthday.state';
import { Birthday } from '../../../shared/models/birthday.model';

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
    ];
    selectors.forEach(s => {
      s.release();
      (s as { clearResult?: () => void }).clearResult?.();
    });
  });

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice',
      birthDate: '1990-05-15',
      category: 'friends'
    },
    {
      id: '2',
      name: 'Bob',
      birthDate: '1985-12-20',
      category: 'family'
    },
    {
      id: '3',
      name: 'Charlie',
      birthDate: '1995-05-10',
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
});
