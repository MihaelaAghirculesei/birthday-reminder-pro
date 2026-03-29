import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BirthdayListComponent } from './birthday-list.component';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { Birthday, BirthdayCategory } from '../../../../shared';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

describe('BirthdayListComponent', () => {
  let component: BirthdayListComponent;
  let fixture: ComponentFixture<BirthdayListComponent>;
  let store: MockStore;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'Alice Johnson',
      birthDate: '1992-03-10',
      category: 'friends',
      zodiacSign: 'Pisces',
      reminderDays: 7,
      notes: '',
      scheduledMessages: []
    },
    {
      id: '2',
      name: 'Bob Williams',
      birthDate: '1988-08-25',
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
    const dialogSpyObj = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [BirthdayListComponent, NoopAnimationsModule],
      providers: [
        provideMockStore({
          initialState: {
            birthdays: {
              ids: ['1', '2'],
              entities: {
                '1': mockBirthdays[0],
                '2': mockBirthdays[1]
              },
              loading: false,
              error: null,
              filters: { searchTerm: '', selectedCategory: null }
            }
          }
        }),
        { provide: MatDialog, useValue: dialogSpyObj },
        provideTranslateTesting()
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
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
    it('should open edit dialog with correct data', async () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(undefined));
      dialogSpy.open.and.returnValue(mockDialogRef);

      await component.editBirthday(mockBirthdays[0]);
      await fixture.whenStable();

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.first().args;
      expect(callArgs[1]?.data).toEqual({
        birthday: mockBirthdays[0],
        categories: mockCategories
      });
    });

    it('should update birthday when dialog returns result (empty fields fall back to undefined)', async () => {
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

      spyOn(store, 'dispatch');
      await component.editBirthday(mockBirthdays[0]);
      await fixture.whenStable();

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should update birthday preserving contact info when provided', async () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of({
        birthday: mockBirthdays[0],
        editedData: {
          name: 'Alice Johnson',
          notes: '',
          birthDate: '1992-03-10',
          category: 'friends',
          photo: 'data:image/png;base64,abc',
          rememberPhoto: 'data:image/png;base64,def',
          email: 'alice@example.com',
          phone: '+39 123 456 789',
          telegramUsername: 'alice_tg'
        }
      }));
      dialogSpy.open.and.returnValue(mockDialogRef);

      spyOn(store, 'dispatch');
      await component.editBirthday(mockBirthdays[0]);
      await fixture.whenStable();

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should fall back to birthday.name when edited name is empty after trim', async () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of({
        birthday: mockBirthdays[0],
        editedData: {
          name: '   ',  // only whitespace → trimmed name is ''
          notes: '',
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

      spyOn(store, 'dispatch');
      await component.editBirthday(mockBirthdays[0]);
      await fixture.whenStable();

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should not update birthday when dialog is cancelled', async () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(undefined));
      dialogSpy.open.and.returnValue(mockDialogRef);

      spyOn(store, 'dispatch');
      await component.editBirthday(mockBirthdays[0]);
      await fixture.whenStable();

      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Delete birthday', () => {
    it('should delete birthday by id', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      dialogSpy.open.and.returnValue(mockDialogRef);

      spyOn(store, 'dispatch');
      component.deleteBirthday(mockBirthdays[0]);
      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should not delete birthday when dialog is cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(false));
      dialogSpy.open.and.returnValue(mockDialogRef);

      spyOn(store, 'dispatch');
      component.deleteBirthday(mockBirthdays[0]);
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Clear all data', () => {
    it('should not emit clearAllData when confirm dialog is rejected', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(false));
      dialogSpy.open.and.returnValue(mockDialogRef);

      spyOn(component.clearAllData, 'emit');
      component.onClearAllData();

      expect(component.clearAllData.emit).not.toHaveBeenCalled();
    });
  });
});
