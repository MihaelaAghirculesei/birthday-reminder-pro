import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { type Action } from '@ngrx/store';
import { type Observable, of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { type BirthdayCategory } from '../../../shared';
import { BIRTHDAY_CATEGORIES } from '../../../shared/constants/categories';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { CategoryStorageService } from '../../services/category-storage.service';
import * as CategoryActions from './category.actions';
import { CategoryEffects } from './category.effects';

describe('CategoryEffects', () => {
  let actions$: Observable<Action>;
  let effects: CategoryEffects;
  let categoryStorageMock: MockedObject<CategoryStorageService>;

  const mockCategory: BirthdayCategory = {
    id: 'custom1',
    name: 'Custom Category',
    icon: '🎉',
    color: '#FF5733'
  };

  beforeEach(() => {
    categoryStorageMock = {
      getCustomCategories: vi.fn().mockName('CategoryStorageService.getCustomCategories'),
      getModifiedCategories: vi.fn().mockName('CategoryStorageService.getModifiedCategories'),
      getDeletedIds: vi.fn().mockName('CategoryStorageService.getDeletedIds'),
      addCustomCategory: vi.fn().mockName('CategoryStorageService.addCustomCategory'),
      updateCategory: vi.fn().mockName('CategoryStorageService.updateCategory'),
      deleteCategory: vi.fn().mockName('CategoryStorageService.deleteCategory'),
      restoreCategory: vi.fn().mockName('CategoryStorageService.restoreCategory')
    } as unknown as MockedObject<CategoryStorageService>;

    categoryStorageMock.getCustomCategories.mockReturnValue([]);
    categoryStorageMock.getModifiedCategories.mockReturnValue([]);
    categoryStorageMock.getDeletedIds.mockReturnValue([]);

    TestBed.configureTestingModule({
      providers: [
        CategoryEffects,
        provideMockActions(() => actions$),
        { provide: CategoryStorageService, useValue: categoryStorageMock },
        provideTranslateTesting()
      ]
    });

    effects = TestBed.inject(CategoryEffects);
  });

  describe('loadCategories$', () => {
    it('should load default categories successfully', async () => {
      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        expect(payload.categories.length).toBeGreaterThan(0);
        expect(payload.customIds).toEqual([]);
        expect(payload.deletedIds).toEqual([]);
      });
    });

    it('should load custom categories', async () => {
      const customCategories = [mockCategory];
      categoryStorageMock.getCustomCategories.mockReturnValue(customCategories);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        expect(payload.categories).toContain(mockCategory);
        expect(payload.customIds).toEqual(['custom1']);
      });
    });

    it('should apply modifications to default categories', async () => {
      const modifiedCategory = { ...BIRTHDAY_CATEGORIES[0], name: 'Modified Name' };
      categoryStorageMock.getModifiedCategories.mockReturnValue([modifiedCategory]);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const modified = payload.categories.find(c => c.id === modifiedCategory.id);
        expect(modified?.name).toBe('Modified Name');
      });
    });

    it('should apply modifications to custom categories', async () => {
      const customCat = { ...mockCategory };
      const modifiedCustomCat = { ...mockCategory, name: 'Modified Custom' };

      categoryStorageMock.getCustomCategories.mockReturnValue([customCat]);
      categoryStorageMock.getModifiedCategories.mockReturnValue([modifiedCustomCat]);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const modified = payload.categories.find(c => c.id === 'custom1');
        expect(modified?.name).toBe('Modified Custom');
      });
    });

    it('should load deleted ids', async () => {
      const deletedIds = ['family', 'friends'];
      categoryStorageMock.getDeletedIds.mockReturnValue(deletedIds);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        expect(payload.deletedIds).toEqual(deletedIds);
      });
    });

    it('should handle load categories failure', async () => {
      categoryStorageMock.getCustomCategories.mockImplementation(() => {
        throw new Error('Storage error');
      });

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesFailure>;
        expect(payload.error).toBe('Storage error');
      });
    });

    it('should use fallback message when load throws a non-Error value', async () => {
      categoryStorageMock.getCustomCategories.mockImplementation(() => { throw 'unexpected'; });

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesFailure>;
        expect(payload.error).toBe('Failed to load categories');
      });
    });
  });

  describe('addCategory$', () => {
    it('should add custom category successfully', async () => {
      actions$ = of(CategoryActions.addCategory({ category: mockCategory }));

      effects.addCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.addCategorySuccess({ category: mockCategory }));
        expect(categoryStorageMock.addCustomCategory).toHaveBeenCalledWith(mockCategory);
      });
    });

    it('should handle add category failure', async () => {
      categoryStorageMock.addCustomCategory.mockImplementation(() => {
        throw new Error('Storage error');
      });
      actions$ = of(CategoryActions.addCategory({ category: mockCategory }));

      effects.addCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.addCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.addCategoryFailure>;
        expect(payload.error).toBe('Storage error');
      });
    });

    it('should use fallback message when add throws a non-Error value', async () => {
      categoryStorageMock.addCustomCategory.mockImplementation(() => { throw 'unexpected'; });
      actions$ = of(CategoryActions.addCategory({ category: mockCategory }));

      effects.addCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.addCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.addCategoryFailure>;
        expect(payload.error).toBe('Failed to add category');
      });
    });
  });

  describe('updateCategory$', () => {
    it('should update category successfully', async () => {
      const updatedCategory = { ...mockCategory, name: 'Updated Name' };
      actions$ = of(CategoryActions.updateCategory({ category: updatedCategory }));

      effects.updateCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.updateCategorySuccess({ category: updatedCategory }));
        expect(categoryStorageMock.updateCategory).toHaveBeenCalledWith(updatedCategory);
      });
    });

    it('should handle update category failure', async () => {
      categoryStorageMock.updateCategory.mockImplementation(() => {
        throw new Error('Storage error');
      });
      actions$ = of(CategoryActions.updateCategory({ category: mockCategory }));

      effects.updateCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.updateCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.updateCategoryFailure>;
        expect(payload.error).toBe('Storage error');
      });
    });

    it('should use fallback message when update throws a non-Error value', async () => {
      categoryStorageMock.updateCategory.mockImplementation(() => { throw 'unexpected'; });
      actions$ = of(CategoryActions.updateCategory({ category: mockCategory }));

      effects.updateCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.updateCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.updateCategoryFailure>;
        expect(payload.error).toBe('Failed to update category');
      });
    });
  });

  describe('deleteCategory$', () => {
    it('should delete category successfully', async () => {
      actions$ = of(CategoryActions.deleteCategory({ categoryId: 'custom1' }));

      effects.deleteCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.deleteCategorySuccess({ categoryId: 'custom1' }));
        expect(categoryStorageMock.deleteCategory).toHaveBeenCalledWith('custom1');
      });
    });

    it('should handle delete category failure', async () => {
      categoryStorageMock.deleteCategory.mockImplementation(() => {
        throw new Error('Storage error');
      });
      actions$ = of(CategoryActions.deleteCategory({ categoryId: 'custom1' }));

      effects.deleteCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.deleteCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.deleteCategoryFailure>;
        expect(payload.error).toBe('Storage error');
      });
    });

    it('should use fallback message when delete throws a non-Error value', async () => {
      categoryStorageMock.deleteCategory.mockImplementation(() => { throw 'unexpected'; });
      actions$ = of(CategoryActions.deleteCategory({ categoryId: 'custom1' }));

      effects.deleteCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.deleteCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.deleteCategoryFailure>;
        expect(payload.error).toBe('Failed to delete category');
      });
    });
  });

  describe('restoreCategory$', () => {
    it('should restore category successfully', async () => {
      actions$ = of(CategoryActions.restoreCategory({ categoryId: 'family' }));

      effects.restoreCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.restoreCategorySuccess({ categoryId: 'family' }));
        expect(categoryStorageMock.restoreCategory).toHaveBeenCalledWith('family');
      });
    });

    it('should handle restore category failure', async () => {
      categoryStorageMock.restoreCategory.mockImplementation(() => {
        throw new Error('Storage error');
      });
      actions$ = of(CategoryActions.restoreCategory({ categoryId: 'family' }));

      effects.restoreCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.restoreCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.restoreCategoryFailure>;
        expect(payload.error).toBe('Storage error');
      });
    });

    it('should use fallback message when restore throws a non-Error value', async () => {
      categoryStorageMock.restoreCategory.mockImplementation(() => { throw 'unexpected'; });
      actions$ = of(CategoryActions.restoreCategory({ categoryId: 'family' }));

      effects.restoreCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.restoreCategoryFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.restoreCategoryFailure>;
        expect(payload.error).toBe('Failed to restore category');
      });
    });
  });

  describe('Integration tests', () => {
    it('should combine custom and default categories correctly', async () => {
      const customCategories = [mockCategory];
      categoryStorageMock.getCustomCategories.mockReturnValue(customCategories);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const hasDefaults = payload.categories.some(c => BIRTHDAY_CATEGORIES.find(bc => bc.id === c.id));
        const hasCustom = payload.categories.some(c => c.id === 'custom1');

        expect(hasDefaults).toBe(true);
        expect(hasCustom).toBe(true);
      });
    });

    it('should preserve category order (defaults first, then custom)', async () => {
      const customCategories = [mockCategory];
      categoryStorageMock.getCustomCategories.mockReturnValue(customCategories);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const defaultCount = BIRTHDAY_CATEGORIES.length;
        const customIndex = payload.categories.findIndex(c => c.id === 'custom1');

        expect(customIndex).toBeGreaterThanOrEqual(defaultCount);
      });
    });
  });
});
