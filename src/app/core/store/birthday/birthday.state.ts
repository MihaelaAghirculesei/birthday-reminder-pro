import { EntityState } from '@ngrx/entity';
import { Birthday } from '../../../shared/models/birthday.model';

export interface BirthdayState extends EntityState<Birthday> {
  selectedId: string | null;
  filters: BirthdayFilters;
  loading: boolean;
  error: string | null;
  optimisticBackup: Record<string, Birthday>;
}

export interface BirthdayFilters {
  searchTerm: string;
  selectedMonth: number | null;
  selectedCategory: string | null;
  sortOrder: 'name' | 'age' | 'nextBirthday';
}

export const initialBirthdayFilters: BirthdayFilters = {
  searchTerm: '',
  selectedMonth: null,
  selectedCategory: null,
  sortOrder: 'name'
};
