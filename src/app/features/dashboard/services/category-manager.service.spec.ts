import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CategoryManagerService } from './category-manager.service';
import { BirthdayFacadeService, CategoryFacadeService } from '../../../core';
import { Birthday, BirthdayCategory } from '../../../shared';

interface DialogData {
  mode?: 'add' | 'edit';
  category?: BirthdayCategory;
  categoryToDelete?: BirthdayCategory;
  affectedBirthdaysCount?: number;
}

describe('CategoryManagerService', () => {
  let service: CategoryManagerService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let birthdayFacadeSpy: jasmine.SpyObj<BirthdayFacadeService>;
  let categoryFacadeSpy: jasmine.SpyObj<CategoryFacadeService>;

  const mockCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' },
    { id: 'work', name: 'Work', icon: 'business_center', color: '#FF9800' }
  ];

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice',
      birthDate: new Date(1990, 0, 15),
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Bob',
      birthDate: new Date(1985, 5, 20),
      category: 'work',
      zodiacSign: 'Gemini',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    }
  ];

  beforeEach(() => {
    const dialogSpyObj = jasmine.createSpyObj('MatDialog', ['open']);
    const birthdayFacadeSpyObj = jasmine.createSpyObj('BirthdayFacadeService', ['updateBirthday'], {
      birthdays$: of(mockBirthdays),
      birthdays: jasmine.createSpy('birthdays').and.returnValue(mockBirthdays)
    });
    const categoryFacadeSpyObj = jasmine.createSpyObj('CategoryFacadeService', [
      'addCategory',
      'updateCategory',
      'deleteCategory'
    ], {
      categories$: of(mockCategories),
      categories: jasmine.createSpy('categories').and.returnValue(mockCategories)
    });

    TestBed.configureTestingModule({
      providers: [
        CategoryManagerService,
        { provide: MatDialog, useValue: dialogSpyObj },
        { provide: BirthdayFacadeService, useValue: birthdayFacadeSpyObj },
        { provide: CategoryFacadeService, useValue: categoryFacadeSpyObj }
      ]
    });

    service = TestBed.inject(CategoryManagerService);
    dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    birthdayFacadeSpy = TestBed.inject(BirthdayFacadeService) as jasmine.SpyObj<BirthdayFacadeService>;
    categoryFacadeSpy = TestBed.inject(CategoryFacadeService) as jasmine.SpyObj<CategoryFacadeService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addCategory', () => {
    it('should open dialog with correct configuration', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.first().args;
      expect(callArgs[1]?.width).toBe('600px');
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.mode).toBe('add');
    });

    it('should add category when dialog returns result', () => {
      const mockResult = {
        name: 'New Category',
        icon: 'star',
        color: '#FFC107'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();

      expect(categoryFacadeSpy.addCategory).toHaveBeenCalled();
      const addedCategory = categoryFacadeSpy.addCategory.calls.first().args[0];
      expect(addedCategory.name).toBe('New Category');
      expect(addedCategory.icon).toBe('star');
      expect(addedCategory.color).toBe('#FFC107');
      expect(addedCategory.id).toBeTruthy();
    });

    it('should not add category when dialog is cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();

      expect(categoryFacadeSpy.addCategory).not.toHaveBeenCalled();
    });

    it('should generate unique category ID', () => {
      const mockResult = {
        name: 'Test Category',
        icon: 'star',
        color: '#FFC107'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();

      const addedCategory = categoryFacadeSpy.addCategory.calls.first().args[0];
      expect(addedCategory.id).toContain('test-category');
      expect(addedCategory.id).toMatch(/test-category-\d+/);
    });
  });

  describe('editCategory', () => {
    it('should show alert when no orphaned birthdays exist', () => {
      spyOn(window, 'alert');

      service.editCategory('__orphaned__');

      expect(window.alert).toHaveBeenCalledWith('There are no uncategorized birthdays to reassign.');
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('should open edit dialog for existing category', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.first().args;
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.mode).toBe('edit');
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.category?.id).toBe('friends');
    });

    it('should update category when dialog returns result', () => {
      const mockResult = {
        name: 'Updated Friends',
        icon: 'people',
        color: '#00FF00'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');

      expect(categoryFacadeSpy.updateCategory).toHaveBeenCalled();
      const updatedCategory = categoryFacadeSpy.updateCategory.calls.first().args[0];
      expect(updatedCategory.id).toBe('friends');
      expect(updatedCategory.name).toBe('Updated Friends');
      expect(updatedCategory.icon).toBe('people');
      expect(updatedCategory.color).toBe('#00FF00');
    });

    it('should not update when dialog is cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');

      expect(categoryFacadeSpy.updateCategory).not.toHaveBeenCalled();
    });

    it('should not open dialog for non-existent category', () => {
      service.editCategory('non-existent');

      const dialogCallArgs = dialogSpy.open.calls.all();
      const editDialogCalls = dialogCallArgs.filter(call =>
        (call.args[1] as MatDialogConfig<DialogData>)?.data?.mode === 'edit'
      );
      expect(editDialogCalls.length).toBe(0);
    });
  });

  describe('deleteCategory', () => {
    beforeEach(() => {
      spyOn(window, 'confirm').and.returnValue(true);
    });

    it('should delete category without birthdays after confirmation', () => {
      service.deleteCategory('family'); // family has no birthdays in mockBirthdays

      expect(categoryFacadeSpy.deleteCategory).toHaveBeenCalledWith('family');
    });

    it('should not delete if user cancels confirmation', () => {
      (window.confirm as jasmine.Spy).and.returnValue(false);

      service.deleteCategory('family');

      expect(categoryFacadeSpy.deleteCategory).not.toHaveBeenCalled();
    });

    it('should open reassign dialog when category has birthdays', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.deleteCategory('work'); // work has 1 birthday

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.first().args;
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.categoryToDelete?.id).toBe('work');
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.affectedBirthdaysCount).toBe(1);
    });

    it('should reassign birthdays and delete category', () => {
      const mockResult = {
        action: 'reassign',
        newCategoryId: 'family'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.deleteCategory('work');

      expect(birthdayFacadeSpy.updateBirthday).toHaveBeenCalled();
      expect(categoryFacadeSpy.deleteCategory).toHaveBeenCalledWith('work');
    });

    it('should delete category without reassigning (orphan option)', () => {
      const mockResult = {
        action: 'delete-orphan'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.deleteCategory('work');

      expect(categoryFacadeSpy.deleteCategory).toHaveBeenCalledWith('work');
      expect(birthdayFacadeSpy.updateBirthday).not.toHaveBeenCalled();
    });

    it('should not delete when reassign dialog is cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.deleteCategory('work');

      expect(categoryFacadeSpy.deleteCategory).not.toHaveBeenCalled();
    });

    it('should not throw for non-existent category', () => {
      expect(() => service.deleteCategory('non-existent')).not.toThrow();
      expect(categoryFacadeSpy.deleteCategory).not.toHaveBeenCalled();
    });
  });
});
