import {
  BIRTHDAY_CATEGORIES,
  type BirthdayCategory,
  DEFAULT_CATEGORY,
  getAllCategories,
  getCategoryById,
  getCategoryColor,
  getCategoryIcon,
  getCustomCategories} from './categories';

describe('Categories Constants', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('BIRTHDAY_CATEGORIES', () => {
    it('should have default categories defined', () => {
      expect(BIRTHDAY_CATEGORIES.length).toBeGreaterThan(0);
      expect(BIRTHDAY_CATEGORIES[0].id).toBeDefined();
      expect(BIRTHDAY_CATEGORIES[0].name).toBeDefined();
      expect(BIRTHDAY_CATEGORIES[0].icon).toBeDefined();
      expect(BIRTHDAY_CATEGORIES[0].color).toBeDefined();
    });

    it('should have family category', () => {
      const family = BIRTHDAY_CATEGORIES.find(c => c.id === 'family');
      expect(family).toBeDefined();
      expect(family?.name).toBe('Family');
    });
  });

  describe('DEFAULT_CATEGORY', () => {
    it('should be friends', () => {
      expect(DEFAULT_CATEGORY).toBe('friends');
    });
  });

  describe('getCustomCategories', () => {
    it('should return empty array when no custom categories', () => {
      const result = getCustomCategories();
      expect(result).toEqual([]);
    });

    it('should return custom categories from localStorage', () => {
      const mockCategories: BirthdayCategory[] = [
        { id: 'custom1', name: 'Custom', icon: 'star', color: '#FF0000' }
      ];
      localStorage.setItem('customCategories', JSON.stringify(mockCategories));

      const result = getCustomCategories();
      expect(result).toEqual(mockCategories);
    });

    it('should handle JSON parse error', () => {
      localStorage.setItem('customCategories', 'invalid-json{');
      const result = getCustomCategories();
      expect(result).toEqual([]);
    });
  });

  describe('getAllCategories', () => {
    it('should return default categories when no modifications', () => {
      const result = getAllCategories();
      expect(result.length).toBe(BIRTHDAY_CATEGORIES.length);
    });

    it('should filter out deleted categories', () => {
      localStorage.setItem('deletedCategoryIds', JSON.stringify(['family']));
      const result = getAllCategories();
      expect(result.find(c => c.id === 'family')).toBeUndefined();
    });

    it('should include custom categories', () => {
      const customCategory: BirthdayCategory = {
        id: 'custom1',
        name: 'Custom',
        icon: 'star',
        color: '#FF0000'
      };
      localStorage.setItem('customCategories', JSON.stringify([customCategory]));

      const result = getAllCategories();
      expect(result.find(c => c.id === 'custom1')).toEqual(customCategory);
    });

    it('should apply modified categories', () => {
      const modifiedCategory: BirthdayCategory = {
        id: 'family',
        name: 'Modified Family',
        icon: 'home',
        color: '#00FF00'
      };
      localStorage.setItem('modifiedCategories', JSON.stringify([modifiedCategory]));

      const result = getAllCategories();
      const family = result.find(c => c.id === 'family');
      expect(family?.name).toBe('Modified Family');
      expect(family?.icon).toBe('home');
    });

    it('should filter deleted custom categories', () => {
      const customCategory: BirthdayCategory = {
        id: 'custom1',
        name: 'Custom',
        icon: 'star',
        color: '#FF0000'
      };
      localStorage.setItem('customCategories', JSON.stringify([customCategory]));
      localStorage.setItem('deletedCategoryIds', JSON.stringify(['custom1']));

      const result = getAllCategories();
      expect(result.find(c => c.id === 'custom1')).toBeUndefined();
    });

    it('should handle JSON parse errors in deletedCategoryIds', () => {
      localStorage.setItem('deletedCategoryIds', 'invalid-json');
      const result = getAllCategories();
      expect(result.length).toBe(BIRTHDAY_CATEGORIES.length);
    });

    it('should handle JSON parse errors in modifiedCategories', () => {
      localStorage.setItem('modifiedCategories', 'invalid-json');
      const result = getAllCategories();
      expect(result.length).toBe(BIRTHDAY_CATEGORIES.length);
    });
  });

  describe('getCategoryById', () => {
    it('should return category by id', () => {
      const result = getCategoryById('family');
      expect(result).toBeDefined();
      expect(result?.id).toBe('family');
    });

    it('should return undefined for non-existent id', () => {
      const result = getCategoryById('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getCategoryIcon', () => {
    it('should return icon for existing category', () => {
      const result = getCategoryIcon('family');
      expect(result).toBe('family_restroom');
    });

    it('should return default icon for non-existent category', () => {
      const result = getCategoryIcon('non-existent');
      expect(result).toBe('person');
    });
  });

  describe('getCategoryColor', () => {
    it('should return color for existing category', () => {
      const result = getCategoryColor('family');
      expect(result).toBe('#4CAF50');
    });

    it('should return default color for non-existent category', () => {
      const result = getCategoryColor('non-existent');
      expect(result).toBe('#607D8B');
    });
  });
});
