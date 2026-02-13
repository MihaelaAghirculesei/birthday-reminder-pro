import { MatDialogRef } from '@angular/material/dialog';
import { BirthdayEditDialogComponent, BirthdayEditDialogData } from './birthday-edit-dialog.component';
import { Birthday, BirthdayCategory } from '../../../../shared';

describe('BirthdayEditDialogComponent', () => {
  let component: BirthdayEditDialogComponent;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BirthdayEditDialogComponent>>;

  const mockBirthday: Birthday = {
    id: '1',
    name: 'John Doe',
    birthDate: new Date(1990, 0, 15),
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

    it('should format birthDate for input', () => {
      expect(component.editingData.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(component.editingData.birthDate).toContain('1990');
      expect(component.editingData.birthDate).toContain('01');
      expect(component.editingData.birthDate).toContain('15');
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
