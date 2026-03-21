import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { CategoryFacadeService } from './category-facade.service';
import { BirthdayCategory } from '../../shared';
import * as CategoryActions from '../store/category/category.actions';
import * as CategorySelectors from '../store/category/category.selectors';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('CategoryFacadeService', () => {
  let service: CategoryFacadeService;
  let storeSpy: jasmine.SpyObj<Store>;

  const mockCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' },
    { id: 'custom1', name: 'Custom', icon: 'star', color: '#FFC107' }
  ];

  const mockDefaultCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' }
  ];

  const mockCustomCategories: BirthdayCategory[] = [
    { id: 'custom1', name: 'Custom', icon: 'star', color: '#FFC107' }
  ];

  beforeEach(() => {
    const storeSpyObj = jasmine.createSpyObj('Store', ['dispatch', 'select']);

    storeSpyObj.select.and.callFake((selector: unknown) => {
      if (selector === CategorySelectors.selectAllCategories) {
        return of(mockCategories);
      }
      if (selector === CategorySelectors.selectDefaultCategories) {
        return of(mockDefaultCategories);
      }
      if (selector === CategorySelectors.selectCustomCategories) {
        return of(mockCustomCategories);
      }
      if (selector === CategorySelectors.selectCategoriesLoaded) {
        return of(true);
      }
      if (selector === CategorySelectors.selectCategoriesLoading) {
        return of(false);
      }
      if (selector === CategorySelectors.selectCategoriesError) {
        return of(null);
      }
      return of(undefined);
    });

    TestBed.configureTestingModule({
      providers: [
        CategoryFacadeService,
        { provide: Store, useValue: storeSpyObj },
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(CategoryFacadeService);
    storeSpy = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  describe('Signals', () => {
    it('should have categories signal with initial value', () => {
      expect(service.categories()).toEqual(mockCategories);
    });

    it('should have defaultCategories signal with initial value', () => {
      expect(service.defaultCategories()).toEqual(mockDefaultCategories);
    });

    it('should have customCategories signal with initial value', () => {
      expect(service.customCategories()).toEqual(mockCustomCategories);
    });

    it('should have loaded signal with initial value', () => {
      expect(service.loaded()).toBe(true);
    });

    it('should have loading signal with initial value', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have error signal with initial value', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('Actions', () => {
    it('should dispatch loadCategories action', () => {
      service.loadCategories();
      expect(storeSpy.dispatch).toHaveBeenCalledWith(CategoryActions.loadCategories());
    });

    it('should dispatch addCategory action', () => {
      const category: BirthdayCategory = { id: 'test', name: 'Test', icon: 'test', color: '#000' };
      service.addCategory(category);
      expect(storeSpy.dispatch).toHaveBeenCalledWith(CategoryActions.addCategory({ category }));
    });

    it('should dispatch updateCategory action', () => {
      const category: BirthdayCategory = { id: 'test', name: 'Updated', icon: 'test', color: '#000' };
      service.updateCategory(category);
      expect(storeSpy.dispatch).toHaveBeenCalledWith(CategoryActions.updateCategory({ category }));
    });

    it('should dispatch deleteCategory action', () => {
      service.deleteCategory('test-id');
      expect(storeSpy.dispatch).toHaveBeenCalledWith(CategoryActions.deleteCategory({ categoryId: 'test-id' }));
    });

    it('should dispatch restoreCategory action', () => {
      service.restoreCategory('test-id');
      expect(storeSpy.dispatch).toHaveBeenCalledWith(CategoryActions.restoreCategory({ categoryId: 'test-id' }));
    });
  });

  describe('resolvedCategories', () => {
    it('should return categories as-is when no nameTranslations present', () => {
      const resolved = service.resolvedCategories();
      expect(resolved.length).toBe(mockCategories.length);
      // Categories without nameTranslations are returned unchanged
      expect(resolved[0].name).toBe('Friends');
    });

    it('should resolve name from nameTranslations when available for current lang', () => {
      const categoriesWithTranslations: BirthdayCategory[] = [
        { id: 'custom1', name: 'Custom EN', nameTranslations: { en: 'Custom English', it: 'Personalizzato' }, icon: 'star', color: '#FFC107' },
        { id: 'custom2', name: 'No Translations', icon: 'star', color: '#FF0000' }
      ];

      storeSpy.select.and.callFake((selector: unknown) => {
        if (selector === CategorySelectors.selectAllCategories) return of(categoriesWithTranslations);
        if (selector === CategorySelectors.selectCategoriesLoaded) return of(true);
        if (selector === CategorySelectors.selectCategoriesLoading) return of(false);
        if (selector === CategorySelectors.selectCategoriesError) return of(null);
        if (selector === CategorySelectors.selectDefaultCategories) return of([]);
        if (selector === CategorySelectors.selectCustomCategories) return of([]);
        return of(undefined);
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryFacadeService,
          { provide: Store, useValue: storeSpy },
          provideTranslateTesting()
        ]
      });
      const svc = TestBed.inject(CategoryFacadeService);

      const resolved = svc.resolvedCategories();
      // custom1 has 'en' translation → should be resolved
      expect(resolved[0].name).toBe('Custom English');
      // custom2 has no nameTranslations → returns original
      expect(resolved[1].name).toBe('No Translations');
    });
  });

  describe('getCategoryById', () => {
    it('should return category by id', (done) => {
      const mockCategory = mockCategories[0];
      storeSpy.select.and.returnValue(of(mockCategory));

      service.getCategoryById('friends').subscribe(category => {
        expect(category).toEqual(mockCategory);
        expect(storeSpy.select).toHaveBeenCalled();
        done();
      });
    });

    it('should return undefined for non-existent category', (done) => {
      storeSpy.select.and.returnValue(of(undefined));

      service.getCategoryById('non-existent').subscribe(category => {
        expect(category).toBeUndefined();
        done();
      });
    });
  });
});
