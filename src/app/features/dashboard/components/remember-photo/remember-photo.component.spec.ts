import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RememberPhotoComponent } from './remember-photo.component';
import { provideTranslateTesting } from '../../../../../testing/translate-testing';

describe('RememberPhotoComponent', () => {
  let component: RememberPhotoComponent;
  let fixture: ComponentFixture<RememberPhotoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RememberPhotoComponent, NoopAnimationsModule],
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

  describe('Template — @if(photoUrl) guard', () => {
    it('should NOT render the photo div when photoUrl is null', () => {
      component.photoUrl = null;
      fixture.detectChanges();

      const div = fixture.nativeElement.querySelector('.remember-photo-icon');
      expect(div).toBeNull();
    });

    it('should NOT render the photo div when photoUrl is undefined', () => {
      component.photoUrl = undefined;
      fixture.detectChanges();

      const div = fixture.nativeElement.querySelector('.remember-photo-icon');
      expect(div).toBeNull();
    });

    it('should render the photo div when photoUrl is set', () => {
      component.photoUrl = 'https://example.com/photo.jpg';
      fixture.detectChanges();

      const div = fixture.nativeElement.querySelector('.remember-photo-icon');
      expect(div).toBeTruthy();
    });
  });

  describe('Template — img bindings', () => {
    beforeEach(() => {
      component.photoUrl = 'https://example.com/photo.jpg';
      component.birthdayName = 'John Doe';
      fixture.detectChanges();
    });

    it('should bind [src] to photoUrl', () => {
      const img = fixture.nativeElement.querySelector('img.remember-photo-mini') as HTMLImageElement;
      expect(img.src).toBe('https://example.com/photo.jpg');
    });

    it('should bind [alt] to birthdayName + " remember photo"', () => {
      const img = fixture.nativeElement.querySelector('img.remember-photo-mini') as HTMLImageElement;
      expect(img.alt).toBe('John Doe remember photo');
    });
  });

  describe('Template — event bindings', () => {
    beforeEach(() => {
      component.photoUrl = 'https://example.com/photo.jpg';
      fixture.detectChanges();
    });

    it('should call onDownload() on click and emit download event', () => {
      spyOn(component, 'onDownload').and.callThrough();
      spyOn(component.download, 'emit');

      const div = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      div.click();

      expect(component.onDownload).toHaveBeenCalled();
      expect(component.download.emit).toHaveBeenCalled();
    });

    it('should call onShare() on dblclick and emit share event', () => {
      spyOn(component, 'onShare').and.callThrough();
      spyOn(component.share, 'emit');

      const div = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      div.dispatchEvent(new MouseEvent('dblclick'));

      expect(component.onShare).toHaveBeenCalled();
      expect(component.share.emit).toHaveBeenCalled();
    });

    it('should call onDownload() on keydown.enter', () => {
      spyOn(component.download, 'emit');

      const div = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(component.download.emit).toHaveBeenCalled();
    });

    it('should call onDownload() on keydown.space', () => {
      spyOn(component.download, 'emit');

      const div = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      div.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(component.download.emit).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      component.photoUrl = 'https://example.com/photo.jpg';
      fixture.detectChanges();
    });

    it('should have role="button" on the photo div', () => {
      const div = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      expect(div.getAttribute('role')).toBe('button');
    });

    it('should have tabindex="0" on the photo div', () => {
      const div = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      expect(div.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('Component properties', () => {
    it('should have tooltipText defined', () => {
      expect(component.tooltipText).toBe('Remember Photo - Click: Download | Double-click: Share');
    });

    it('should have copyToClipboard event emitter', () => {
      expect(component.copyToClipboard).toBeDefined();
    });
  });
});
