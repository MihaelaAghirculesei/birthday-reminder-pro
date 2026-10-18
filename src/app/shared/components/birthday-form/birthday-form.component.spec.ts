import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatNativeDateModule } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import type { Mock, MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { LoggerService, SILENT_LOGGER_PROVIDER } from '../../../core';
import { FirebaseAuthService } from '../../../core/services/firebase-auth.service';
import { PhotoStorageService } from '../../../core/services/photo-storage.service';
import { BIRTHDAY_CATEGORIES, DEFAULT_CATEGORY } from '../../constants';
import { type Birthday } from '../../models';
import { BirthdayFormComponent } from './birthday-form.component';

describe('BirthdayFormComponent', () => {
  let component: BirthdayFormComponent;
  let fixture: ComponentFixture<BirthdayFormComponent>;
  let photoStorageSpy: MockedObject<PhotoStorageService>;
  let authServiceStub: {
    currentUser: {
      uid: string;
    } | null;
  };

  beforeEach(async () => {
    photoStorageSpy = {
      uploadPhoto: vi.fn().mockName('PhotoStorageService.uploadPhoto')
    } as unknown as MockedObject<PhotoStorageService>;
    authServiceStub = { currentUser: null };

    await TestBed.configureTestingModule({
      imports: [BirthdayFormComponent, NoopAnimationsModule, MatNativeDateModule],
      providers: [
        SILENT_LOGGER_PROVIDER,
        provideTranslateTesting(),
        { provide: PhotoStorageService, useValue: photoStorageSpy },
        { provide: FirebaseAuthService, useValue: authServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BirthdayFormComponent);
    component = fixture.componentInstance;
    component.categories = BIRTHDAY_CATEGORIES;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form defaults', () => {
    it('should initialize name as empty', () => {
      expect(component.birthdayForm.get('name')?.value).toBe('');
    });

    it('should initialize birthDate as empty', () => {
      expect(component.birthdayForm.get('birthDate')?.value).toBe('');
    });

    it('should initialize category to default', () => {
      expect(component.birthdayForm.get('category')?.value).toBe(DEFAULT_CATEGORY);
    });

    it('should initialize reminderDays to 7', () => {
      expect(component.birthdayForm.get('reminderDays')?.value).toBe(7);
    });

    it('should initialize selectedPhoto as null', () => {
      expect(component.selectedPhoto).toBeNull();
    });
  });

  describe('validation', () => {
    it('should require name', () => {
      component.birthdayForm.get('name')?.setValue('');
      expect(component.birthdayForm.get('name')?.hasError('required')).toBe(true);
    });

    it('should enforce name minLength of 2', () => {
      component.birthdayForm.get('name')?.setValue('A');
      expect(component.birthdayForm.get('name')?.hasError('minlength')).toBe(true);
    });

    it('should enforce name maxLength of 50', () => {
      component.birthdayForm.get('name')?.setValue('A'.repeat(51));
      expect(component.birthdayForm.get('name')?.hasError('maxlength')).toBe(true);
    });

    it('should require birthDate', () => {
      component.birthdayForm.get('birthDate')?.setValue('');
      expect(component.birthdayForm.get('birthDate')?.hasError('required')).toBe(true);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      component.birthdayForm.get('birthDate')?.setValue(futureDate);
      expect(component.birthdayForm.get('birthDate')?.hasError('futureDate')).toBe(true);
    });

    it('should accept past dates', () => {
      const pastDate = new Date(2000, 0, 1);
      component.birthdayForm.get('birthDate')?.setValue(pastDate);
      expect(component.birthdayForm.get('birthDate')?.hasError('futureDate')).toBe(false);
    });

    it('should enforce reminderDays min of 1', () => {
      component.birthdayForm.get('reminderDays')?.setValue(0);
      expect(component.birthdayForm.get('reminderDays')?.hasError('min')).toBe(true);
    });

    it('should enforce reminderDays max of 365', () => {
      component.birthdayForm.get('reminderDays')?.setValue(366);
      expect(component.birthdayForm.get('reminderDays')?.hasError('max')).toBe(true);
    });
  });

  describe('photo handling', () => {
    it('should set selectedPhoto on onPhotoSelected', () => {
      component.onPhotoSelected('data:image/png;base64,abc');
      expect(component.selectedPhoto).toBe('data:image/png;base64,abc');
    });

    it('should patch form photo on onPhotoSelected', () => {
      component.onPhotoSelected('data:image/png;base64,abc');
      expect(component.birthdayForm.get('photo')?.value).toBe('data:image/png;base64,abc');
    });

    it('should clear selectedPhoto on onPhotoRemoved', () => {
      component.selectedPhoto = 'data:image/png;base64,abc';
      component.onPhotoRemoved();
      expect(component.selectedPhoto).toBeNull();
    });

    it('should clear form photo on onPhotoRemoved', () => {
      component.birthdayForm.patchValue({ photo: 'data:image/png;base64,abc' });
      component.onPhotoRemoved();
      expect(component.birthdayForm.get('photo')?.value).toBeNull();
    });

    it('should store the file reference on onFileSelected', () => {
      const mockFile = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      expect(() => component.onFileSelected(mockFile)).not.toThrow();
    });
  });

  describe('onSubmit', () => {
    function fillValidForm(): void {
      component.birthdayForm.patchValue({
        name: 'John Doe',
        birthDate: new Date(1990, 5, 15),
        category: 'friends',
        notes: 'A note',
        reminderDays: 7,
      });
    }

    it('should emit birthdaySubmitted with valid form data', async () => {
      fillValidForm();
      vi.spyOn(component.birthdaySubmitted, 'emit');

      await component.onSubmit();

      expect(component.birthdaySubmitted.emit).toHaveBeenCalledTimes(1);
      const emitted = vi.mocked((component.birthdaySubmitted.emit as Mock)).mock.calls[0][0] as Omit<Birthday, 'id'>;
      expect(emitted['name']).toBe('John Doe');
      expect(emitted['birthDate']).toBe('1990-06-15');
    });

    it('should reset form after successful submit', async () => {
      fillValidForm();
      vi.spyOn(component.birthdaySubmitted, 'emit');

      await component.onSubmit();

      expect(component.birthdayForm.get('name')?.value).toBeFalsy();
      expect(component.birthdayForm.get('reminderDays')?.value).toBe(7);
      expect(component.birthdayForm.get('category')?.value).toBe(DEFAULT_CATEGORY);
    });

    it('should clear selectedPhoto after successful submit', async () => {
      fillValidForm();
      component.selectedPhoto = 'data:image/png;base64,abc';
      vi.spyOn(component.birthdaySubmitted, 'emit');

      await component.onSubmit();

      expect(component.selectedPhoto).toBeNull();
    });

    it('should not emit when form is invalid', async () => {
      vi.spyOn(component.birthdaySubmitted, 'emit');

      await component.onSubmit();

      expect(component.birthdaySubmitted.emit).not.toHaveBeenCalled();
    });

    it('should not submit when isSubmitting is true', async () => {
      fillValidForm();
      vi.spyOn(component.birthdaySubmitted, 'emit');
      component.isSubmitting.set(true);

      await component.onSubmit();

      expect(component.birthdaySubmitted.emit).not.toHaveBeenCalled();
    });

    it('should upload photo via PhotoStorageService for authenticated users', async () => {
      fillValidForm();
      const mockFile = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      const cdnUrl = 'https://cdn.example.com/photo.jpg';
      authServiceStub.currentUser = { uid: 'user-123' };
      photoStorageSpy.uploadPhoto.mockReturnValue(Promise.resolve(cdnUrl));
      component.onFileSelected(mockFile);
      component.selectedPhoto = 'data:image/png;base64,abc';
      vi.spyOn(component.birthdaySubmitted, 'emit');

      await component.onSubmit();

      expect(photoStorageSpy.uploadPhoto).toHaveBeenCalledWith(mockFile, 'user-123', 'photo');
      expect(component.birthdaySubmitted.emit).toHaveBeenCalledTimes(1);
    });

    it('should keep base64 photo for anonymous users without uploading', async () => {
      fillValidForm();
      const mockFile = new File([''], 'photo.jpg', { type: 'image/jpeg' });
      authServiceStub.currentUser = null;
      component.onFileSelected(mockFile);
      component.selectedPhoto = 'data:image/png;base64,abc';
      vi.spyOn(component.birthdaySubmitted, 'emit');

      await component.onSubmit();

      expect(photoStorageSpy.uploadPhoto).not.toHaveBeenCalled();
      expect(component.birthdaySubmitted.emit).toHaveBeenCalledTimes(1);
    });

    it('should log error and not emit when Zod validation fails', async () => {
      const logger = TestBed.inject(LoggerService);
      vi.spyOn(logger, 'error');
      vi.spyOn(component.birthdaySubmitted, 'emit');
      // '  ' passes Angular validators (required + minLength(2)) but
      // fails Zod's trim().min(1) — triggering the !result.success branch.
      component.birthdayForm.patchValue({
        name: '  ',
        birthDate: new Date(1990, 5, 15),
        category: 'friends',
        reminderDays: 7,
      });

      await component.onSubmit();

      expect(logger.error).toHaveBeenCalled();
      expect(component.birthdaySubmitted.emit).not.toHaveBeenCalled();
    });
  });

  describe('trackByCategory', () => {
    it('should return category id', () => {
      const category = { id: 'test-id', name: 'Test', icon: 'star', color: '#000' };
      expect(component.trackByCategory(0, category)).toBe('test-id');
    });
  });
});
