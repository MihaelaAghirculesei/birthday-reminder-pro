import { type ComponentFixture, TestBed } from '@angular/core/testing';
import type { MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../../testing/translate-testing';
import { NotificationService } from '../../core/services/notification.service';
import { PhotoUploadComponent } from './photo-upload.component';

interface MockFileInputTarget {
  files: File[] | null;
}

interface MockFileInputEvent {
  target: MockFileInputTarget;
}

describe('PhotoUploadComponent', () => {
  let component: PhotoUploadComponent;
  let fixture: ComponentFixture<PhotoUploadComponent>;
  let mockNotificationService: MockedObject<NotificationService>;

  beforeEach(async () => {
    mockNotificationService = {
      show: vi.fn().mockName('NotificationService.show')
    } as unknown as MockedObject<NotificationService>;

    await TestBed.configureTestingModule({
      imports: [PhotoUploadComponent],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        provideTranslateTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Template rendering
  // ---------------------------------------------------------------------------

  describe('Template rendering', () => {
    // Use setInput() so OnPush change detection picks up the new value.
    it('should show placeholder and hide photo-display when currentPhoto is null', () => {
      fixture.componentRef.setInput('currentPhoto', null);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.photo-placeholder')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.photo-display')).toBeFalsy();
    });

    it('should show photo-display and hide placeholder when currentPhoto is set', () => {
      fixture.componentRef.setInput('currentPhoto', 'data:image/png;base64,abc123');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.photo-display')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.photo-placeholder')).toBeFalsy();
    });

    it('should render img with correct src when currentPhoto is set', () => {
      fixture.componentRef.setInput('currentPhoto', 'data:image/png;base64,abc123');
      fixture.detectChanges();

      const img: HTMLImageElement = fixture.nativeElement.querySelector('img.contact-photo');
      expect(img).toBeTruthy();
      expect(img.src).toContain('base64,abc123');
    });

    it('should show delete button when currentPhoto is set', () => {
      fixture.componentRef.setInput('currentPhoto', 'data:image/png;base64,abc123');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.delete-button-circle')).toBeTruthy();
    });

    it('should hide delete button when currentPhoto is null', () => {
      fixture.componentRef.setInput('currentPhoto', null);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.delete-button-circle')).toBeFalsy();
    });

    it('should render the photo-preview container with correct a11y attributes', () => {
      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview).toBeTruthy();
      expect(preview.getAttribute('tabindex')).toBe('0');
      expect(preview.getAttribute('role')).toBe('button');
    });

    it('should render a hidden file input accepting images', () => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
      expect(input).toBeTruthy();
      expect(input.accept).toBe('image/*');
      expect(input.style.display).toBe('none');
    });
  });

  // ---------------------------------------------------------------------------
  // triggerFileInput
  // ---------------------------------------------------------------------------

  describe('triggerFileInput', () => {
    it('should click the hidden file input element', () => {
      const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
      vi.spyOn(fileInput, 'click');

      component.triggerFileInput();

      expect(fileInput.click).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onFileSelected
  // ---------------------------------------------------------------------------

  describe('onFileSelected', () => {
    let mockEvent: MockFileInputEvent;
    let mockFile: File;
    let mockFileReader: MockedObject<FileReader>;

    beforeEach(() => {
      mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      mockEvent = { target: { files: [mockFile] } };

      mockFileReader = {
        readAsDataURL: vi.fn().mockName('FileReader.readAsDataURL')
      } as unknown as MockedObject<FileReader>;
      vi.spyOn(window as unknown as {
        FileReader: typeof FileReader;
      }, 'FileReader').mockImplementation(function () {
        return mockFileReader;
      } as unknown as typeof FileReader);
    });

    it('should emit photoSelected with base64 string on successful file read', async () => {
      const base64Data = 'data:image/png;base64,abc123';

      component.photoSelected.subscribe((data: string) => {
        expect(data).toBe(base64Data);
      });

      component.onFileSelected(mockEvent as unknown as Event);

      mockFileReader.onload!({ target: { result: base64Data } } as unknown as ProgressEvent<FileReader>);
    });

    it('should show error and NOT emit when base64 result exceeds 7 MB', () => {
      vi.spyOn(component.photoSelected, 'emit');

      component.onFileSelected(mockEvent as unknown as Event);

      const oversizedBase64 = 'x'.repeat(7000001);
      mockFileReader.onload!({ target: { result: oversizedBase64 } } as unknown as ProgressEvent<FileReader>);

      expect(mockNotificationService.show).toHaveBeenCalledWith('File size must be less than 5MB', 'error');
      expect(component.photoSelected.emit).not.toHaveBeenCalled();
    });

    it('should NOT show error for base64 result exactly at the 7 MB boundary', () => {
      const boundaryBase64 = 'x'.repeat(7000000);
      const selected = vi.fn();

      component.photoSelected.subscribe(selected);

      component.onFileSelected(mockEvent as unknown as Event);

      mockFileReader.onload!({ target: { result: boundaryBase64 } } as unknown as ProgressEvent<FileReader>);

      expect(selected).toHaveBeenCalled();
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('should show error for file size > 5 MB (pre-FileReader guard)', () => {
      const largeMockFile = new File(['a'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeMockFile, 'size', { value: 6 * 1024 * 1024 });
      mockEvent.target.files = [largeMockFile];

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).toHaveBeenCalledWith('File size must be less than 5MB', 'error');
    });

    it('should NOT call readAsDataURL for oversized files', () => {
      const largeMockFile = new File(['a'], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeMockFile, 'size', { value: 6 * 1024 * 1024 });
      mockEvent.target.files = [largeMockFile];

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockFileReader.readAsDataURL).not.toHaveBeenCalled();
    });

    it('should show error for non-image file', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      mockEvent.target.files = [textFile];

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).toHaveBeenCalledWith('Please select a valid image file', 'error');
    });

    it('should accept image/jpeg files without error', async () => {
      const jpegFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockEvent.target.files = [jpegFile];
      const base64Data = 'data:image/jpeg;base64,xyz';

      component.photoSelected.subscribe((data: string) => {
        expect(data).toBe(base64Data);
      });

      component.onFileSelected(mockEvent as unknown as Event);

      mockFileReader.onload!({ target: { result: base64Data } } as unknown as ProgressEvent<FileReader>);

      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('should show error on FileReader read failure', () => {
      component.onFileSelected(mockEvent as unknown as Event);

      mockFileReader.onerror!({} as unknown as ProgressEvent<FileReader>);

      expect(mockNotificationService.show).toHaveBeenCalledWith('Failed to read the selected file. Please try again.', 'error');
    });

    it('should not process if file list is empty', () => {
      mockEvent.target.files = [];

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).not.toHaveBeenCalled();
      expect(mockFileReader.readAsDataURL).not.toHaveBeenCalled();
    });

    it('should not process if files is null', () => {
      mockEvent.target.files = null;

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).not.toHaveBeenCalled();
      expect(mockFileReader.readAsDataURL).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // removePhoto
  // ---------------------------------------------------------------------------

  describe('removePhoto', () => {
    it('should emit photoRemoved event', () => {
      vi.spyOn(component.photoRemoved, 'emit');
      const mockEvent = new Event('click');

      component.removePhoto(mockEvent);

      expect(component.photoRemoved.emit).toHaveBeenCalled();
    });

    it('should stop event propagation to prevent triggering triggerFileInput', () => {
      const mockEvent = new Event('click');
      vi.spyOn(mockEvent, 'stopPropagation');

      component.removePhoto(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  describe('accessibility', () => {
    it('should have role="button" on the photo preview div', () => {
      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.getAttribute('role')).toBe('button');
    });

    it('should have tabindex="0" on the photo preview div', () => {
      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.getAttribute('tabindex')).toBe('0');
    });

    // WCAG 2.5.3 (Label in Name): the button is named by its visible text,
    // so an aria-label would only risk diverging from what users see.
    it('should not override the visible text with an aria-label', () => {
      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.hasAttribute('aria-label')).toBe(false);
    });

    it('should expose the add-photo text when no photo is set', () => {
      fixture.componentRef.setInput('currentPhoto', null);
      fixture.detectChanges();
      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.textContent).toContain('Add Remember Photo');
    });

    it('should expose the change-photo text when a photo is set', () => {
      fixture.componentRef.setInput('currentPhoto', 'data:image/png;base64,test');
      fixture.detectChanges();
      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.textContent).toContain('Change Photo');
      expect(preview.hasAttribute('aria-label')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // disabled input
  // ---------------------------------------------------------------------------

  describe('disabled input', () => {
    it('should not trigger file input when disabled', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
      vi.spyOn(fileInput, 'click');

      component.triggerFileInput();

      expect(fileInput.click).not.toHaveBeenCalled();
    });

    it('should trigger file input when not disabled', () => {
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
      vi.spyOn(fileInput, 'click');

      component.triggerFileInput();

      expect(fileInput.click).toHaveBeenCalled();
    });

    it('should not emit photoRemoved when disabled', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      vi.spyOn(component.photoRemoved, 'emit');

      component.removePhoto(new Event('click'));

      expect(component.photoRemoved.emit).not.toHaveBeenCalled();
    });

    it('should apply upload-disabled class when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.classList).toContain('upload-disabled');
    });

    it('should not apply upload-disabled class when disabled is false', () => {
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.classList).not.toContain('upload-disabled');
    });

    it('should set aria-disabled when disabled is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.getAttribute('aria-disabled')).toBe('true');
    });

    it('should set tabindex to -1 when disabled', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const preview: HTMLElement = fixture.nativeElement.querySelector('.photo-preview');
      expect(preview.getAttribute('tabindex')).toBe('-1');
    });
  });

  // ---------------------------------------------------------------------------
  // Input / Output bindings
  // ---------------------------------------------------------------------------

  describe('Input/Output bindings', () => {
    it('should accept a data URL as currentPhoto', () => {
      const photoUrl = 'data:image/png;base64,test';
      component.currentPhoto = photoUrl;
      expect(component.currentPhoto).toBe(photoUrl);
    });

    it('should accept null for currentPhoto (no photo state)', () => {
      component.currentPhoto = null;
      expect(component.currentPhoto).toBeNull();
    });

    it('should expose a photoSelected EventEmitter', () => {
      expect(component.photoSelected).toBeDefined();
      expect(component.photoSelected.emit).toBeDefined();
    });

    it('should expose a photoRemoved EventEmitter', () => {
      expect(component.photoRemoved).toBeDefined();
      expect(component.photoRemoved.emit).toBeDefined();
    });
  });
});
