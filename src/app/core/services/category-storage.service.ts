import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BirthdayCategory } from '../../shared';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryStorageService {
  private readonly CUSTOM_CATEGORIES_KEY = 'customCategories';
  private readonly MODIFIED_CATEGORIES_KEY = 'modifiedCategories';
  private readonly DELETED_IDS_KEY = 'deletedCategoryIds';

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private logger: LoggerService
  ) {}

  getCustomCategories(): BirthdayCategory[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      const data = localStorage.getItem(this.CUSTOM_CATEGORIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      this.logger.error('Failed to load custom categories:', error);
      return [];
    }
  }

  getModifiedCategories(): BirthdayCategory[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      const data = localStorage.getItem(this.MODIFIED_CATEGORIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      this.logger.error('Failed to load modified categories:', error);
      return [];
    }
  }

  getDeletedIds(): string[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    try {
      const data = localStorage.getItem(this.DELETED_IDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      this.logger.error('Failed to load deleted category IDs:', error);
      return [];
    }
  }

  addCustomCategory(category: BirthdayCategory): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const categories = this.getCustomCategories();
      categories.push(category);
      localStorage.setItem(this.CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      this.logger.error('Failed to save custom category:', error);
    }
  }

  updateCategory(category: BirthdayCategory): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const categories = this.getModifiedCategories();
      const index = categories.findIndex(c => c.id === category.id);

      if (index !== -1) {
        categories[index] = category;
      } else {
        categories.push(category);
      }

      localStorage.setItem(this.MODIFIED_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      this.logger.error('Failed to update category:', error);
    }
  }

  deleteCategory(categoryId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const deletedIds = this.getDeletedIds();

      if (!deletedIds.includes(categoryId)) {
        deletedIds.push(categoryId);
        localStorage.setItem(this.DELETED_IDS_KEY, JSON.stringify(deletedIds));
      }
    } catch (error) {
      this.logger.error('Failed to delete category:', error);
    }
  }

  restoreCategory(categoryId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const deletedIds = this.getDeletedIds();
      const updatedIds = deletedIds.filter(id => id !== categoryId);
      localStorage.setItem(this.DELETED_IDS_KEY, JSON.stringify(updatedIds));
    } catch (error) {
      this.logger.error('Failed to restore category:', error);
    }
  }
}
