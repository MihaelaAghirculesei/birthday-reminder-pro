import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { Action } from '@ngrx/store';
import { CategoryEffects } from './category.effects';
import * as CategoryActions from './category.actions';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { CategoryStorageService } from '../../services/category-storage.service';
import { BirthdayCategory } from '../../../shared';
import { BIRTHDAY_CATEGORIES } from '../../../shared/constants/categories';

describe('CategoryEffects', () => {
  let actions$: Observable<Action>;
  let effects: CategoryEffects;
  let categoryStorageMock: jasmine.SpyObj<CategoryStorageService>;

  const mockCategory: BirthdayCategory = {
    id: 'custom1',
    name: 'Custom Category',
    icon: '🎉',
    color: '#FF5733'
  };

  beforeEach(() => {
    categoryStorageMock = jasmine.createSpyObj('CategoryStorageService', [
      'getCustomCategories',
      'getModifiedCategories',
      'getDeletedIds',
      'addCustomCategory',
      'updateCategory',
      'deleteCategory',
      'restoreCategory'
    ]);

    categoryStorageMock.getCustomCategories.and.returnValue([]);
    categoryStorageMock.getModifiedCategories.and.returnValue([]);
    categoryStorageMock.getDeletedIds.and.returnValue([]);

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
    it('should load default categories successfully', (done) => {
      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        expect(payload.categories.length).toBeGreaterThan(0);
        expect(payload.customIds).toEqual([]);
        expect(payload.deletedIds).toEqual([]);
        done();
      });
    });

    it('should load custom categories', (done) => {
      const customCategories = [mockCategory];
      categoryStorageMock.getCustomCategories.and.returnValue(customCategories);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        expect(payload.categories).toContain(mockCategory);
        expect(payload.customIds).toEqual(['custom1']);
        done();
      });
    });

    it('should apply modifications to default categories', (done) => {
      const modifiedCategory = { ...BIRTHDAY_CATEGORIES[0], name: 'Modified Name' };
      categoryStorageMock.getModifiedCategories.and.returnValue([modifiedCategory]);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const modified = payload.categories.find(c => c.id === modifiedCategory.id);
        expect(modified?.name).toBe('Modified Name');
        done();
      });
    });

    it('should apply modifications to custom categories', (done) => {
      const customCat = { ...mockCategory };
      const modifiedCustomCat = { ...mockCategory, name: 'Modified Custom' };

      categoryStorageMock.getCustomCategories.and.returnValue([customCat]);
      categoryStorageMock.getModifiedCategories.and.returnValue([modifiedCustomCat]);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const modified = payload.categories.find(c => c.id === 'custom1');
        expect(modified?.name).toBe('Modified Custom');
        done();
      });
    });

    it('should load deleted ids', (done) => {
      const deletedIds = ['family', 'friends'];
      categoryStorageMock.getDeletedIds.and.returnValue(deletedIds);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesSuccess.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        expect(payload.deletedIds).toEqual(deletedIds);
        done();
      });
    });

    it('should handle load categories failure', (done) => {
      categoryStorageMock.getCustomCategories.and.throwError('Storage error');

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.loadCategoriesFailure.type);
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesFailure>;
        expect(payload.error).toBeDefined();
        done();
      });
    });
  });

  describe('addCategory$', () => {
    it('should add custom category successfully', (done) => {
      actions$ = of(CategoryActions.addCategory({ category: mockCategory }));

      effects.addCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.addCategorySuccess({ category: mockCategory }));
        expect(categoryStorageMock.addCustomCategory).toHaveBeenCalledWith(mockCategory);
        done();
      });
    });

    it('should handle add category failure', (done) => {
      categoryStorageMock.addCustomCategory.and.throwError('Storage error');
      actions$ = of(CategoryActions.addCategory({ category: mockCategory }));

      effects.addCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.addCategoryFailure.type);
        done();
      });
    });
  });

  describe('updateCategory$', () => {
    it('should update category successfully', (done) => {
      const updatedCategory = { ...mockCategory, name: 'Updated Name' };
      actions$ = of(CategoryActions.updateCategory({ category: updatedCategory }));

      effects.updateCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.updateCategorySuccess({ category: updatedCategory }));
        expect(categoryStorageMock.updateCategory).toHaveBeenCalledWith(updatedCategory);
        done();
      });
    });

    it('should handle update category failure', (done) => {
      categoryStorageMock.updateCategory.and.throwError('Storage error');
      actions$ = of(CategoryActions.updateCategory({ category: mockCategory }));

      effects.updateCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.updateCategoryFailure.type);
        done();
      });
    });
  });

  describe('deleteCategory$', () => {
    it('should delete category successfully', (done) => {
      actions$ = of(CategoryActions.deleteCategory({ categoryId: 'custom1' }));

      effects.deleteCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.deleteCategorySuccess({ categoryId: 'custom1' }));
        expect(categoryStorageMock.deleteCategory).toHaveBeenCalledWith('custom1');
        done();
      });
    });

    it('should handle delete category failure', (done) => {
      categoryStorageMock.deleteCategory.and.throwError('Storage error');
      actions$ = of(CategoryActions.deleteCategory({ categoryId: 'custom1' }));

      effects.deleteCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.deleteCategoryFailure.type);
        done();
      });
    });
  });

  describe('restoreCategory$', () => {
    it('should restore category successfully', (done) => {
      actions$ = of(CategoryActions.restoreCategory({ categoryId: 'family' }));

      effects.restoreCategory$.subscribe(action => {
        expect(action).toEqual(CategoryActions.restoreCategorySuccess({ categoryId: 'family' }));
        expect(categoryStorageMock.restoreCategory).toHaveBeenCalledWith('family');
        done();
      });
    });

    it('should handle restore category failure', (done) => {
      categoryStorageMock.restoreCategory.and.throwError('Storage error');
      actions$ = of(CategoryActions.restoreCategory({ categoryId: 'family' }));

      effects.restoreCategory$.subscribe(action => {
        expect(action.type).toBe(CategoryActions.restoreCategoryFailure.type);
        done();
      });
    });
  });

  describe('Integration tests', () => {
    it('should combine custom and default categories correctly', (done) => {
      const customCategories = [mockCategory];
      categoryStorageMock.getCustomCategories.and.returnValue(customCategories);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const hasDefaults = payload.categories.some(c => BIRTHDAY_CATEGORIES.find(bc => bc.id === c.id));
        const hasCustom = payload.categories.some(c => c.id === 'custom1');

        expect(hasDefaults).toBeTrue();
        expect(hasCustom).toBeTrue();
        done();
      });
    });

    it('should preserve category order (defaults first, then custom)', (done) => {
      const customCategories = [mockCategory];
      categoryStorageMock.getCustomCategories.and.returnValue(customCategories);

      actions$ = of(CategoryActions.loadCategories());

      effects.loadCategories$.subscribe(action => {
        const payload = action as ReturnType<typeof CategoryActions.loadCategoriesSuccess>;
        const defaultCount = BIRTHDAY_CATEGORIES.length;
        const customIndex = payload.categories.findIndex(c => c.id === 'custom1');

        expect(customIndex).toBeGreaterThanOrEqual(defaultCount);
        done();
      });
    });
  });
});
