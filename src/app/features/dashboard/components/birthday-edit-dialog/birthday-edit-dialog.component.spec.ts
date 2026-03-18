import { MatDialogRef } from '@angular/material/dialog';
import { BirthdayEditDialogComponent, BirthdayEditDialogData } from './birthday-edit-dialog.component';
import { Birthday, BirthdayCategory } from '../../../../shared';

describe('BirthdayEditDialogComponent', () => {
  let component: BirthdayEditDialogComponent;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BirthdayEditDialogComponent>>;

  const mockBirthday: Birthday = {
    id: '1',
    name: 'John Doe',
    birthDate: '1990-01-15',
    category: 'friends',
    zodiacSign: 'Capricorn',
    reminderDays: 7,
    notes: 'Test notes',
    photo: 'photo.jpg',
    rememberPhoto: 'remember.jpg',
    email: 'john@example.com',
    phone: '+1234567890',
    telegramUsername: 'johndoe',
    scheduledMessages: []
  };

  const mockCategories: BirthdayCategory[] = [
    { id: 'friends', name: 'Friends', icon: 'group', color: '#4CAF50' },
    { id: 'family', name: 'Family', icon: 'family_restroom', color: '#2196F3' }
  ];

  const mockDialogData: BirthdayEditDialogData = {
    birthday: mockBirthday,
    categories: mockCategories
  };

  beforeEach(() => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    component = new BirthdayEditDialogComponent(dialogRefSpy, mockDialogData);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with birthday data', () => {
      expect(component.editedBirthday).toEqual(mockBirthday);
    });

    it('should initialize editing data with birthday values', () => {
      expect(component.editingData.name).toBe('John Doe');
      expect(component.editingData.notes).toBe('Test notes');
      expect(component.editingData.category).toBe('friends');
      expect(component.editingData.photo).toBe('photo.jpg');
      expect(component.editingData.rememberPhoto).toBe('remember.jpg');
    });

    it('should use birthDate string directly', () => {
      expect(component.editingData.birthDate).toBe('1990-01-15');
    });

    it('should use empty string for missing notes', () => {
      const birthdayWithoutNotes = { ...mockBirthday, notes: undefined };
      const dataWithoutNotes = { birthday: birthdayWithoutNotes, categories: mockCategories };
      const newComponent = new BirthdayEditDialogComponent(dialogRefSpy, dataWithoutNotes);

      expect(newComponent.editingData.notes).toBe('');
    });

    it('should use empty string for missing category', () => {
      const birthdayWithoutCategory = { ...mockBirthday, category: undefined };
      const dataWithoutCategory = { birthday: birthdayWithoutCategory, categories: mockCategories };
      const newComponent = new BirthdayEditDialogComponent(dialogRefSpy, dataWithoutCategory);

      expect(newComponent.editingData.category).toBe('');
    });

    it('should use null for missing photos', () => {
      const birthdayWithoutPhotos = { ...mockBirthday, photo: undefined, rememberPhoto: undefined };
      const dataWithoutPhotos = { birthday: birthdayWithoutPhotos, categories: mockCategories };
      const newComponent = new BirthdayEditDialogComponent(dialogRefSpy, dataWithoutPhotos);

      expect(newComponent.editingData.photo).toBeNull();
      expect(newComponent.editingData.rememberPhoto).toBeNull();
    });
  });

  describe('Photo handling', () => {
    it('should update photo when selected', () => {
      const photoData = 'data:image/png;base64,abc123';
      component.onPhotoSelected(photoData);

      expect(component.editingData.photo).toBe(photoData);
    });

    it('should remove photo', () => {
      component.onPhotoRemoved();

      expect(component.editingData.photo).toBeNull();
    });

    it('should update remember photo when selected', () => {
      const photoData = 'data:image/png;base64,xyz789';
      component.onRememberPhotoSelected(photoData);

      expect(component.editingData.rememberPhoto).toBe(photoData);
    });

    it('should remove remember photo', () => {
      component.onRememberPhotoRemoved();

      expect(component.editingData.rememberPhoto).toBeNull();
    });
  });

  describe('Dialog actions', () => {
    it('should close dialog on cancel', () => {
      component.onCancel();

      expect(dialogRefSpy.close).toHaveBeenCalledWith();
    });

    it('should close dialog on escape key', () => {
      component.handleEscapeKey();

      expect(dialogRefSpy.close).toHaveBeenCalledWith();
    });

    it('should close dialog with result on save', () => {
      component.onSave();

      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        birthday: mockBirthday,
        editedData: component.editingData
      });
    });

    it('should allow saving without any contact info', () => {
      component.editingData.email = '';
      component.editingData.phone = '';
      component.editingData.telegramUsername = '';

      component.onSave();

      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        birthday: mockBirthday,
        editedData: component.editingData
      });
    });

    it('should include all edited data when saving', () => {
      component.editingData.name = 'Updated Name';
      component.editingData.notes = 'Updated notes';
      component.editingData.category = 'family';

      component.onSave();

      const callArgs = dialogRefSpy.close.calls.first().args[0];
      expect(callArgs.editedData.name).toBe('Updated Name');
      expect(callArgs.editedData.notes).toBe('Updated notes');
      expect(callArgs.editedData.category).toBe('family');
    });
  });

  describe('Contact warning', () => {
    it('should not show warning on init when contact info exists', () => {
      expect(component.contactWarning).toBeFalse();
    });

    it('should show warning on init when no contact info exists', () => {
      const noContactBirthday = { ...mockBirthday, email: '', phone: '', telegramUsername: '' };
      const data = { birthday: noContactBirthday, categories: mockCategories };
      const comp = new BirthdayEditDialogComponent(dialogRefSpy, data);

      expect(comp.contactWarning).toBeTrue();
    });

    it('should show warning when all contact fields are cleared', () => {
      component.editingData.email = '';
      component.editingData.phone = '';
      component.editingData.telegramUsername = '';
      component.onContactChange();

      expect(component.contactWarning).toBeTrue();
    });

    it('should hide warning when a contact field is filled', () => {
      component.editingData.email = '';
      component.editingData.phone = '';
      component.editingData.telegramUsername = '';
      component.onContactChange();
      expect(component.contactWarning).toBeTrue();

      component.editingData.phone = '+123';
      component.onContactChange();
      expect(component.contactWarning).toBeFalse();
    });
  });

  describe('Email validation', () => {
    it('should accept valid emails', () => {
      component.editingData.email = 'user@example.com';
      expect(component.isEmailValid()).toBeTrue();

      component.editingData.email = 'first.last+tag@domain.co.uk';
      expect(component.isEmailValid()).toBeTrue();
    });

    it('should accept empty email', () => {
      component.editingData.email = '';
      expect(component.isEmailValid()).toBeTrue();
    });

    it('should reject invalid emails', () => {
      component.editingData.email = 'notanemail';
      expect(component.isEmailValid()).toBeFalse();

      component.editingData.email = 'missing@domain';
      expect(component.isEmailValid()).toBeFalse();

      component.editingData.email = '@nodomain.com';
      expect(component.isEmailValid()).toBeFalse();
    });

    it('should block saving when email is invalid', () => {
      component.editingData.email = 'invalid';

      component.onSave();

      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('Telegram validation', () => {
    it('should accept valid usernames', () => {
      component.editingData.telegramUsername = 'johndoe';
      expect(component.isTelegramValid()).toBeTrue();

      component.editingData.telegramUsername = 'user_123';
      expect(component.isTelegramValid()).toBeTrue();
    });

    it('should accept empty username', () => {
      component.editingData.telegramUsername = '';
      expect(component.isTelegramValid()).toBeTrue();
    });

    it('should reject username starting with a number', () => {
      component.editingData.telegramUsername = '12345';
      expect(component.isTelegramValid()).toBeFalse();

      component.editingData.telegramUsername = '1user';
      expect(component.isTelegramValid()).toBeFalse();
    });

    it('should reject username shorter than 5 characters', () => {
      component.editingData.telegramUsername = 'abcd';
      expect(component.isTelegramValid()).toBeFalse();
    });

    it('should reject invalid usernames', () => {
      component.editingData.telegramUsername = 'user name';
      expect(component.isTelegramValid()).toBeFalse();

      component.editingData.telegramUsername = 'user@name';
      expect(component.isTelegramValid()).toBeFalse();
    });

    it('should block saving when telegram is invalid', () => {
      component.editingData.telegramUsername = '123';

      component.onSave();

      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('Phone validation', () => {
    it('should accept valid phone numbers', () => {
      component.editingData.phone = '+39 333 1234567';
      expect(component.isPhoneValid()).toBeTrue();

      component.editingData.phone = '(02) 1234-5678';
      expect(component.isPhoneValid()).toBeTrue();

      component.editingData.phone = '+1234567890';
      expect(component.isPhoneValid()).toBeTrue();
    });

    it('should accept empty phone', () => {
      component.editingData.phone = '';
      expect(component.isPhoneValid()).toBeTrue();
    });

    it('should reject phone with letters', () => {
      component.editingData.phone = 'abc123';
      expect(component.isPhoneValid()).toBeFalse();

      component.editingData.phone = '+39 test';
      expect(component.isPhoneValid()).toBeFalse();
    });

    it('should block saving when phone is invalid', () => {
      component.editingData.phone = 'invalid';

      component.onSave();

      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('should allow saving when phone is valid', () => {
      component.editingData.phone = '+39 333 123';

      component.onSave();

      expect(dialogRefSpy.close).toHaveBeenCalled();
    });
  });

  describe('Data mutations', () => {
    it('should not mutate original birthday data', () => {
      const originalBirthday = { ...mockBirthday };
      component.editingData.name = 'Changed Name';

      expect(mockBirthday.name).toBe(originalBirthday.name);
    });

    it('should create independent copy of birthday', () => {
      expect(component.editedBirthday).not.toBe(mockBirthday);
      expect(component.editedBirthday).toEqual(mockBirthday);
    });
  });
});
