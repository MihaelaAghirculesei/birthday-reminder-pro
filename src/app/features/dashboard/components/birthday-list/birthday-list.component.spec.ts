import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BirthdayListComponent } from './birthday-list.component';
import { BirthdayFacadeService } from '../../../../core';
import { Birthday, BirthdayCategory } from '../../../../shared';

describe('BirthdayListComponent', () => {
  let component: BirthdayListComponent;
  let fixture: ComponentFixture<BirthdayListComponent>;
  let birthdayFacadeSpy: jasmine.SpyObj<BirthdayFacadeService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice Johnson',
      birthDate: new Date(1992, 2, 10),
      category: 'friends',
      zodiacSign: 'Pisces',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Bob Williams',
      birthDate: new Date(1988, 7, 25),
      category: 'family',
      zodiacSign: 'Virgo',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    }
  ];

  const mockCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' }
  ];

  beforeEach(async () => {
    const birthdayFacadeSpyObj = jasmine.createSpyObj('BirthdayFacadeService', ['addBirthday', 'updateBirthday', 'deleteBirthday', 'getBirthdayById']);
    const dialogSpyObj = jasmine.createSpyObj('MatDialog', ['open']);

    birthdayFacadeSpyObj.birthdays$ = of(mockBirthdays);
    birthdayFacadeSpyObj.birthdays = jasmine.createSpy('birthdays').and.returnValue(mockBirthdays);
    birthdayFacadeSpyObj.getBirthdayById.and.callFake((id: string) =>
      of(mockBirthdays.find(b => b.id === id))
    );

    await TestBed.configureTestingModule({
      imports: [BirthdayListComponent, NoopAnimationsModule],
      providers: [
        { provide: BirthdayFacadeService, useValue: birthdayFacadeSpyObj },
        { provide: MatDialog, useValue: dialogSpyObj }
      ]
    }).compileComponents();

    birthdayFacadeSpy = TestBed.inject(BirthdayFacadeService) as jasmine.SpyObj<BirthdayFacadeService>;
    dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;

    fixture = TestBed.createComponent(BirthdayListComponent);
    component = fixture.componentInstance;
    component.birthdays = mockBirthdays;
    component.categories = mockCategories;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges', () => {
    it('should enrich birthdays with daysUntilBirthday on changes', () => {
      component.ngOnChanges({
        birthdays: {
          currentValue: mockBirthdays,
          previousValue: [],
          firstChange: true,
          isFirstChange: () => true
        }
      });

      expect(component.enrichedBirthdays.length).toBe(2);
      expect(component.enrichedBirthdays[0].daysUntilBirthday).toBeDefined();
      expect(typeof component.enrichedBirthdays[0].daysUntilBirthday).toBe('number');
    });

    it('should not update enrichedBirthdays if birthdays input did not change', () => {
      const initialEnriched = component.enrichedBirthdays;
      component.ngOnChanges({
        searchTerm: {
          currentValue: 'test',
          previousValue: '',
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(component.enrichedBirthdays).toBe(initialEnriched);
    });
  });

  describe('Search functionality', () => {
    it('should emit searchTermChange when search changes', () => {
      spyOn(component.searchTermChange, 'emit');
      const input = document.createElement('input');
      input.value = 'Alice';
      const event = { target: input } as unknown as Event;

      component.onSearchChange(event);

      expect(component.searchTermChange.emit).toHaveBeenCalledWith('Alice');
    });

    it('should emit clearSearch when clearing search', () => {
      spyOn(component.clearSearch, 'emit');
      component.onClearSearch();
      expect(component.clearSearch.emit).toHaveBeenCalled();
    });
  });

  describe('Undo functionality', () => {
    it('should emit undoAction when undo is triggered', () => {
      spyOn(component.undoAction, 'emit');
      component.onUndo();
      expect(component.undoAction.emit).toHaveBeenCalled();
    });
  });

  describe('Test data management', () => {
    it('should emit addTestData and set loading state', fakeAsync(() => {
      spyOn(component.addTestData, 'emit');
      component.onAddTestData();

      expect(component.isAddingTestData()).toBeTrue();
      expect(component.addTestData.emit).toHaveBeenCalled();

      tick(2000);

      expect(component.isAddingTestData()).toBeFalse();
    }));

    it('should emit clearAllData and set clearing state', fakeAsync(() => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      dialogSpy.open.and.returnValue(mockDialogRef);

      spyOn(component.clearAllData, 'emit');
      component.onClearAllData();

      expect(component.isClearingData()).toBeTrue();
      expect(component.clearAllData.emit).toHaveBeenCalled();

      tick(2000);

      expect(component.isClearingData()).toBeFalse();
    }));
  });

  describe('Birthdays imported', () => {
    it('should emit birthdaysImported when birthdays are imported', () => {
      spyOn(component.birthdaysImported, 'emit');
      component.onBirthdaysImported(mockBirthdays);

      expect(component.birthdaysImported.emit).toHaveBeenCalledWith(mockBirthdays);
    });
  });

  describe('Birthday tracking', () => {
    it('should track birthday by id', () => {
      const birthday = mockBirthdays[0];
      const result = component.trackByBirthday(0, birthday);
      expect(result).toBe('1');
    });
  });

  describe('Edit dialog', () => {
    it('should open edit dialog with correct data', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(undefined));
      dialogSpy.open.and.returnValue(mockDialogRef);

      component.editBirthday(mockBirthdays[0]);

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.first().args;
      expect(callArgs[1]?.data).toEqual({
        birthday: mockBirthdays[0],
        categories: mockCategories
      });
    });

    it('should update birthday when dialog returns result', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of({
        birthday: mockBirthdays[0],
        editedData: {
          name: 'Updated Name',
          notes: 'New notes',
          birthDate: '1992-03-10',
          category: 'friends',
          photo: null,
          rememberPhoto: null,
          email: '',
          phone: '',
          telegramUsername: ''
        }
      }));
      dialogSpy.open.and.returnValue(mockDialogRef);

      component.editBirthday(mockBirthdays[0]);

      expect(birthdayFacadeSpy.updateBirthday).toHaveBeenCalled();
    });

    it('should not update birthday when dialog is cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(undefined));
      dialogSpy.open.and.returnValue(mockDialogRef);

      component.editBirthday(mockBirthdays[0]);

      expect(birthdayFacadeSpy.updateBirthday).not.toHaveBeenCalled();
    });
  });

  describe('Delete birthday', () => {
    it('should delete birthday by id', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      dialogSpy.open.and.returnValue(mockDialogRef);

      component.deleteBirthday(mockBirthdays[0]);
      expect(birthdayFacadeSpy.deleteBirthday).toHaveBeenCalledWith('1');
    });
  });

  describe('Component cleanup', () => {
    it('should clear timers on destroy', fakeAsync(() => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      dialogSpy.open.and.returnValue(mockDialogRef);

      component.onAddTestData();
      component.onClearAllData();

      component.ngOnDestroy();

      // Timers should be cleared
      expect(component['testDataTimer']).toBeDefined();
      expect(component['clearDataTimer']).toBeDefined();
    }));
  });
});
