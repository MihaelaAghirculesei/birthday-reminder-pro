import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';
import { BirthdayEditService } from './birthday-edit.service';

describe('BirthdayEditService', () => {
  let service: BirthdayEditService;

  const mockBirthday = createMockBirthday({
    id: '1',
    name: 'John Doe',
    birthDate: '1990-01-15',
    category: 'friends',
    photo: 'photo.jpg',
    rememberPhoto: 'remember.jpg',
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateTesting()] });
    service = TestBed.inject(BirthdayEditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Observables', () => {
    it('should have editingBirthdayId$ observable', (done) => {
      service.editingBirthdayId$.subscribe(id => {
        expect(id).toBeNull();
        done();
      });
    });

    it('should have editingBirthdayData$ observable', (done) => {
      service.editingBirthdayData$.subscribe(data => {
        expect(data).toBeNull();
        done();
      });
    });
  });

  describe('currentEditingId', () => {
    it('should return null initially', () => {
      expect(service.currentEditingId).toBeNull();
    });

    it('should return current editing ID after startEdit', () => {
      service.startEdit(mockBirthday, 'friends');
      expect(service.currentEditingId).toBe('1');
    });
  });

  describe('currentEditingData', () => {
    it('should return null initially', () => {
      expect(service.currentEditingData).toBeNull();
    });

    it('should return current editing data after startEdit', () => {
      service.startEdit(mockBirthday, 'friends');
      const data = service.currentEditingData;
      expect(data).toBeTruthy();
      expect(data?.name).toBe('John Doe');
      expect(data?.notes).toBe('Test notes');
    });
  });

  describe('startEdit', () => {
    it('should set editing birthday ID', (done) => {
      service.startEdit(mockBirthday, 'friends');

      service.editingBirthdayId$.subscribe(id => {
        expect(id).toBe('1');
        done();
      });
    });

    it('should set editing birthday data with correct values', () => {
      service.startEdit(mockBirthday, 'friends');

      const data = service.currentEditingData;
      expect(data?.name).toBe('John Doe');
      expect(data?.notes).toBe('Test notes');
      expect(data?.category).toBe('friends');
      expect(data?.photo).toBe('photo.jpg');
      expect(data?.rememberPhoto).toBe('remember.jpg');
    });

    it('should use birthDate string directly', () => {
      service.startEdit(mockBirthday, 'friends');

      const data = service.currentEditingData;
      expect(data?.birthDate).toBe('1990-01-15');
    });

    it('should use empty string for missing notes', () => {
      const birthdayWithoutNotes = { ...mockBirthday, notes: undefined };
      service.startEdit(birthdayWithoutNotes, 'friends');

      const data = service.currentEditingData;
      expect(data?.notes).toBe('');
    });

    it('should use default category when birthday has no category', () => {
      const birthdayWithoutCategory = { ...mockBirthday, category: undefined };
      service.startEdit(birthdayWithoutCategory, 'family');

      const data = service.currentEditingData;
      expect(data?.category).toBe('family');
    });

    it('should cancel previous edit when starting new edit', () => {
      const birthday2 = { ...mockBirthday, id: '2', name: 'Jane Doe' };

      service.startEdit(mockBirthday, 'friends');
      expect(service.currentEditingId).toBe('1');

      service.startEdit(birthday2, 'friends');
      expect(service.currentEditingId).toBe('2');
      expect(service.currentEditingData?.name).toBe('Jane Doe');
    });

    it('should not cancel edit when starting same birthday', () => {
      service.startEdit(mockBirthday, 'friends');

      service.startEdit(mockBirthday, 'friends');
      expect(service.currentEditingId).toBe('1');
    });
  });

  describe('updateEditingData', () => {
    beforeEach(() => {
      service.startEdit(mockBirthday, 'friends');
    });

    it('should update name', () => {
      service.updateEditingData({ name: 'Updated Name' });
      expect(service.currentEditingData?.name).toBe('Updated Name');
    });

    it('should update notes', () => {
      service.updateEditingData({ notes: 'Updated notes' });
      expect(service.currentEditingData?.notes).toBe('Updated notes');
    });

    it('should update category', () => {
      service.updateEditingData({ category: 'family' });
      expect(service.currentEditingData?.category).toBe('family');
    });

    it('should update multiple fields at once', () => {
      service.updateEditingData({
        name: 'New Name',
        notes: 'New notes',
        category: 'work'
      });

      const data = service.currentEditingData;
      expect(data?.name).toBe('New Name');
      expect(data?.notes).toBe('New notes');
      expect(data?.category).toBe('work');
    });

    it('should not update if no data is being edited', () => {
      service.cancelEdit();
      service.updateEditingData({ name: 'Should not update' });
      expect(service.currentEditingData).toBeNull();
    });

    it('should preserve unmodified fields', () => {
      service.updateEditingData({ name: 'Updated Name' });
      const data = service.currentEditingData;
      expect(data?.notes).toBe('Test notes'); 
      expect(data?.category).toBe('friends'); 
    });
  });

  describe('cancelEdit', () => {
    beforeEach(() => {
      service.startEdit(mockBirthday, 'friends');
    });

    it('should clear editing birthday ID', () => {
      service.cancelEdit();
      expect(service.currentEditingId).toBeNull();
    });

    it('should clear editing birthday data', () => {
      service.cancelEdit();
      expect(service.currentEditingData).toBeNull();
    });

    it('should emit null for observables', (done) => {
      service.cancelEdit();

      service.editingBirthdayId$.subscribe(id => {
        expect(id).toBeNull();
      });

      service.editingBirthdayData$.subscribe(data => {
        expect(data).toBeNull();
        done();
      });
    });
  });

  describe('isEditing', () => {
    it('should return false when nothing is being edited', () => {
      expect(service.isEditing('1')).toBe(false);
    });

    it('should return true for currently editing birthday', () => {
      service.startEdit(mockBirthday, 'friends');
      expect(service.isEditing('1')).toBe(true);
    });

    it('should return false for different birthday ID', () => {
      service.startEdit(mockBirthday, 'friends');
      expect(service.isEditing('2')).toBe(false);
    });

    it('should return false after cancel', () => {
      service.startEdit(mockBirthday, 'friends');
      service.cancelEdit();
      expect(service.isEditing('1')).toBe(false);
    });
  });

  describe('scheduleAutoSave', () => {
    it('should call callback after debounce delay', fakeAsync(() => {
      const callback = jasmine.createSpy('callback');
      service.scheduleAutoSave(callback);
      tick(1999);
      expect(callback).not.toHaveBeenCalled();
      tick(1);
      expect(callback).toHaveBeenCalledTimes(1);
    }));

    it('should debounce multiple calls and only execute the last', fakeAsync(() => {
      const callback1 = jasmine.createSpy('callback1');
      const callback2 = jasmine.createSpy('callback2');

      service.scheduleAutoSave(callback1);
      tick(500);
      service.scheduleAutoSave(callback2);
      tick(2000);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
    }));
  });
});
