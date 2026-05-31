import { createEntityAdapter,type EntityAdapter, type EntityState } from '@ngrx/entity';

import { type BirthdayCategory } from '../../../shared';

export interface CategoryState extends EntityState<BirthdayCategory> {
  customCategoryIds: string[];
  deletedCategoryIds: string[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

export const categoryAdapter: EntityAdapter<BirthdayCategory> =
  createEntityAdapter<BirthdayCategory>({
    selectId: (category) => category.id,
  });

export const initialCategoryState: CategoryState = categoryAdapter.getInitialState({
  customCategoryIds: [],
  deletedCategoryIds: [],
  loaded: false,
  loading: false,
  error: null,
});
