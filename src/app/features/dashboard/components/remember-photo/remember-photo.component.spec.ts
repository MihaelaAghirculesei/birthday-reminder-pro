import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RememberPhotoComponent } from './remember-photo.component';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';

describe('RememberPhotoComponent', () => {
  let component: RememberPhotoComponent;
  let fixture: ComponentFixture<RememberPhotoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RememberPhotoComponent],
      providers: [provideTranslateTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(RememberPhotoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Inputs', () => {
    it('should accept photoUrl input', () => {
      component.photoUrl = 'https://example.com/photo.jpg';
      expect(component.photoUrl).toBe('https://example.com/photo.jpg');
    });

    it('should accept null photoUrl', () => {
      component.photoUrl = null;
      expect(component.photoUrl).toBeNull();
    });

    it('should accept birthdayName input', () => {
      component.birthdayName = 'John Doe';
      expect(component.birthdayName).toBe('John Doe');
    });

    it('should have default empty birthdayName', () => {
      expect(component.birthdayName).toBe('');
    });
  });

  describe('Event Emitters', () => {
    it('should emit share event when onShare is called', (done) => {
      component.share.subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      component.onShare();
    });

    it('should emit download event when onDownload is called', (done) => {
      component.download.subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      component.onDownload();
    });

    it('should have copyToClipboard event emitter', () => {
      expect(component.copyToClipboard).toBeDefined();
    });
  });

  describe('Component properties', () => {
    it('should have tooltipText defined', () => {
      expect(component.tooltipText).toBe('Remember Photo - Click: Download | Double-click: Share');
    });
  });
});
