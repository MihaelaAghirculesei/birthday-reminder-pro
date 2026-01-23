import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CategoryDialogComponent } from './category-dialog.component';

describe('CategoryDialogComponent', () => {
  let component: CategoryDialogComponent;
  let fixture: ComponentFixture<CategoryDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<CategoryDialogComponent>>;

  const createComponent = (data: { mode: 'add' | 'edit'; category?: unknown } = { mode: 'add' }) => {
    TestBed.configureTestingModule({
      imports: [CategoryDialogComponent, ReactiveFormsModule, BrowserAnimationsModule],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(CategoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
  });

  describe('Component Creation', () => {
    it('should create', () => {
      createComponent();
      expect(component).toBeTruthy();
    });

    it('should have available icons', () => {
      createComponent();
      expect(component.availableIcons.length).toBeGreaterThan(0);
      expect(component.availableIcons).toContain('favorite');
      expect(component.availableIcons).toContain('star');
      expect(component.availableIcons).toContain('cake');
    });

    it('should have available colors', () => {
      createComponent();
      expect(component.availableColors.length).toBe(16);
      expect(component.availableColors[0]).toEqual({ name: 'Red', value: '#F44336' });
    });
  });

  describe('Constructor - Add Mode', () => {
    it('should initialize form with default values in add mode', () => {
      createComponent({ mode: 'add' });

      expect(component.categoryForm.value).toEqual({
        name: '',
        icon: 'star',
        color: '#2196F3'
      });
    });

    it('should have required validator on name', () => {
      createComponent({ mode: 'add' });

      const nameControl = component.categoryForm.get('name');
      expect(nameControl?.hasError('required')).toBe(true);

      nameControl?.setValue('Test');
      expect(nameControl?.hasError('required')).toBe(false);
    });

    it('should have minLength validator on name', () => {
      createComponent({ mode: 'add' });

      const nameControl = component.categoryForm.get('name');
      nameControl?.setValue('A');
      expect(nameControl?.hasError('minlength')).toBe(true);

      nameControl?.setValue('AB');
      expect(nameControl?.hasError('minlength')).toBe(false);
    });

    it('should have required validator on icon', () => {
      createComponent({ mode: 'add' });

      const iconControl = component.categoryForm.get('icon');
      expect(iconControl?.hasError('required')).toBe(false);

      iconControl?.setValue('');
      expect(iconControl?.hasError('required')).toBe(true);
    });

    it('should have required validator on color', () => {
      createComponent({ mode: 'add' });

      const colorControl = component.categoryForm.get('color');
      expect(colorControl?.hasError('required')).toBe(false);

      colorControl?.setValue('');
      expect(colorControl?.hasError('required')).toBe(true);
    });
  });

  describe('Constructor - Edit Mode', () => {
    it('should initialize form with category data in edit mode', () => {
      const categoryData = {
        mode: 'edit' as const,
        category: {
          id: '1',
          name: 'Family',
          icon: 'favorite',
          color: '#F44336'
        }
      };

      createComponent(categoryData);

      expect(component.categoryForm.value).toEqual({
        name: 'Family',
        icon: 'favorite',
        color: '#F44336'
      });
    });

    it('should handle partial category data', () => {
      const categoryData = {
        mode: 'edit' as const,
        category: {
          id: '1',
          name: 'Friends',
          icon: '',
          color: ''
        }
      };

      createComponent(categoryData);

      expect(component.categoryForm.value).toEqual({
        name: 'Friends',
        icon: 'star',
        color: '#2196F3'
      });
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      createComponent({ mode: 'add' });
    });

    it('should close dialog with form data when form is valid', () => {
      component.categoryForm.setValue({
        name: 'Work',
        icon: 'work',
        color: '#4CAF50'
      });

      component.onSubmit();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        name: 'Work',
        icon: 'work',
        color: '#4CAF50'
      });
    });

    it('should not close dialog when form is invalid', () => {
      component.categoryForm.setValue({
        name: '',
        icon: 'work',
        color: '#4CAF50'
      });

      component.onSubmit();

      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should not close dialog when name is too short', () => {
      component.categoryForm.setValue({
        name: 'A',
        icon: 'work',
        color: '#4CAF50'
      });

      component.onSubmit();

      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('onCancel', () => {
    it('should close dialog without data', () => {
      createComponent({ mode: 'add' });

      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('trackByIndex', () => {
    it('should return index', () => {
      createComponent();

      expect(component.trackByIndex(0)).toBe(0);
      expect(component.trackByIndex(5)).toBe(5);
      expect(component.trackByIndex(10)).toBe(10);
    });
  });

  describe('trackByColorValue', () => {
    beforeEach(() => {
      createComponent();
    });

    it('should return color value', () => {
      const colorOption = { name: 'Red', value: '#F44336' };

      const result = component.trackByColorValue(0, colorOption);

      expect(result).toBe('#F44336');
    });

    it('should return correct value for different colors', () => {
      component.availableColors.forEach((color, index) => {
        const result = component.trackByColorValue(index, color);
        expect(result).toBe(color.value);
      });
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      createComponent({ mode: 'add' });
    });

    it('should mark form as invalid when name is empty', () => {
      component.categoryForm.patchValue({ name: '' });

      expect(component.categoryForm.valid).toBe(false);
    });

    it('should mark form as valid with all required fields', () => {
      component.categoryForm.patchValue({
        name: 'School',
        icon: 'school',
        color: '#673AB7'
      });

      expect(component.categoryForm.valid).toBe(true);
    });

    it('should allow updating individual form fields', () => {
      const nameControl = component.categoryForm.get('name');
      const iconControl = component.categoryForm.get('icon');
      const colorControl = component.categoryForm.get('color');

      nameControl?.setValue('Sports');
      expect(nameControl?.value).toBe('Sports');

      iconControl?.setValue('sports_soccer');
      expect(iconControl?.value).toBe('sports_soccer');

      colorControl?.setValue('#009688');
      expect(colorControl?.value).toBe('#009688');
    });
  });

  describe('Integration - Complete Flows', () => {
    it('should complete add category flow', () => {
      createComponent({ mode: 'add' });

      expect(component.categoryForm.value.name).toBe('');

      component.categoryForm.patchValue({
        name: 'Hobbies',
        icon: 'brush',
        color: '#E91E63'
      });

      expect(component.categoryForm.valid).toBe(true);

      component.onSubmit();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        name: 'Hobbies',
        icon: 'brush',
        color: '#E91E63'
      });
    });

    it('should complete edit category flow', () => {
      const categoryData = {
        mode: 'edit' as const,
        category: {
          id: '1',
          name: 'Travel',
          icon: 'flight',
          color: '#03A9F4'
        }
      };

      createComponent(categoryData);

      expect(component.categoryForm.value.name).toBe('Travel');

      component.categoryForm.patchValue({
        name: 'Travel & Adventure'
      });

      component.onSubmit();

      expect(mockDialogRef.close).toHaveBeenCalledWith({
        name: 'Travel & Adventure',
        icon: 'flight',
        color: '#03A9F4'
      });
    });

    it('should allow cancelling at any time', () => {
      createComponent({ mode: 'add' });

      component.categoryForm.patchValue({
        name: 'Music',
        icon: 'music_note'
      });

      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data object', () => {
      createComponent({ mode: 'add' });

      expect(component.categoryForm.value).toEqual({
        name: '',
        icon: 'star',
        color: '#2196F3'
      });
    });

    it('should handle very long category name', () => {
      createComponent({ mode: 'add' });

      const longName = 'A'.repeat(100);
      component.categoryForm.patchValue({ name: longName });

      expect(component.categoryForm.valid).toBe(true);
      expect(component.categoryForm.get('name')?.value).toBe(longName);
    });

    it('should handle special characters in name', () => {
      createComponent({ mode: 'add' });

      const specialName = 'Friends & Family (2024)';
      component.categoryForm.patchValue({ name: specialName });

      expect(component.categoryForm.valid).toBe(true);
    });
  });
});
