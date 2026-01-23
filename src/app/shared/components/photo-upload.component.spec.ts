import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PhotoUploadComponent } from './photo-upload.component';
import { NotificationService } from '../../core/services/notification.service';

interface MockFileInputTarget {
  files: File[] | null;
}

interface MockFileInputEvent {
  target: MockFileInputTarget;
}

describe('PhotoUploadComponent', () => {
  let component: PhotoUploadComponent;
  let fixture: ComponentFixture<PhotoUploadComponent>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['show']);

    await TestBed.configureTestingModule({
      imports: [PhotoUploadComponent],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('triggerFileInput', () => {
    it('should trigger file input click', () => {
      const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
      spyOn(fileInput, 'click');

      component.triggerFileInput();

      expect(fileInput.click).toHaveBeenCalled();
    });
  });

  describe('onFileSelected', () => {
    let mockEvent: MockFileInputEvent;
    let mockFile: File;
    let mockFileReader: jasmine.SpyObj<FileReader>;

    beforeEach(() => {
      mockFile = new File(['test'], 'test.png', { type: 'image/png' });
      mockEvent = {
        target: {
          files: [mockFile]
        }
      };

      mockFileReader = jasmine.createSpyObj('FileReader', ['readAsDataURL']);
      spyOn(window as unknown as { FileReader: typeof FileReader }, 'FileReader').and.returnValue(mockFileReader);
    });

    it('should emit photoSelected with base64 string on successful file read', (done) => {
      const base64Data = 'data:image/png;base64,abc123';

      component.photoSelected.subscribe((data: string) => {
        expect(data).toBe(base64Data);
        done();
      });

      component.onFileSelected(mockEvent as unknown as Event);

      mockFileReader.onload!({ target: { result: base64Data } } as unknown as ProgressEvent<FileReader>);
    });

    it('should show error for file size > 5MB', () => {
      const largeMockFile = new File(['a'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });
      Object.defineProperty(largeMockFile, 'size', { value: 6 * 1024 * 1024 });

      mockEvent.target.files = [largeMockFile];

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        'File size must be less than 5MB',
        'error'
      );
    });

    it('should show error for non-image file', () => {
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      mockEvent.target.files = [textFile];

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        'Please select a valid image file',
        'error'
      );
    });

    it('should show error on file read error', () => {
      component.onFileSelected(mockEvent as unknown as Event);

      mockFileReader.onerror!({} as unknown as ProgressEvent<FileReader>);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        'Failed to read the selected file. Please try again.',
        'error'
      );
    });

    it('should not process if no files selected', () => {
      mockEvent.target.files = [];

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('should not process if files is null', () => {
      mockEvent.target.files = null;

      component.onFileSelected(mockEvent as unknown as Event);

      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });
  });

  describe('removePhoto', () => {
    it('should emit photoRemoved event', () => {
      spyOn(component.photoRemoved, 'emit');
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');

      component.removePhoto(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(component.photoRemoved.emit).toHaveBeenCalled();
    });

    it('should stop event propagation', () => {
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');

      component.removePhoto(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Input/Output bindings', () => {
    it('should have currentPhoto input', () => {
      component.currentPhoto = 'data:image/png;base64,test';
      fixture.detectChanges();

      expect(component.currentPhoto).toBe('data:image/png;base64,test');
    });

    it('should accept photo data URL', () => {
      const photoUrl = 'data:image/png;base64,test';
      component.currentPhoto = photoUrl;
      expect(component.currentPhoto).toBe(photoUrl);
    });

    it('should accept null for no photo', () => {
      component.currentPhoto = null;
      expect(component.currentPhoto).toBeNull();
    });

    it('should have photoSelected emitter', () => {
      expect(component.photoSelected).toBeDefined();
      expect(component.photoSelected.emit).toBeDefined();
    });

    it('should have photoRemoved emitter', () => {
      expect(component.photoRemoved).toBeDefined();
      expect(component.photoRemoved.emit).toBeDefined();
    });
  });
});
