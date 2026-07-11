import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { provideTranslateTesting } from '../../testing/translate-testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  async function setup(platformId = 'browser') {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platformId },
        provideTranslateTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  it('should expose current year', async () => {
    await setup();
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  describe('scrollToTop', () => {
    it('should call scrollIntoView on .app-container when in browser', async () => {
      await setup('browser');
      const document = TestBed.inject(DOCUMENT);
      const mockContainer = document.createElement('div');
      spyOn(mockContainer, 'scrollIntoView');
      spyOn(document, 'querySelector').and.returnValue(mockContainer);

      component.scrollToTop();

      expect(document.querySelector).toHaveBeenCalledWith('.app-container');
      expect(mockContainer.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    it('should not throw when .app-container is not found (optional chaining)', async () => {
      await setup('browser');
      const document = TestBed.inject(DOCUMENT);
      spyOn(document, 'querySelector').and.returnValue(null);

      expect(() => component.scrollToTop()).not.toThrow();
    });

    it('should return early and not query DOM on server platform', async () => {
      await setup('server');
      const document = TestBed.inject(DOCUMENT);
      spyOn(document, 'querySelector');

      component.scrollToTop();

      expect(document.querySelector).not.toHaveBeenCalled();
    });
  });
});
