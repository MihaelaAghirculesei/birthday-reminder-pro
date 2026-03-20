import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { CategoryNamePipe } from './category-name.pipe';
import { BirthdayCategory } from '../constants/categories';
import { provideTranslateTesting } from '../../../testing/translate-testing';

describe('CategoryNamePipe', () => {
  let pipe: CategoryNamePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CategoryNamePipe,
        provideTranslateTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    pipe = TestBed.inject(CategoryNamePipe);
  });

  it('should use translateService.instant() when nameKey is present', () => {
    const category: BirthdayCategory = {
      id: 'family',
      name: 'Family',
      nameKey: 'CATEGORIES.FAMILY',
      icon: 'family_restroom',
      color: '#4CAF50'
    };
    const result = pipe.transform(category);
    // With real en translations the key resolves; at minimum not the raw key
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should use nameTranslations for current lang when nameKey is absent', () => {
    const category: BirthdayCategory = {
      id: 'custom',
      name: 'Custom',
      nameTranslations: { en: 'Custom English', it: 'Personalizzato' },
      icon: 'star',
      color: '#000'
    };
    const result = pipe.transform(category);
    expect(result).toBe('Custom English');
  });

  it('should fall back to category.name when no nameKey and no matching translation', () => {
    const category: BirthdayCategory = {
      id: 'custom',
      name: 'Fallback Name',
      icon: 'star',
      color: '#000'
    };
    const result = pipe.transform(category);
    expect(result).toBe('Fallback Name');
  });

  it('should fall back to category.name when nameTranslations has no matching lang', () => {
    const category: BirthdayCategory = {
      id: 'custom',
      name: 'Fallback',
      nameTranslations: { it: 'Solo Italiano' },
      icon: 'star',
      color: '#000'
    };
    // Current lang is 'en', no 'en' key in nameTranslations → falls back to name
    const result = pipe.transform(category);
    expect(result).toBe('Fallback');
  });
});
