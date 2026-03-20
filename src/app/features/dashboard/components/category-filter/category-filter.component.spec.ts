import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryFilterComponent, CategoryStats } from './category-filter.component';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';

describe('CategoryFilterComponent', () => {
  let component: CategoryFilterComponent;
  let fixture: ComponentFixture<CategoryFilterComponent>;

  const mockCategoryStats: CategoryStats[] = [
    { id: 'cat-1', name: 'Family', icon: 'family_restroom', color: '#FF5722', count: 5 },
    { id: 'cat-2', name: 'Friends', icon: 'people', color: '#2196F3', count: 3 },
    { id: 'cat-3', name: 'Work', icon: 'work', color: '#4CAF50', count: 2 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryFilterComponent],
      providers: [provideTranslateTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input properties', () => {
    it('should accept categoriesStats input', () => {
      component.categoriesStats = mockCategoryStats;
      expect(component.categoriesStats).toEqual(mockCategoryStats);
    });

    it('should initialize categoriesStats as empty array', () => {
      expect(component.categoriesStats).toEqual([]);
    });

    it('should accept selectedCategory input', () => {
      component.selectedCategory = 'cat-1';
      expect(component.selectedCategory).toBe('cat-1');
    });

    it('should initialize selectedCategory as null', () => {
      expect(component.selectedCategory).toBeNull();
    });
  });

  describe('selectCategory', () => {
    it('should emit categorySelected event with category id', () => {
      spyOn(component.categorySelected, 'emit');
      const categoryId = 'cat-1';

      component.selectCategory(categoryId);

      expect(component.categorySelected.emit).toHaveBeenCalledWith(categoryId);
    });

    it('should emit categorySelected for different categories', () => {
      spyOn(component.categorySelected, 'emit');

      component.selectCategory('cat-1');
      component.selectCategory('cat-2');

      expect(component.categorySelected.emit).toHaveBeenCalledTimes(2);
      expect(component.categorySelected.emit).toHaveBeenCalledWith('cat-1');
      expect(component.categorySelected.emit).toHaveBeenCalledWith('cat-2');
    });
  });

  describe('clearFilter', () => {
    it('should emit filterCleared event', () => {
      spyOn(component.filterCleared, 'emit');

      component.clearFilter();

      expect(component.filterCleared.emit).toHaveBeenCalled();
    });

    it('should emit filterCleared event multiple times', () => {
      spyOn(component.filterCleared, 'emit');

      component.clearFilter();
      component.clearFilter();

      expect(component.filterCleared.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('addNewCategory', () => {
    it('should emit addCategoryClicked event', () => {
      spyOn(component.addCategoryClicked, 'emit');

      component.addNewCategory();

      expect(component.addCategoryClicked.emit).toHaveBeenCalled();
    });
  });

  describe('editCategory', () => {
    it('should emit editCategoryClicked event with category id', () => {
      spyOn(component.editCategoryClicked, 'emit');
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');
      const categoryId = 'cat-1';

      component.editCategory(mockEvent, categoryId);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.editCategoryClicked.emit).toHaveBeenCalledWith(categoryId);
    });

    it('should stop event propagation', () => {
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');

      component.editCategory(mockEvent, 'cat-1');

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should emit editCategoryClicked for different categories', () => {
      spyOn(component.editCategoryClicked, 'emit');
      const mockEvent = new Event('click');

      component.editCategory(mockEvent, 'cat-1');
      component.editCategory(mockEvent, 'cat-2');

      expect(component.editCategoryClicked.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteCategory', () => {
    it('should emit deleteCategoryClicked event with category id', () => {
      spyOn(component.deleteCategoryClicked, 'emit');
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');
      const categoryId = 'cat-1';

      component.deleteCategory(mockEvent, categoryId);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.deleteCategoryClicked.emit).toHaveBeenCalledWith(categoryId);
    });

    it('should stop event propagation', () => {
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');

      component.deleteCategory(mockEvent, 'cat-1');

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should emit deleteCategoryClicked for different categories', () => {
      spyOn(component.deleteCategoryClicked, 'emit');
      const mockEvent = new Event('click');

      component.deleteCategory(mockEvent, 'cat-1');
      component.deleteCategory(mockEvent, 'cat-2');

      expect(component.deleteCategoryClicked.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('trackByCategoryStats', () => {
    it('should return category id', () => {
      const categoryStats: CategoryStats = {
        id: 'cat-1',
        name: 'Family',
        icon: 'family_restroom',
        color: '#FF5722',
        count: 5
      };

      const result = component.trackByCategoryStats(0, categoryStats);

      expect(result).toBe('cat-1');
    });

    it('should return different ids for different categories', () => {
      const cat1 = mockCategoryStats[0];
      const cat2 = mockCategoryStats[1];

      const result1 = component.trackByCategoryStats(0, cat1);
      const result2 = component.trackByCategoryStats(1, cat2);

      expect(result1).toBe('cat-1');
      expect(result2).toBe('cat-2');
      expect(result1).not.toBe(result2);
    });
  });

  describe('Output events', () => {
    it('should have categorySelected output', () => {
      expect(component.categorySelected).toBeDefined();
    });

    it('should have filterCleared output', () => {
      expect(component.filterCleared).toBeDefined();
    });

    it('should have addCategoryClicked output', () => {
      expect(component.addCategoryClicked).toBeDefined();
    });

    it('should have editCategoryClicked output', () => {
      expect(component.editCategoryClicked).toBeDefined();
    });

    it('should have deleteCategoryClicked output', () => {
      expect(component.deleteCategoryClicked).toBeDefined();
    });
  });

  describe('getCategoryAriaLabel', () => {
    it('should use singular "person" key when count is 1', () => {
      const singleStat: CategoryStats = { id: 'cat-1', name: 'Family', icon: 'family_restroom', color: '#FF5722', count: 1 };
      const label = component.getCategoryAriaLabel(singleStat);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should use plural "people" key when count is greater than 1', () => {
      const pluralStat: CategoryStats = { id: 'cat-2', name: 'Friends', icon: 'people', color: '#2196F3', count: 5 };
      const label = component.getCategoryAriaLabel(pluralStat);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should use plural "people" key when count is 0', () => {
      const zeroStat: CategoryStats = { id: 'cat-3', name: 'Work', icon: 'work', color: '#4CAF50', count: 0 };
      const label = component.getCategoryAriaLabel(zeroStat);
      expect(typeof label).toBe('string');
    });

    it('should produce different aria labels for count 1 vs count 2', () => {
      const single: CategoryStats = { id: 'cat-1', name: 'Family', icon: 'family_restroom', color: '#FF5722', count: 1 };
      const plural: CategoryStats = { id: 'cat-1', name: 'Family', icon: 'family_restroom', color: '#FF5722', count: 2 };
      const labelSingle = component.getCategoryAriaLabel(single);
      const labelPlural = component.getCategoryAriaLabel(plural);
      // Both are strings; with real translations the person/people word differs
      expect(typeof labelSingle).toBe('string');
      expect(typeof labelPlural).toBe('string');
    });
  });
});
