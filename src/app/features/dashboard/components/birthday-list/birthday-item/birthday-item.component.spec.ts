import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { BirthdayItemComponent } from './birthday-item.component';
import { Birthday } from '../../../../../shared';

interface MockMouseEvent {
  currentTarget: { blur: jasmine.Spy } | HTMLButtonElement;
}

describe('BirthdayItemComponent', () => {
  let component: BirthdayItemComponent;
  let fixture: ComponentFixture<BirthdayItemComponent>;

  const mockBirthday: Birthday = {
    id: 'b1',
    name: 'John Doe',
    birthDate: new Date('1990-05-15'),
    zodiacSign: 'Taurus',
    reminderDays: 7,
    category: 'family'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BirthdayItemComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BirthdayItemComponent);
    component = fixture.componentInstance;
    component.birthday = mockBirthday;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input properties', () => {
    it('should accept birthday input', () => {
      expect(component.birthday).toEqual(mockBirthday);
    });

    it('should initialize daysUntilBirthday as 0', () => {
      expect(component.daysUntilBirthday).toBe(0);
    });

    it('should accept defaultCategory input', () => {
      component.defaultCategory = 'friends';
      expect(component.defaultCategory).toBe('friends');
    });
  });

  describe('ngOnChanges', () => {
    it('should update days data when daysUntilBirthday changes', () => {
      spyOn(component as unknown as Record<string, () => void>, 'updateDaysData');

      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 5, false)
      });

      expect(component['updateDaysData']).toHaveBeenCalled();
    });

    it('should not update if daysUntilBirthday does not change', () => {
      spyOn(component as unknown as Record<string, () => void>, 'updateDaysData');

      component.ngOnChanges({
        birthday: new SimpleChange(null, mockBirthday, false)
      });

      expect(component['updateDaysData']).not.toHaveBeenCalled();
    });
  });

  describe('updateDaysData', () => {
    it('should set "Today!" when days = 0', () => {
      component.daysUntilBirthday = 0;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(1, 0, false)
      });

      expect(component.daysText).toBe('Today!');
      expect(component.daysChipClass).toBe('red-alert');
    });

    it('should set "Tomorrow" when days = 1', () => {
      component.daysUntilBirthday = 1;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 1, false)
      });

      expect(component.daysText).toBe('Tomorrow');
      expect(component.daysChipClass).toBe('red-alert');
    });

    it('should set "X days" for multiple days', () => {
      component.daysUntilBirthday = 15;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 15, false)
      });

      expect(component.daysText).toBe('15 days');
      expect(component.daysChipClass).toBe('orange-warning');
    });

    it('should set red-alert class for days <= 7', () => {
      component.daysUntilBirthday = 5;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 5, false)
      });

      expect(component.daysChipClass).toBe('red-alert');
    });

    it('should set red-alert class for day 7', () => {
      component.daysUntilBirthday = 7;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 7, false)
      });

      expect(component.daysChipClass).toBe('red-alert');
    });

    it('should set orange-warning class for days 8-21', () => {
      component.daysUntilBirthday = 14;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 14, false)
      });

      expect(component.daysChipClass).toBe('orange-warning');
    });

    it('should set orange-warning class for day 21', () => {
      component.daysUntilBirthday = 21;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 21, false)
      });

      expect(component.daysChipClass).toBe('orange-warning');
    });

    it('should set green-safe class for days > 21', () => {
      component.daysUntilBirthday = 30;
      component.ngOnChanges({
        daysUntilBirthday: new SimpleChange(0, 30, false)
      });

      expect(component.daysChipClass).toBe('green-safe');
    });
  });

  describe('getAge', () => {
    it('should calculate age correctly', () => {
      const birthDate = new Date('1990-01-15');
      const age = component.getAge(birthDate);

      expect(age).toBeGreaterThan(30);
      expect(typeof age).toBe('number');
    });

    it('should return age for different birth dates', () => {
      const birthDate1 = new Date('2000-06-10');
      const birthDate2 = new Date('1985-12-25');

      const age1 = component.getAge(birthDate1);
      const age2 = component.getAge(birthDate2);

      expect(age1).toBeLessThan(age2);
    });
  });

  describe('onEdit', () => {
    it('should emit edit event with birthday', () => {
      spyOn(component.edit, 'emit');
      const mockEvent: MockMouseEvent = { currentTarget: { blur: jasmine.createSpy('blur') } };

      component.onEdit(mockEvent as unknown as Event);

      expect(mockEvent.currentTarget.blur).toHaveBeenCalled();
      expect(component.edit.emit).toHaveBeenCalledWith(mockBirthday);
    });

    it('should blur the button element', () => {
      const mockButton = document.createElement('button');
      spyOn(mockButton, 'blur');
      const mockEvent: MockMouseEvent = { currentTarget: mockButton };

      component.onEdit(mockEvent as unknown as Event);

      expect(mockButton.blur).toHaveBeenCalled();
    });
  });

  describe('onDelete', () => {
    it('should emit deleted event with birthday', () => {
      spyOn(component.deleted, 'emit');

      component.onDelete();

      expect(component.deleted.emit).toHaveBeenCalledWith(mockBirthday);
    });
  });

  describe('onShareRememberPhoto', () => {
    it('should emit shareRememberPhoto event with birthday', () => {
      spyOn(component.shareRememberPhoto, 'emit');

      component.onShareRememberPhoto();

      expect(component.shareRememberPhoto.emit).toHaveBeenCalledWith(mockBirthday);
    });
  });

  describe('onDownloadRememberPhoto', () => {
    it('should emit downloadRememberPhoto event with birthday', () => {
      spyOn(component.downloadRememberPhoto, 'emit');

      component.onDownloadRememberPhoto();

      expect(component.downloadRememberPhoto.emit).toHaveBeenCalledWith(mockBirthday);
    });
  });

  describe('Output events', () => {
    it('should have edit output', () => {
      expect(component.edit).toBeDefined();
    });

    it('should have deleted output', () => {
      expect(component.deleted).toBeDefined();
    });

    it('should have shareRememberPhoto output', () => {
      expect(component.shareRememberPhoto).toBeDefined();
    });

    it('should have downloadRememberPhoto output', () => {
      expect(component.downloadRememberPhoto).toBeDefined();
    });
  });

  describe('daysText and daysChipClass initialization', () => {
    it('should initialize with empty daysText', () => {
      const newComponent = new BirthdayItemComponent();
      expect(newComponent.daysText).toBe('');
    });

    it('should initialize with green-safe daysChipClass', () => {
      const newComponent = new BirthdayItemComponent();
      expect(newComponent.daysChipClass).toBe('green-safe');
    });
  });
});
