import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { type BirthdayCategory } from '../../shared';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { CategoryStorageService } from './category-storage.service';
import { SILENT_LOGGER_PROVIDER } from './logger.service';

describe('CategoryStorageService', () => {
  let service: CategoryStorageService;
  let localStorageMock: Record<string, string>;

  const mockCategory: BirthdayCategory = {
    id: 'custom1',
    name: 'Custom Category',
    icon: 'star',
    color: '#FFC107'
  };

  const mockCategory2: BirthdayCategory = {
    id: 'custom2',
    name: 'Another Custom',
    icon: 'favorite',
    color: '#E91E63'
  };

  beforeEach(() => {
    localStorageMock = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageMock[key] || null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete localStorageMock[key];
    });

    spyOn(localStorage, 'clear').and.callFake(() => {
      localStorageMock = {};
    });

    TestBed.configureTestingModule({
      providers: [
        CategoryStorageService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        SILENT_LOGGER_PROVIDER,
        provideTranslateTesting()
      ]
    });

    service = TestBed.inject(CategoryStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCustomCategories', () => {
    it('should return empty array when no data exists', () => {
      const categories = service.getCustomCategories();
      expect(categories).toEqual([]);
    });

    it('should return custom categories from localStorage', () => {
      localStorageMock['customCategories'] = JSON.stringify([mockCategory]);
      const categories = service.getCustomCategories();
      expect(categories).toEqual([mockCategory]);
    });

    it('should return empty array on JSON parse error', () => {
      localStorageMock['customCategories'] = 'invalid json';
      const categories = service.getCustomCategories();
      expect(categories).toEqual([]);
    });

    it('should return empty array when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      const categories = serverService.getCustomCategories();
      expect(categories).toEqual([]);
    });
  });

  describe('getModifiedCategories', () => {
    it('should return empty array when no data exists', () => {
      const categories = service.getModifiedCategories();
      expect(categories).toEqual([]);
    });

    it('should return modified categories from localStorage', () => {
      localStorageMock['modifiedCategories'] = JSON.stringify([mockCategory]);
      const categories = service.getModifiedCategories();
      expect(categories).toEqual([mockCategory]);
    });

    it('should return empty array on JSON parse error', () => {
      localStorageMock['modifiedCategories'] = 'invalid json';
      const categories = service.getModifiedCategories();
      expect(categories).toEqual([]);
    });

    it('should return empty array when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      const categories = serverService.getModifiedCategories();
      expect(categories).toEqual([]);
    });
  });

  describe('getDeletedIds', () => {
    it('should return empty array when no data exists', () => {
      const ids = service.getDeletedIds();
      expect(ids).toEqual([]);
    });

    it('should return deleted IDs from localStorage', () => {
      localStorageMock['deletedCategoryIds'] = JSON.stringify(['id1', 'id2']);
      const ids = service.getDeletedIds();
      expect(ids).toEqual(['id1', 'id2']);
    });

    it('should return empty array on JSON parse error', () => {
      localStorageMock['deletedCategoryIds'] = 'invalid json';
      const ids = service.getDeletedIds();
      expect(ids).toEqual([]);
    });

    it('should return empty array when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      const ids = serverService.getDeletedIds();
      expect(ids).toEqual([]);
    });
  });

  describe('addCustomCategory', () => {
    it('should add a custom category to localStorage', () => {
      service.addCustomCategory(mockCategory);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'customCategories',
        JSON.stringify([mockCategory])
      );
    });

    it('should append to existing custom categories', () => {
      localStorageMock['customCategories'] = JSON.stringify([mockCategory]);
      service.addCustomCategory(mockCategory2);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'customCategories',
        JSON.stringify([mockCategory, mockCategory2])
      );
    });

    it('should not crash when localStorage.setItem throws error', () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage error');
      expect(() => service.addCustomCategory(mockCategory)).not.toThrow();
    });

    it('should do nothing when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      serverService.addCustomCategory(mockCategory);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should add category to modified categories if not exists', () => {
      service.updateCategory(mockCategory);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'modifiedCategories',
        JSON.stringify([mockCategory])
      );
    });

    it('should update existing category in modified categories', () => {
      localStorageMock['modifiedCategories'] = JSON.stringify([mockCategory]);
      const updated = { ...mockCategory, name: 'Updated Name' };
      service.updateCategory(updated);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'modifiedCategories',
        JSON.stringify([updated])
      );
    });

    it('should append if category does not exist in modified list', () => {
      localStorageMock['modifiedCategories'] = JSON.stringify([mockCategory]);
      service.updateCategory(mockCategory2);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'modifiedCategories',
        JSON.stringify([mockCategory, mockCategory2])
      );
    });

    it('should not crash when localStorage.setItem throws error', () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage error');
      expect(() => service.updateCategory(mockCategory)).not.toThrow();
    });

    it('should do nothing when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      serverService.updateCategory(mockCategory);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('should add category ID to deleted IDs', () => {
      service.deleteCategory('custom1');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'deletedCategoryIds',
        JSON.stringify(['custom1'])
      );
    });

    it('should append to existing deleted IDs', () => {
      localStorageMock['deletedCategoryIds'] = JSON.stringify(['id1']);
      service.deleteCategory('id2');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'deletedCategoryIds',
        JSON.stringify(['id1', 'id2'])
      );
    });

    it('should not add duplicate IDs', () => {
      localStorageMock['deletedCategoryIds'] = JSON.stringify(['id1']);
      service.deleteCategory('id1');

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should not crash when localStorage.setItem throws error', () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage error');
      expect(() => service.deleteCategory('custom1')).not.toThrow();
    });

    it('should do nothing when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      serverService.deleteCategory('custom1');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('restoreCategory', () => {
    it('should remove category ID from deleted IDs', () => {
      localStorageMock['deletedCategoryIds'] = JSON.stringify(['id1', 'id2', 'id3']);
      service.restoreCategory('id2');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'deletedCategoryIds',
        JSON.stringify(['id1', 'id3'])
      );
    });

    it('should handle empty deleted IDs list', () => {
      service.restoreCategory('id1');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'deletedCategoryIds',
        JSON.stringify([])
      );
    });

    it('should not crash when localStorage.setItem throws error', () => {
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage error');
      expect(() => service.restoreCategory('id1')).not.toThrow();
    });

    it('should do nothing when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      serverService.restoreCategory('id1');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should remove all category localStorage keys', () => {
      localStorageMock['customCategories'] = JSON.stringify([mockCategory]);
      localStorageMock['modifiedCategories'] = JSON.stringify([mockCategory2]);
      localStorageMock['deletedCategoryIds'] = JSON.stringify(['id1']);

      service.clearAll();

      expect(localStorage.removeItem).toHaveBeenCalledWith('customCategories');
      expect(localStorage.removeItem).toHaveBeenCalledWith('modifiedCategories');
      expect(localStorage.removeItem).toHaveBeenCalledWith('deletedCategoryIds');
      expect(service.getCustomCategories()).toEqual([]);
      expect(service.getModifiedCategories()).toEqual([]);
      expect(service.getDeletedIds()).toEqual([]);
    });

    it('should not crash when localStorage.removeItem throws error', () => {
      (localStorage.removeItem as jasmine.Spy).and.throwError('Storage error');
      expect(() => service.clearAll()).not.toThrow();
    });

    it('should do nothing when not in browser', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CategoryStorageService,
          { provide: PLATFORM_ID, useValue: 'server' },
          SILENT_LOGGER_PROVIDER
        ]
      });
      const serverService = TestBed.inject(CategoryStorageService);
      serverService.clearAll();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });
});
