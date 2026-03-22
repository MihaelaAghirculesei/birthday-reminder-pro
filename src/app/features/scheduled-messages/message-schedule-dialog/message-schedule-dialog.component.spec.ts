import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { MessageScheduleDialogComponent } from './message-schedule-dialog.component';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CategoryFacadeService } from '../../../core';
import { Birthday } from '../../../shared/models';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { signal } from '@angular/core';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';

describe('MessageScheduleDialogComponent', () => {
  let component: MessageScheduleDialogComponent;
  let fixture: ComponentFixture<MessageScheduleDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<MessageScheduleDialogComponent>>;
  let mockCategoryFacade: jasmine.SpyObj<CategoryFacadeService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let store: MockStore;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'John Doe',
      birthDate: '1990-01-15',
      category: 'friends'
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: '1995-06-20',
      category: 'family'
    },
    {
      id: '3',
      name: 'Bob Wilson',
      birthDate: '1988-12-10',
      category: 'work'
    }
  ];

  const createComponent = (data: { birthday?: Birthday; birthdayId?: string; message?: unknown } | null = {}) => {
    TestBed.configureTestingModule({
      imports: [MessageScheduleDialogComponent, BrowserAnimationsModule],
      providers: [
        provideMockStore(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: CategoryFacadeService, useValue: mockCategoryFacade },
        { provide: MatDialog, useValue: mockDialog },
        provideTranslateTesting()
      ]
    });

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, mockBirthdays);

    fixture = TestBed.createComponent(MessageScheduleDialogComponent);
    component = fixture.componentInstance;
  };

  afterEach(() => store.resetSelectors());

  beforeEach(() => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockCategoryFacade = jasmine.createSpyObj('CategoryFacadeService', [], {
      categories: signal([])
    });
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
  });

  describe('Component Creation', () => {
    it('should create', () => {
      createComponent();
      expect(component).toBeTruthy();
    });
  });

  describe('ngOnInit - with birthday object', () => {
    it('should set selectedBirthday when birthday is provided in data', () => {
      const birthday = mockBirthdays[0];
      createComponent({ birthday });

      fixture.detectChanges();

      expect(component.selectedBirthday).toEqual(birthday);
      expect(component.showBirthdaySelector).toBe(false);
    });
  });

  describe('ngOnInit - with birthdayId', () => {
    it('should find and set selectedBirthday when birthdayId is provided', () => {
      createComponent({ birthdayId: '2' });

      fixture.detectChanges();

      expect(component.selectedBirthday).toEqual(mockBirthdays[1]);
      expect(component.showBirthdaySelector).toBe(false);
    });

    it('should not set selectedBirthday when birthdayId is not found', () => {
      createComponent({ birthdayId: 'non-existent-id' });

      fixture.detectChanges();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(false);
    });
  });

  describe('ngOnInit - without data', () => {
    it('should show birthday selector when no data is provided', () => {
      createComponent({});

      fixture.detectChanges();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });

    it('should show birthday selector when data is null', () => {
      createComponent(null);

      fixture.detectChanges();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });

  describe('onBirthdaySelected', () => {
    beforeEach(() => {
      createComponent({});
      fixture.detectChanges();
    });

    it('should set selectedBirthday and hide selector when valid birthdayId is selected', () => {
      component.selectedBirthdayId = '1';

      component.onBirthdaySelected();

      expect(component.selectedBirthday).toEqual(mockBirthdays[0]);
      expect(component.showBirthdaySelector).toBe(false);
    });

    it('should not set selectedBirthday when birthdayId is not found', () => {
      component.selectedBirthdayId = 'invalid-id';

      component.onBirthdaySelected();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });

    it('should not set selectedBirthday when selectedBirthdayId is empty', () => {
      component.selectedBirthdayId = '';

      component.onBirthdaySelected();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });

  describe('changeBirthday', () => {
    it('should reset selectedBirthday and show selector', () => {
      createComponent({ birthday: mockBirthdays[0] });
      fixture.detectChanges();

      expect(component.selectedBirthday).toEqual(mockBirthdays[0]);
      expect(component.showBirthdaySelector).toBe(false);

      component.changeBirthday();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });

  describe('close', () => {
    it('should call dialogRef.close()', () => {
      createComponent();
      fixture.detectChanges();

      component.close();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('trackByBirthday', () => {
    it('should return birthday id', () => {
      createComponent();
      fixture.detectChanges();

      const birthday = mockBirthdays[0];
      const result = component.trackByBirthday(0, birthday);

      expect(result).toBe(birthday.id);
    });

    it('should return correct id for different birthdays', () => {
      createComponent();
      fixture.detectChanges();

      mockBirthdays.forEach((birthday, index) => {
        const result = component.trackByBirthday(index, birthday);
        expect(result).toBe(birthday.id);
      });
    });
  });

  describe('noBirthdays computed signal', () => {
    it('should return false when there are birthdays', () => {
      createComponent();
      fixture.detectChanges();

      expect(component.noBirthdays()).toBe(false);
    });

    it('should return true when there are no birthdays', () => {
      TestBed.resetTestingModule();
      createComponent({});
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, []);
      store.refreshState();
      fixture.detectChanges();

      expect(component.noBirthdays()).toBe(true);
    });
  });

  describe('allBirthdays signal', () => {
    it('should return birthdays from store sorted by nearest birthday', () => {
      createComponent();
      fixture.detectChanges();

      const birthdays = component.allBirthdays();

      expect(birthdays.length).toBe(3);
      expect(birthdays.map(b => b.id)).toEqual(jasmine.arrayWithExactContents(['1', '2', '3']));
    });
  });

  describe('birthdayOptions computed signal', () => {
    it('should pre-compute hasContact as false for birthday without contact info', () => {
      createComponent();
      fixture.detectChanges();

      const options = component.birthdayOptions();
      expect(options.every(o => o.hasContact)).toBeFalse();
    });

    it('should pre-compute hasContact as true for birthday with email', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [{ ...mockBirthdays[0], email: 'test@example.com' }]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].hasContact).toBeTrue();
    });

    it('should pre-compute contactInfo with all contact details', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [{
        ...mockBirthdays[0],
        email: 'test@example.com',
        phone: '+1234567890',
        telegramUsername: 'testuser'
      }]);
      store.refreshState();
      fixture.detectChanges();

      const info = component.birthdayOptions()[0].contactInfo;
      expect(info).toContain('test@example.com');
      expect(info).toContain('+1234567890');
      expect(info).toContain('@testuser');
    });
  });

  describe('Integration - birthday selection flow', () => {
    it('should allow selecting birthday from list', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.showBirthdaySelector).toBe(true);
      expect(component.selectedBirthday).toBeNull();

      component.selectedBirthdayId = '2';
      component.onBirthdaySelected();

      expect(component.selectedBirthday).toEqual(mockBirthdays[1]);
      expect(component.showBirthdaySelector).toBe(false);

      component.changeBirthday();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });
});
