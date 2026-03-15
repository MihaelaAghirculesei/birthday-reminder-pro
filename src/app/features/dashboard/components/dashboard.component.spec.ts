import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DashboardComponent } from './dashboard.component';
import { BirthdayEditService, CategoryManagerService, DashboardFacadeService, ChartDataItem } from '../services';
import { CategoryFacadeService } from '../../../core';
import { BirthdayStatsService } from '../services/birthday-stats.service';
import { provideMockStore } from '@ngrx/store/testing';
import { Birthday, BirthdayCategory } from '../../../shared';
import { CategoryStats } from './category-filter/category-filter.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let facadeSpy: jasmine.SpyObj<DashboardFacadeService>;
  let editServiceSpy: jasmine.SpyObj<BirthdayEditService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let categoryManagerSpy: jasmine.SpyObj<CategoryManagerService>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'John Doe',
      birthDate: new Date(1990, 0, 15),
      category: 'friends',
      zodiacSign: 'Capricorn',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: new Date(1985, 5, 20),
      category: 'family',
      zodiacSign: 'Gemini',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    }
  ];

  const mockCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' }
  ];

  const mockCategoryStats: CategoryStats[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50', count: 1 },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3', count: 1 }
  ];

  const mockChartData: ChartDataItem[] = [
    { month: 'Jan', count: 1, label: 'January' },
    { month: 'Feb', count: 0, label: 'February' }
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();

    const facadeSpyObj = jasmine.createSpyObj('DashboardFacadeService', [
      'selectCategory',
      'clearCategoryFilter',
      'setSearchTerm',
      'clearSearch',
      'addBirthday',
      'deleteBirthday',
      'undoLastAction',
      'loadTestData',
      'clearAllData',
      'importBirthdays',
      'isCategorySelected'
    ], {
      selectedCategory: signal<string | null>(null),
      searchTerm: signal(''),
      lastAction: signal<{ type: string; data: Birthday | BirthdayCategory } | null>(null),
      totalBirthdays: signal(2),
      birthdaysThisMonth: signal(1),
      averageAge: signal(30),
      nextBirthdayDays: signal(10),
      nextBirthdayText: signal('In 10 days'),
      chartData: signal(mockChartData),
      maxCount: signal(1),
      categoriesStats: signal(mockCategoryStats),
      filteredBirthdays: signal(mockBirthdays),
      categories: signal(mockCategories)
    });

    const editServiceSpyObj = jasmine.createSpyObj('BirthdayEditService', ['cancelEdit'], {
      currentEditingId: null
    });

    const dialogSpyObj = jasmine.createSpyObj('MatDialog', ['open']);

    const categoryManagerSpyObj = jasmine.createSpyObj('CategoryManagerService', [
      'addCategory',
      'editCategory',
      'deleteCategory'
    ]);

    const categoryFacadeSpyObj = jasmine.createSpyObj('CategoryFacadeService', [], {
      categories: signal(mockCategories)
    });

    const statsServiceSpyObj = jasmine.createSpyObj('BirthdayStatsService', [
      'getChartData', 'getMaxCount', 'getCategoriesStats'
    ]);

    facadeSpyObj.isCategorySelected.and.callFake(() => false);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, NoopAnimationsModule],
      providers: [
        { provide: DashboardFacadeService, useValue: facadeSpyObj },
        { provide: BirthdayEditService, useValue: editServiceSpyObj },
        { provide: MatDialog, useValue: dialogSpyObj },
        { provide: CategoryManagerService, useValue: categoryManagerSpyObj },
        provideMockStore({
          initialState: {
            birthdays: { ids: [], entities: {}, loading: false, error: null, filters: { searchTerm: '', selectedCategory: null } },
            auth: { user: null, loading: false, error: null, initialized: false }
          }
        }),
        { provide: CategoryFacadeService, useValue: categoryFacadeSpyObj },
        { provide: BirthdayStatsService, useValue: statsServiceSpyObj }
      ]
    }).compileComponents();

    facadeSpy = TestBed.inject(DashboardFacadeService) as jasmine.SpyObj<DashboardFacadeService>;
    editServiceSpy = TestBed.inject(BirthdayEditService) as jasmine.SpyObj<BirthdayEditService>;
    dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    categoryManagerSpy = TestBed.inject(CategoryManagerService) as jasmine.SpyObj<CategoryManagerService>;

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Facade signals access', () => {
    it('should expose totalBirthdays from facade', () => {
      expect(component.facade.totalBirthdays()).toBe(2);
    });

    it('should expose birthdaysThisMonth from facade', () => {
      expect(component.facade.birthdaysThisMonth()).toBe(1);
    });

    it('should expose averageAge from facade', () => {
      expect(component.facade.averageAge()).toBe(30);
    });

    it('should expose nextBirthdayDays from facade', () => {
      expect(component.facade.nextBirthdayDays()).toBe(10);
    });

    it('should expose nextBirthdayText from facade', () => {
      expect(component.facade.nextBirthdayText()).toBe('In 10 days');
    });

    it('should expose chartData from facade', () => {
      expect(component.facade.chartData()).toEqual(mockChartData);
    });

    it('should expose maxCount from facade', () => {
      expect(component.facade.maxCount()).toBe(1);
    });

    it('should expose categoriesStats from facade', () => {
      expect(component.facade.categoriesStats()).toEqual(mockCategoryStats);
    });

    it('should expose filteredBirthdays from facade', () => {
      expect(component.facade.filteredBirthdays()).toEqual(mockBirthdays);
    });

    it('should expose categories from facade', () => {
      expect(component.facade.categories()).toEqual(mockCategories);
    });

    it('should expose selectedCategory from facade', () => {
      expect(component.facade.selectedCategory()).toBeNull();
    });

    it('should expose searchTerm from facade', () => {
      expect(component.facade.searchTerm()).toBe('');
    });

    it('should expose lastAction from facade', () => {
      expect(component.facade.lastAction()).toBeNull();
    });
  });

  describe('Category management', () => {
    it('should call facade.selectCategory on category select', () => {
      component.onCategorySelect('friends');
      expect(facadeSpy.selectCategory).toHaveBeenCalledWith('friends');
    });

    it('should call facade.clearCategoryFilter on clear', () => {
      component.onClearCategoryFilter();
      expect(facadeSpy.clearCategoryFilter).toHaveBeenCalled();
    });

    it('should call categoryManager.addCategory on add category', () => {
      component.onAddCategory();
      expect(categoryManagerSpy.addCategory).toHaveBeenCalled();
    });

    it('should call categoryManager.editCategory with id', () => {
      component.onEditCategory('friends');
      expect(categoryManagerSpy.editCategory).toHaveBeenCalledWith('friends');
    });

    it('should call categoryManager.deleteCategory with id', () => {
      component.onDeleteCategory('friends');
      expect(categoryManagerSpy.deleteCategory).toHaveBeenCalledWith('friends');
    });
  });

  describe('Search functionality', () => {
    it('should call facade.setSearchTerm on search change', () => {
      component.onSearchTermChange('John');
      expect(facadeSpy.setSearchTerm).toHaveBeenCalledWith('John');
    });

    it('should call facade.clearSearch on clear', () => {
      component.onClearSearch();
      expect(facadeSpy.clearSearch).toHaveBeenCalled();
    });
  });

  describe('Data management', () => {
    it('should call facade.loadTestData on add test data', () => {
      component.onAddTestData();
      expect(facadeSpy.loadTestData).toHaveBeenCalled();
    });

    it('should call facade.clearAllData on clear all', () => {
      component.onClearAllData();
      expect(facadeSpy.clearAllData).toHaveBeenCalled();
    });

    it('should call facade.undoLastAction on undo', () => {
      component.onUndoAction();
      expect(facadeSpy.undoLastAction).toHaveBeenCalled();
    });

    it('should call facade.deleteBirthday on birthday delete', () => {
      component.onBirthdayDeleted(mockBirthdays[0]);
      expect(facadeSpy.deleteBirthday).toHaveBeenCalledWith(mockBirthdays[0]);
    });

    it('should call facade.importBirthdays on import', () => {
      const birthdays = [mockBirthdays[0]];
      component.onBirthdaysImported(birthdays);
      expect(facadeSpy.importBirthdays).toHaveBeenCalledWith(birthdays);
    });
  });

  describe('Message dialog', () => {
    it('should open message dialog', () => {
      component.onOpenMessageDialog();
      expect(dialogSpy.open).toHaveBeenCalled();
    });

    it('should blur button before opening dialog', () => {
      const button = document.createElement('button');
      spyOn(button, 'blur');
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: button, enumerable: true });

      component.onOpenMessageDialog(event);
      expect(button.blur).toHaveBeenCalled();
    });
  });

  describe('Edit mode click handler (document listener)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should not cancel edit if no editing ID', () => {
      Object.defineProperty(editServiceSpy, 'currentEditingId', {
        get: () => null,
        configurable: true
      });
      document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(editServiceSpy.cancelEdit).not.toHaveBeenCalled();
    });

    it('should cancel edit when clicking outside', () => {
      Object.defineProperty(editServiceSpy, 'currentEditingId', {
        get: () => '1',
        configurable: true
      });
      const div = document.createElement('div');
      document.body.appendChild(div);
      div.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.body.removeChild(div);
      expect(editServiceSpy.cancelEdit).toHaveBeenCalled();
    });

    it('should not cancel edit when clicking on collapsible header', () => {
      Object.defineProperty(editServiceSpy, 'currentEditingId', {
        get: () => '1',
        configurable: true
      });
      const header = document.createElement('div');
      header.className = 'collapsible-header';
      document.body.appendChild(header);
      header.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.body.removeChild(header);
      expect(editServiceSpy.cancelEdit).not.toHaveBeenCalled();
    });

    it('should not cancel edit when clicking on button', () => {
      Object.defineProperty(editServiceSpy, 'currentEditingId', {
        get: () => '1',
        configurable: true
      });
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      document.body.removeChild(button);
      expect(editServiceSpy.cancelEdit).not.toHaveBeenCalled();
    });
  });

  describe('Component initialization', () => {
    it('should have currentMonth set to current month', () => {
      expect(component.currentMonth).toBe(new Date().getMonth());
    });

    it('should have facade injected', () => {
      expect(component.facade).toBeTruthy();
    });

    it('should have editService injected', () => {
      expect(component.editService).toBeTruthy();
    });
  });
});
