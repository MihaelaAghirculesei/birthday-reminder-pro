import * as fromSelectors from './category.selectors';
import { CategoryState } from './category.state';
import { BirthdayCategory } from '../../../shared';

describe('Category Selectors', () => {
  const mockCategories: BirthdayCategory[] = [
    { id: 'family', name: 'Family', icon: 'family', color: '#4CAF50' },
    { id: 'friends', name: 'Friends', icon: 'people', color: '#2196F3' },
    { id: 'custom-1', name: 'Work', icon: 'work', color: '#FF5722' }
  ];

  const mockState: CategoryState = {
    ids: ['family', 'friends', 'custom-1'],
    entities: {
      'family': mockCategories[0],
      'friends': mockCategories[1],
      'custom-1': mockCategories[2]
    },
    customCategoryIds: ['custom-1'],
    deletedCategoryIds: [],
    loaded: true,
    loading: false,
    error: null
  };

  const state = {
    categories: mockState
  };

  it('should select basic state', () => {
    expect(fromSelectors.selectAllCategories(state).length).toBe(3);
    expect(fromSelectors.selectCategoryEntities(state)['family']).toEqual(mockCategories[0]);
    expect(fromSelectors.selectDeletedCategoryIds(state)).toEqual([]);
    expect(fromSelectors.selectCustomCategoryIds(state)).toEqual(['custom-1']);
    expect(fromSelectors.selectCategoriesLoading(state)).toBe(false);
    expect(fromSelectors.selectCategoriesLoaded(state)).toBe(true);
    expect(fromSelectors.selectCategoriesError(state)).toBeNull();
  });

  it('should filter deleted categories', () => {
    const stateWithDeleted = { categories: { ...mockState, deletedCategoryIds: ['friends'] } };
    const result = fromSelectors.selectAllCategories(stateWithDeleted);
    expect(result.length).toBe(2);
  });

  it('should separate default and custom categories', () => {
    expect(fromSelectors.selectDefaultCategories(state).length).toBe(2);
    expect(fromSelectors.selectCustomCategories(state).length).toBe(1);
    expect(fromSelectors.selectCustomCategories(state)[0].id).toBe('custom-1');
  });

  it('should select category by id', () => {
    expect(fromSelectors.selectCategoryById('family')(state)).toEqual(mockCategories[0]);

    const stateWithDeleted = { categories: { ...mockState, deletedCategoryIds: ['family'] } };
    expect(fromSelectors.selectCategoryById('family')(stateWithDeleted)).toBeUndefined();
  });

  it('should keep existing nameKey when category already has one', () => {
    const categoriesWithNameKey: BirthdayCategory[] = [
      { id: 'custom-already-keyed', name: 'My Cat', nameKey: 'MY.KEY', icon: 'star', color: '#000' }
    ];
    const stateWithKey = {
      categories: {
        ...mockState,
        ids: ['custom-already-keyed'],
        entities: { 'custom-already-keyed': categoriesWithNameKey[0] },
        customCategoryIds: ['custom-already-keyed']
      }
    };
    const result = fromSelectors.selectAllCategories(stateWithKey);
    expect(result[0].nameKey).toBe('MY.KEY');
  });

  it('should assign built-in nameKey for known categories without one', () => {
    // 'family' exists in BIRTHDAY_CATEGORIES with nameKey 'CATEGORIES.FAMILY'
    const result = fromSelectors.selectAllCategories(state);
    const familyCat = result.find(c => c.id === 'family');
    expect(familyCat?.nameKey).toBe('CATEGORIES.FAMILY');
  });
});
