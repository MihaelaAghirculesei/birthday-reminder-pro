import { ChangeDetectorRef } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { provideTranslateTesting } from '../../../../../testing/translate-testing';
import { RememberPhotoComponent } from './remember-photo.component';

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
      expect(component.tooltipText).toBeTruthy();
    });
  });

  describe('Template rendering', () => {
    it('should not render the icon container when photoUrl is null', () => {
      component.photoUrl = null;
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.remember-photo-icon');
      expect(el).toBeFalsy();
    });

    it('should not render the icon container when photoUrl is undefined', () => {
      component.photoUrl = undefined;
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.remember-photo-icon');
      expect(el).toBeFalsy();
    });

    it('should render the icon container when photoUrl is set', () => {
      component.photoUrl = 'https://example.com/photo.jpg';
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.remember-photo-icon');
      expect(el).toBeTruthy();
    });

    it('should bind img src to photoUrl', () => {
      component.photoUrl = 'https://example.com/photo.jpg';
      fixture.detectChanges();
      const img = fixture.nativeElement.querySelector('img.remember-photo-mini') as HTMLImageElement;
      expect(img.src).toContain('photo.jpg');
    });

    it('should bind img alt to birthdayName + " remember photo"', () => {
      component.photoUrl = 'https://example.com/photo.jpg';
      component.birthdayName = 'Alice';
      fixture.detectChanges();
      const img = fixture.nativeElement.querySelector('img.remember-photo-mini') as HTMLImageElement;
      expect(img.alt).toBe('Alice remember photo');
    });

    it('should set role="button" and tabindex="0" on the container', () => {
      component.photoUrl = 'https://example.com/photo.jpg';
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('tabindex')).toBe('0');
    });

    it('should update the rendered img when photoUrl changes', () => {
      const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);

      component.photoUrl = 'https://example.com/first.jpg';
      cdr.markForCheck();
      fixture.detectChanges();
      let img = fixture.nativeElement.querySelector('img.remember-photo-mini') as HTMLImageElement;
      expect(img.src).toContain('first.jpg');

      component.photoUrl = 'https://example.com/second.jpg';
      cdr.markForCheck();
      fixture.detectChanges();
      img = fixture.nativeElement.querySelector('img.remember-photo-mini') as HTMLImageElement;
      expect(img.src).toContain('second.jpg');
    });

    it('should remove the container when photoUrl changes to null', () => {
      const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);

      component.photoUrl = 'https://example.com/photo.jpg';
      cdr.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.remember-photo-icon')).toBeTruthy();

      component.photoUrl = null;
      cdr.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.remember-photo-icon')).toBeFalsy();
    });
  });

  describe('DOM interactions', () => {
    beforeEach(() => {
      component.photoUrl = 'https://example.com/photo.jpg';
      component.birthdayName = 'John';
      fixture.detectChanges();
    });

    it('should emit download on click', () => {
      spyOn(component.download, 'emit');
      const el = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      el.click();
      expect(component.download.emit).toHaveBeenCalled();
    });

    it('should emit share on dblclick', () => {
      spyOn(component.share, 'emit');
      const el = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      el.dispatchEvent(new Event('dblclick'));
      expect(component.share.emit).toHaveBeenCalled();
    });

    it('should emit download on keydown Enter', () => {
      spyOn(component.download, 'emit');
      const el = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(component.download.emit).toHaveBeenCalled();
    });

    it('should emit download on keydown Space', () => {
      spyOn(component.download, 'emit');
      const el = fixture.nativeElement.querySelector('.remember-photo-icon') as HTMLElement;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(component.download.emit).toHaveBeenCalled();
    });
  });
});
