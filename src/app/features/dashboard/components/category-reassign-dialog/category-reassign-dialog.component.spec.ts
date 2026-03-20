import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CategoryReassignDialogComponent, CategoryReassignDialogData } from './category-reassign-dialog.component';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { BirthdayCategory } from '../../../../shared';

describe('CategoryReassignDialogComponent', () => {
  let component: CategoryReassignDialogComponent;
  let fixture: ComponentFixture<CategoryReassignDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<CategoryReassignDialogComponent>>;

  const mockCategories: BirthdayCategory[] = [
    { id: '1', name: 'Family', icon: 'family_restroom', color: '#FF0000' },
    { id: '2', name: 'Friends', icon: 'groups', color: '#00FF00' },
    { id: '3', name: 'Work', icon: 'business_center', color: '#0000FF' },
    { id: '4', name: 'Other', icon: 'stars', color: '#FFFF00' }
  ];

  const createComponent = (data: CategoryReassignDialogData) => {
    TestBed.configureTestingModule({
      imports: [CategoryReassignDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        provideTranslateTesting()
      ]
    });

    fixture = TestBed.createComponent(CategoryReassignDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  });

  describe('Component Creation', () => {
    it('should create', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };

      createComponent(data);

      expect(component).toBeTruthy();
    });
  });

  describe('Constructor - delete mode', () => {
    it('should filter out the category being deleted from available categories', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };

      createComponent(data);

      expect(component.availableCategories.length).toBe(3);
      expect(component.availableCategories).not.toContain(mockCategories[0]);
      expect(component.availableCategories).toContain(mockCategories[1]);
      expect(component.availableCategories).toContain(mockCategories[2]);
      expect(component.availableCategories).toContain(mockCategories[3]);
    });

    it('should set isReassignOnly to false when mode is not specified', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };

      createComponent(data);

      expect(component.isReassignOnly).toBe(false);
    });

    it('should set default selectedCategoryId to first available category', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };

      createComponent(data);

      expect(component.selectedCategoryId).toBe(mockCategories[1].id);
    });

    it('should handle empty available categories gracefully', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: [mockCategories[0]]
      };

      createComponent(data);

      expect(component.availableCategories.length).toBe(0);
      expect(component.selectedCategoryId).toBeNull();
    });
  });

  describe('Constructor - reassign-only mode', () => {
    it('should set isReassignOnly to true when mode is reassign-only', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories,
        mode: 'reassign-only'
      };

      createComponent(data);

      expect(component.isReassignOnly).toBe(true);
    });

    it('should set isReassignOnly to false when mode is delete', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories,
        mode: 'delete'
      };

      createComponent(data);

      expect(component.isReassignOnly).toBe(false);
    });
  });

  describe('onConfirm', () => {
    beforeEach(() => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };
      createComponent(data);
    });

    it('should close dialog with reassign action and selected category id', () => {
      component.selectedCategoryId = mockCategories[2].id;

      component.onConfirm();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        action: 'reassign',
        newCategoryId: mockCategories[2].id
      });
    });

    it('should close dialog with null categoryId if none selected', () => {
      component.selectedCategoryId = null;

      component.onConfirm();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        action: 'reassign',
        newCategoryId: null
      });
    });
  });

  describe('onDeleteWithoutReassign', () => {
    it('should close dialog with delete-orphan action', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };
      createComponent(data);

      component.onDeleteWithoutReassign();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        action: 'delete-orphan',
        newCategoryId: null
      });
    });
  });

  describe('onCancel', () => {
    it('should close dialog with null', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };
      createComponent(data);

      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledWith(null);
    });
  });

  describe('trackByCategory', () => {
    beforeEach(() => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };
      createComponent(data);
    });

    it('should return category id', () => {
      const category = mockCategories[0];
      const result = component.trackByCategory(0, category);

      expect(result).toBe(category.id);
    });

    it('should return correct id for different categories', () => {
      mockCategories.forEach((category, index) => {
        const result = component.trackByCategory(index, category);
        expect(result).toBe(category.id);
      });
    });
  });

  describe('Integration - reassignment flow', () => {
    it('should allow changing selection and confirming', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };
      createComponent(data);

      expect(component.selectedCategoryId).toBe(mockCategories[1].id);

      component.selectedCategoryId = mockCategories[3].id;
      component.onConfirm();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        action: 'reassign',
        newCategoryId: mockCategories[3].id
      });
    });

    it('should allow cancelling reassignment', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: mockCategories
      };
      createComponent(data);

      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledWith(null);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single remaining category', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 10,
        availableCategories: [mockCategories[0], mockCategories[1]]
      };
      createComponent(data);

      expect(component.availableCategories.length).toBe(1);
      expect(component.selectedCategoryId).toBe(mockCategories[1].id);
    });

    it('should handle large number of affected birthdays', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 1000,
        availableCategories: mockCategories
      };
      createComponent(data);

      expect(component.data.affectedBirthdaysCount).toBe(1000);
    });

    it('should handle zero affected birthdays', () => {
      const data: CategoryReassignDialogData = {
        categoryToDelete: mockCategories[0],
        affectedBirthdaysCount: 0,
        availableCategories: mockCategories
      };
      createComponent(data);

      expect(component.data.affectedBirthdaysCount).toBe(0);
    });
  });
});
