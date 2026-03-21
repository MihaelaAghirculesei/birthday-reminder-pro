import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { PLATFORM_ID } from '@angular/core';

import { CategoryFacadeService } from '../../core/services/category-facade.service';
import { CategoryStorageService } from '../../core/services/category-storage.service';
import { categoryReducer } from '../../core/store/category/category.reducer';
import { CategoryEffects } from '../../core/store/category/category.effects';
import { BirthdayCategory, BIRTHDAY_CATEGORIES } from '../../shared';
import * as CategorySelectors from '../../core/store/category/category.selectors';
import { provideTranslateTesting } from '../translate-testing';

describe('Category Management Integration', () => {
  let facade: CategoryFacadeService;
  let store: Store;
  let mockStorage: jasmine.SpyObj<CategoryStorageService>;
  let customCategories: BirthdayCategory[] = [];
  let modifiedCategories: BirthdayCategory[] = [];
  let deletedIds: string[] = [];

  beforeEach(() => {
    customCategories = [];
    modifiedCategories = [];
    deletedIds = [];

    mockStorage = jasmine.createSpyObj('CategoryStorageService', [
      'getCustomCategories',
      'getModifiedCategories',
      'getDeletedIds',
      'addCustomCategory',
      'updateCategory',
      'deleteCategory',
      'restoreCategory'
    ]);

    mockStorage.getCustomCategories.and.callFake(() => [...customCategories]);
    mockStorage.getModifiedCategories.and.callFake(() => [...modifiedCategories]);
    mockStorage.getDeletedIds.and.callFake(() => [...deletedIds]);
    mockStorage.addCustomCategory.and.callFake((cat: BirthdayCategory) => {
      customCategories.push(cat);
    });
    mockStorage.updateCategory.and.callFake((cat: BirthdayCategory) => {
      const customIndex = customCategories.findIndex(c => c.id === cat.id);
      if (customIndex >= 0) {
        customCategories[customIndex] = cat;
      } else {
        const modIndex = modifiedCategories.findIndex(c => c.id === cat.id);
        if (modIndex >= 0) {
          modifiedCategories[modIndex] = cat;
        } else {
          modifiedCategories.push(cat);
        }
      }
    });
    mockStorage.deleteCategory.and.callFake((id: string) => {
      customCategories = customCategories.filter(c => c.id !== id);
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
      }
    });
    mockStorage.restoreCategory.and.callFake((id: string) => {
      deletedIds = deletedIds.filter(d => d !== id);
    });

    TestBed.configureTestingModule({
      providers: [
        provideStore({ categories: categoryReducer }),
        provideEffects([CategoryEffects]),
        CategoryFacadeService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CategoryStorageService, useValue: mockStorage },
        provideTranslateTesting()
      ]
    });

    store = TestBed.inject(Store);
    facade = TestBed.inject(CategoryFacadeService);
  });

  it('should load default categories on init', fakeAsync(() => {
    facade.loadCategories();
    tick(100);

    let categories: BirthdayCategory[] = [];
    store.select(CategorySelectors.selectAllCategories).subscribe(c => categories = c);
    tick(100);

    expect(categories.length).toBeGreaterThanOrEqual(BIRTHDAY_CATEGORIES.length);
    expect(categories.find(c => c.id === 'family')).toBeDefined();
    expect(categories.find(c => c.id === 'friends')).toBeDefined();
  }));

  it('should add custom category', fakeAsync(() => {
    facade.loadCategories();
    tick(100);

    const newCategory: BirthdayCategory = {
      id: 'gaming-crew',
      name: 'Gaming Crew',
      icon: 'sports_esports',
      color: '#9C27B0'
    };

    facade.addCategory(newCategory);
    tick(100);

    expect(customCategories.length).toBe(1);
    expect(customCategories[0].name).toBe('Gaming Crew');

    let categories: BirthdayCategory[] = [];
    store.select(CategorySelectors.selectAllCategories).subscribe(c => categories = c);
    tick(100);

    expect(categories.find(c => c.id === 'gaming-crew')).toBeDefined();
  }));

  it('should update existing category', fakeAsync(() => {
    facade.loadCategories();
    tick(100);

    const updatedFamily: BirthdayCategory = {
      id: 'family',
      name: 'Close Family',
      icon: 'home',
      color: '#E91E63'
    };

    facade.updateCategory(updatedFamily);
    tick(100);

    expect(modifiedCategories.find(c => c.id === 'family')).toBeDefined();
    expect(modifiedCategories.find(c => c.id === 'family')?.name).toBe('Close Family');
  }));

  it('should delete and restore category', fakeAsync(() => {
    facade.loadCategories();
    tick(100);

    const customCat: BirthdayCategory = {
      id: 'temp-cat',
      name: 'Temporary',
      icon: 'timer',
      color: '#607D8B'
    };

    facade.addCategory(customCat);
    tick(100);
    expect(customCategories.length).toBe(1);

    facade.deleteCategory('temp-cat');
    tick(100);
    expect(customCategories.length).toBe(0);
    expect(deletedIds).toContain('temp-cat');

    facade.restoreCategory('temp-cat');
    tick(100);
    expect(deletedIds).not.toContain('temp-cat');
  }));

  it('should track custom category IDs', fakeAsync(() => {
    facade.loadCategories();
    tick(100);

    facade.addCategory({ id: 'custom-1', name: 'Custom 1', icon: 'star', color: '#FFC107' });
    facade.addCategory({ id: 'custom-2', name: 'Custom 2', icon: 'star', color: '#FF5722' });
    tick(200);

    let customIds: string[] = [];
    store.select(CategorySelectors.selectCustomCategoryIds).subscribe(ids => customIds = ids);
    tick(100);

    expect(customIds).toContain('custom-1');
    expect(customIds).toContain('custom-2');
    expect(customIds).not.toContain('family');
  }));

  it('should preserve modifications after reload', fakeAsync(() => {
    const modified: BirthdayCategory = {
      id: 'friends',
      name: 'Best Friends',
      icon: 'favorite',
      color: '#E91E63'
    };
    modifiedCategories.push(modified);

    facade.loadCategories();
    tick(100);

    let categories: BirthdayCategory[] = [];
    store.select(CategorySelectors.selectAllCategories).subscribe(c => categories = c);
    tick(100);

    const friendsCat = categories.find(c => c.id === 'friends');
    expect(friendsCat?.name).toBe('Best Friends');
    expect(friendsCat?.icon).toBe('favorite');
  }));
});
