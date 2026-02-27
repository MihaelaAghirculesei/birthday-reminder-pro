import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MessageScheduleDialogComponent } from './message-schedule-dialog.component';
import { BirthdayFacadeService } from '../../../core';
import { Birthday } from '../../../shared/models';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('MessageScheduleDialogComponent', () => {
  let component: MessageScheduleDialogComponent;
  let fixture: ComponentFixture<MessageScheduleDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<MessageScheduleDialogComponent>>;
  let mockBirthdayFacade: jasmine.SpyObj<BirthdayFacadeService>;

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'John Doe',
      birthDate: new Date('1990-01-15'),
      category: 'friends'
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: new Date('1995-06-20'),
      category: 'family'
    },
    {
      id: '3',
      name: 'Bob Wilson',
      birthDate: new Date('1988-12-10'),
      category: 'work'
    }
  ];

  const createComponent = (data: { birthday?: Birthday; birthdayId?: string; message?: unknown } | null = {}) => {
    TestBed.configureTestingModule({
      imports: [MessageScheduleDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: BirthdayFacadeService, useValue: mockBirthdayFacade }
      ]
    });

    fixture = TestBed.createComponent(MessageScheduleDialogComponent);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockBirthdayFacade = jasmine.createSpyObj('BirthdayFacadeService', [
      'getMessagesByBirthday',
      'addMessageToBirthday',
      'updateMessageForBirthday',
      'deleteMessageFromBirthday'
    ], {
      birthdays: signal(mockBirthdays)
    });
    mockBirthdayFacade.getMessagesByBirthday.and.returnValue(of([]));
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
      mockBirthdayFacade = jasmine.createSpyObj('BirthdayFacadeService', [
        'getMessagesByBirthday',
        'addMessageToBirthday',
        'updateMessageForBirthday',
        'deleteMessageFromBirthday'
      ], {
        birthdays: signal([])
      });
      mockBirthdayFacade.getMessagesByBirthday.and.returnValue(of([]));

      TestBed.resetTestingModule();
      createComponent({});
      fixture.detectChanges();

      expect(component.noBirthdays()).toBe(true);
    });
  });

  describe('allBirthdays signal', () => {
    it('should return birthdays from facade', () => {
      createComponent();
      fixture.detectChanges();

      const birthdays = component.allBirthdays();

      expect(birthdays).toEqual(mockBirthdays);
      expect(birthdays.length).toBe(3);
    });
  });

  describe('hasContact', () => {
    it('should return false for birthday without contact info', () => {
      createComponent();
      fixture.detectChanges();

      expect(component.hasContact(mockBirthdays[0])).toBeFalse();
    });

    it('should return true for birthday with email', () => {
      createComponent();
      fixture.detectChanges();

      const birthdayWithEmail = { ...mockBirthdays[0], email: 'test@example.com' };
      expect(component.hasContact(birthdayWithEmail)).toBeTrue();
    });

    it('should return true for birthday with phone', () => {
      createComponent();
      fixture.detectChanges();

      const birthdayWithPhone = { ...mockBirthdays[0], phone: '+1234567890' };
      expect(component.hasContact(birthdayWithPhone)).toBeTrue();
    });

    it('should return true for birthday with telegram', () => {
      createComponent();
      fixture.detectChanges();

      const birthdayWithTelegram = { ...mockBirthdays[0], telegramUsername: 'testuser' };
      expect(component.hasContact(birthdayWithTelegram)).toBeTrue();
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
