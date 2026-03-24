import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { of } from 'rxjs';
import { CategoryManagerService } from './category-manager.service';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CategoryFacadeService, NotificationService } from '../../../core';
import { LocaleService } from '../../../core/services/locale.service';
import { Birthday, BirthdayCategory } from '../../../shared';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';

interface DialogData {
  mode?: 'add' | 'edit';
  category?: BirthdayCategory;
  categoryToDelete?: BirthdayCategory;
  affectedBirthdaysCount?: number;
}

describe('CategoryManagerService', () => {
  let service: CategoryManagerService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let store: MockStore;
  let categoryFacadeSpy: jasmine.SpyObj<CategoryFacadeService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  const mockCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' },
    { id: 'work', name: 'Work', icon: 'business_center', color: '#FF9800' }
  ];

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice',
      birthDate: '1990-01-15',
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Bob',
      birthDate: '1985-06-20',
      category: 'work',
      zodiacSign: 'Gemini',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    }
  ];

  beforeEach(() => {
    const dialogSpyObj = jasmine.createSpyObj('MatDialog', ['open']);
    const notificationServiceSpyObj = jasmine.createSpyObj('NotificationService', ['show']);
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
        provideMockStore(),
        { provide: MatDialog, useValue: dialogSpyObj },
        { provide: CategoryFacadeService, useValue: categoryFacadeSpyObj },
        { provide: NotificationService, useValue: notificationServiceSpyObj },
        provideTranslateTesting()
      ]
    });

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, mockBirthdays);

    service = TestBed.inject(CategoryManagerService);
    dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    categoryFacadeSpy = TestBed.inject(CategoryFacadeService) as jasmine.SpyObj<CategoryFacadeService>;
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  afterEach(() => store.resetSelectors());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addCategory', () => {
    it('should open dialog with correct configuration', fakeAsync(() => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();
      flushMicrotasks();

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.first().args;
      expect(callArgs[1]?.width).toBe('min(600px, 90vw)');
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.mode).toBe('add');
    }));

    it('should add category when dialog returns result', fakeAsync(() => {
      const mockResult = {
        name: 'New Category',
        icon: 'star',
        color: '#FFC107'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();
      flushMicrotasks();

      expect(categoryFacadeSpy.addCategory).toHaveBeenCalled();
      const addedCategory = categoryFacadeSpy.addCategory.calls.first().args[0];
      expect(addedCategory.name).toBe('New Category');
      expect(addedCategory.icon).toBe('star');
      expect(addedCategory.color).toBe('#FFC107');
      expect(addedCategory.id).toBeTruthy();
    }));

    it('should not add category when dialog is cancelled', fakeAsync(() => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();
      flushMicrotasks();

      expect(categoryFacadeSpy.addCategory).not.toHaveBeenCalled();
    }));

    it('should generate unique category ID', fakeAsync(() => {
      const mockResult = {
        name: 'Test Category',
        icon: 'star',
        color: '#FFC107'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();
      flushMicrotasks();

      const addedCategory = categoryFacadeSpy.addCategory.calls.first().args[0];
      expect(addedCategory.id).toContain('test-category');
      expect(addedCategory.id).toMatch(/test-category-\d+/);
    }));

    it('should include other-language translation when nameOtherLang is provided', fakeAsync(() => {
      const mockResult = {
        name: 'Amici',
        nameOtherLang: '  Friends  ',
        icon: 'people',
        color: '#2196F3'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();
      flushMicrotasks();

      const addedCategory = categoryFacadeSpy.addCategory.calls.first().args[0];
      // nameTranslations should include the trimmed other-lang value
      expect(addedCategory.nameTranslations).toBeDefined();
      const translationValues = Object.values(addedCategory.nameTranslations!);
      expect(translationValues).toContain('Friends');
    }));

    it('should set correct otherLang when currentLang is "it"', fakeAsync(() => {
      const localeService = TestBed.inject(LocaleService);
      localeService.setLanguage('it');

      const mockResult = { name: 'Famiglia', nameOtherLang: '', icon: 'family_restroom', color: '#4CAF50' };
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.addCategory();
      flushMicrotasks();

      const addedCategory = categoryFacadeSpy.addCategory.calls.first().args[0];
      // currentLang is 'it', so nameTranslations should have 'it' key
      expect(addedCategory.nameTranslations?.['it']).toBe('Famiglia');
    }));
  });

  describe('editCategory', () => {
    it('should show notification when no orphaned birthdays exist', () => {
      service.editCategory('__orphaned__');

      expect(notificationServiceSpy.show).toHaveBeenCalledWith('There are no uncategorized birthdays to reassign.', 'info');
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('should open edit dialog for existing category', fakeAsync(() => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');
      flushMicrotasks();

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.first().args;
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.mode).toBe('edit');
      expect((callArgs[1] as MatDialogConfig<DialogData>)?.data?.category?.id).toBe('friends');
    }));

    it('should update category when dialog returns result', fakeAsync(() => {
      const mockResult = {
        name: 'Updated Friends',
        icon: 'people',
        color: '#00FF00'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');
      flushMicrotasks();

      expect(categoryFacadeSpy.updateCategory).toHaveBeenCalled();
      const updatedCategory = categoryFacadeSpy.updateCategory.calls.first().args[0];
      expect(updatedCategory.id).toBe('friends');
      expect(updatedCategory.name).toBe('Updated Friends');
      expect(updatedCategory.icon).toBe('people');
      expect(updatedCategory.color).toBe('#00FF00');
    }));

    it('should not update when dialog is cancelled', fakeAsync(() => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');
      flushMicrotasks();

      expect(categoryFacadeSpy.updateCategory).not.toHaveBeenCalled();
    }));

    it('should include other-language translation when nameOtherLang has value in edit', fakeAsync(() => {
      const mockResult = {
        name: 'Amici',
        nameOtherLang: ' Friends ',
        icon: 'people',
        color: '#2196F3'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');
      flushMicrotasks();

      const updatedCategory = categoryFacadeSpy.updateCategory.calls.first().args[0];
      expect(updatedCategory.nameTranslations).toBeDefined();
      const translationValues = Object.values(updatedCategory.nameTranslations!);
      expect(translationValues).toContain('Friends');
    }));

    it('should use Italian as current lang when locale is "it" during edit', fakeAsync(() => {
      const localeService = TestBed.inject(LocaleService);
      localeService.setLanguage('it');

      const mockResult = { name: 'Amici', nameOtherLang: '', icon: 'people', color: '#2196F3' };
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.editCategory('friends');
      flushMicrotasks();

      const updatedCategory = categoryFacadeSpy.updateCategory.calls.first().args[0];
      // currentLang is 'it', nameTranslations should contain 'it' key
      expect(updatedCategory.nameTranslations?.['it']).toBe('Amici');
    }));

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
    it('should delete category without birthdays after confirmation', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.deleteCategory('family'); 

      expect(categoryFacadeSpy.deleteCategory).toHaveBeenCalledWith('family');
    });

    it('should not delete if user cancels confirmation', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(false));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.deleteCategory('family');

      expect(categoryFacadeSpy.deleteCategory).not.toHaveBeenCalled();
    });

    it('should open reassign dialog when category has birthdays', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(null));
      dialogSpy.open.and.returnValue(mockDialogRef);

      service.deleteCategory('work'); 

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
      spyOn(store, 'dispatch');

      service.deleteCategory('work');

      expect(store.dispatch).toHaveBeenCalled();
      expect(categoryFacadeSpy.deleteCategory).toHaveBeenCalledWith('work');
    });

    it('should delete category without reassigning (orphan option)', () => {
      const mockResult = {
        action: 'delete-orphan'
      };

      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(mockResult));
      dialogSpy.open.and.returnValue(mockDialogRef);
      spyOn(store, 'dispatch');

      service.deleteCategory('work');

      expect(categoryFacadeSpy.deleteCategory).toHaveBeenCalledWith('work');
      expect(store.dispatch).not.toHaveBeenCalled();
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
