import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as CategoryActions from './category.actions';
import { BIRTHDAY_CATEGORIES, BirthdayCategory } from '../../../shared';
import { CategoryStorageService } from '../../services/category-storage.service';

@Injectable()
export class CategoryEffects {
  constructor(
    private actions$: Actions,
    private categoryStorage: CategoryStorageService
  ) {}

  loadCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.loadCategories),
      map(() => {
        try {
          const customCategories = this.categoryStorage.getCustomCategories();
          const modifiedCategories = this.categoryStorage.getModifiedCategories();
          const deletedIds = this.categoryStorage.getDeletedIds();

          const modifiedMap = new Map(
            modifiedCategories.map((cat: BirthdayCategory) => [cat.id, cat])
          );

          const defaultCategories = BIRTHDAY_CATEGORIES.map((cat) =>
            modifiedMap.get(cat.id) || cat
          );
          const processedCustomCategories = customCategories.map((cat: BirthdayCategory) =>
            modifiedMap.get(cat.id) || cat
          );

          const allCategories = [...defaultCategories, ...processedCustomCategories];

          const customIds = customCategories.map((cat: BirthdayCategory) => cat.id);

          return CategoryActions.loadCategoriesSuccess({
            categories: allCategories,
            customIds,
            deletedIds,
          });
        } catch (error) {
          return CategoryActions.loadCategoriesFailure({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }),
      catchError((error) =>
        of(
          CategoryActions.loadCategoriesFailure({
            error: error.message || 'Failed to load categories',
          })
        )
      )
    )
  );

  addCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.addCategory),
      switchMap(({ category }) => {
        try {
          this.categoryStorage.addCustomCategory(category);
          return of(CategoryActions.addCategorySuccess({ category }));
        } catch (error) {
          return of(CategoryActions.addCategoryFailure({
            error: error instanceof Error ? error.message : 'Failed to add category'
          }));
        }
      })
    )
  );

  updateCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.updateCategory),
      switchMap(({ category }) => {
        try {
          this.categoryStorage.updateCategory(category);
          return of(CategoryActions.updateCategorySuccess({ category }));
        } catch (error) {
          return of(CategoryActions.updateCategoryFailure({
            error: error instanceof Error ? error.message : 'Failed to update category'
          }));
        }
      })
    )
  );

  deleteCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.deleteCategory),
      switchMap(({ categoryId }) => {
        try {
          this.categoryStorage.deleteCategory(categoryId);
          return of(CategoryActions.deleteCategorySuccess({ categoryId }));
        } catch (error) {
          return of(CategoryActions.deleteCategoryFailure({
            error: error instanceof Error ? error.message : 'Failed to delete category'
          }));
        }
      })
    )
  );

  restoreCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.restoreCategory),
      switchMap(({ categoryId }) => {
        try {
          this.categoryStorage.restoreCategory(categoryId);
          return of(CategoryActions.restoreCategorySuccess({ categoryId }));
        } catch (error) {
          return of(CategoryActions.restoreCategoryFailure({
            error: error instanceof Error ? error.message : 'Failed to restore category'
          }));
        }
      })
    )
  );
}
