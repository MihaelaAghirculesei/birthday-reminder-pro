import { type BirthdayCategory } from '../../../shared';
import * as CategoryActions from './category.actions';
import { categoryReducer } from './category.reducer';
import { initialCategoryState } from './category.state';

describe('Category Reducer', () => {
  const mockCategory: BirthdayCategory = {
    id: 'custom-1',
    name: 'Work',
    icon: 'work',
    color: '#FF5722'
  };

  it('should return initial state', () => {
    const action = { type: 'Unknown' };
    const state = categoryReducer(undefined, action);

    expect(state).toBe(initialCategoryState);
  });

  describe('Load Actions', () => {
    it('should set loading on loadCategories', () => {
      const action = CategoryActions.loadCategories();
      const state = categoryReducer(initialCategoryState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should load categories on success', () => {
      const categories = [mockCategory];
      const customIds = ['custom-1'];
      const deletedIds: string[] = [];

      const action = CategoryActions.loadCategoriesSuccess({ categories, customIds, deletedIds });
      const state = categoryReducer(initialCategoryState, action);

      expect(state.entities['custom-1']).toEqual(mockCategory);
      expect(state.customCategoryIds).toEqual(['custom-1']);
      expect(state.loaded).toBe(true);
      expect(state.loading).toBe(false);
    });

    it('should set error on loadCategoriesFailure', () => {
      const error = 'Load error';
      const action = CategoryActions.loadCategoriesFailure({ error });
      const state = categoryReducer(initialCategoryState, action);

      expect(state.error).toBe(error);
      expect(state.loading).toBe(false);
    });
  });

  describe('Add Category', () => {
    it('should add category on success', () => {
      const action = CategoryActions.addCategorySuccess({ category: mockCategory });
      const state = categoryReducer(initialCategoryState, action);

      expect(state.entities['custom-1']).toEqual(mockCategory);
      expect(state.customCategoryIds).toContain('custom-1');
      expect(state.error).toBeNull();
    });

    it('should set error on addCategoryFailure and preserve existing entities', () => {
      const withCategory = categoryReducer(
        initialCategoryState,
        CategoryActions.addCategorySuccess({ category: mockCategory })
      );
      const state = categoryReducer(withCategory, CategoryActions.addCategoryFailure({ error: 'Add failed' }));

      expect(state.error).toBe('Add failed');
      expect(state.entities['custom-1']).toEqual(mockCategory);
    });
  });

  describe('Update Category', () => {
    it('should update category on success', () => {
      const initialState = categoryReducer(
        initialCategoryState,
        CategoryActions.addCategorySuccess({ category: mockCategory })
      );

      const updated = { ...mockCategory, name: 'Updated Work' };
      const action = CategoryActions.updateCategorySuccess({ category: updated });
      const state = categoryReducer(initialState, action);

      expect(state.entities['custom-1']?.name).toBe('Updated Work');
      expect(state.error).toBeNull();
    });

    it('should set error on updateCategoryFailure and leave entities unchanged', () => {
      const withCategory = categoryReducer(
        initialCategoryState,
        CategoryActions.addCategorySuccess({ category: mockCategory })
      );
      const state = categoryReducer(withCategory, CategoryActions.updateCategoryFailure({ error: 'Update failed' }));

      expect(state.error).toBe('Update failed');
      expect(state.entities['custom-1']).toEqual(mockCategory);
    });
  });

  describe('Delete Category', () => {
    it('should mark category as deleted', () => {
      const initialState = categoryReducer(
        initialCategoryState,
        CategoryActions.addCategorySuccess({ category: mockCategory })
      );

      const action = CategoryActions.deleteCategorySuccess({ categoryId: 'custom-1' });
      const state = categoryReducer(initialState, action);

      expect(state.deletedCategoryIds).toContain('custom-1');
      expect(state.error).toBeNull();
    });

    it('should set error on deleteCategoryFailure and leave deletedCategoryIds unchanged', () => {
      const state = categoryReducer(
        initialCategoryState,
        CategoryActions.deleteCategoryFailure({ error: 'Delete failed' })
      );

      expect(state.error).toBe('Delete failed');
      expect(state.deletedCategoryIds).toEqual([]);
    });
  });

  describe('Restore Category', () => {
    it('should restore deleted category', () => {
      let state = categoryReducer(
        initialCategoryState,
        CategoryActions.addCategorySuccess({ category: mockCategory })
      );
      state = categoryReducer(state, CategoryActions.deleteCategorySuccess({ categoryId: 'custom-1' }));

      const action = CategoryActions.restoreCategorySuccess({ categoryId: 'custom-1' });
      const newState = categoryReducer(state, action);

      expect(newState.deletedCategoryIds).not.toContain('custom-1');
      expect(newState.error).toBeNull();
    });

    it('should set error on restoreCategoryFailure and leave deletedCategoryIds unchanged', () => {
      let state = categoryReducer(
        initialCategoryState,
        CategoryActions.addCategorySuccess({ category: mockCategory })
      );
      state = categoryReducer(state, CategoryActions.deleteCategorySuccess({ categoryId: 'custom-1' }));

      const newState = categoryReducer(state, CategoryActions.restoreCategoryFailure({ error: 'Restore failed' }));

      expect(newState.error).toBe('Restore failed');
      expect(newState.deletedCategoryIds).toContain('custom-1');
    });
  });
});
