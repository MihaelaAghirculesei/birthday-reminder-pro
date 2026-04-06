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
      switchMap(() =>
        of(null).pipe(
          map(() => {
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
          }),
          catchError((error) =>
            of(
              CategoryActions.loadCategoriesFailure({
                error: error instanceof Error ? error.message : 'Failed to load categories',
              })
            )
          )
        )
      )
    )
  );

  addCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.addCategory),
      switchMap(({ category }) =>
        of(null).pipe(
          map(() => {
            this.categoryStorage.addCustomCategory(category);
            return CategoryActions.addCategorySuccess({ category });
          }),
          catchError((error) =>
            of(CategoryActions.addCategoryFailure({
              error: error instanceof Error ? error.message : 'Failed to add category',
            }))
          )
        )
      )
    )
  );

  updateCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.updateCategory),
      switchMap(({ category }) =>
        of(null).pipe(
          map(() => {
            this.categoryStorage.updateCategory(category);
            return CategoryActions.updateCategorySuccess({ category });
          }),
          catchError((error) =>
            of(CategoryActions.updateCategoryFailure({
              error: error instanceof Error ? error.message : 'Failed to update category',
            }))
          )
        )
      )
    )
  );

  deleteCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.deleteCategory),
      switchMap(({ categoryId }) =>
        of(null).pipe(
          map(() => {
            this.categoryStorage.deleteCategory(categoryId);
            return CategoryActions.deleteCategorySuccess({ categoryId });
          }),
          catchError((error) =>
            of(CategoryActions.deleteCategoryFailure({
              error: error instanceof Error ? error.message : 'Failed to delete category',
            }))
          )
        )
      )
    )
  );

  restoreCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.restoreCategory),
      switchMap(({ categoryId }) =>
        of(null).pipe(
          map(() => {
            this.categoryStorage.restoreCategory(categoryId);
            return CategoryActions.restoreCategorySuccess({ categoryId });
          }),
          catchError((error) =>
            of(CategoryActions.restoreCategoryFailure({
              error: error instanceof Error ? error.message : 'Failed to restore category',
            }))
          )
        )
      )
    )
  );
}
