import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { AppComponent } from './app.component';
import { provideTranslateTesting } from './testing/translate-testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideMockStore({ initialState: { ui: { darkMode: false } } }),
        provideRouter([]),
        provideTranslateTesting(),
      ],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return { fixture, app: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  it('should create', () => {
    const { app } = createComponent();
    expect(app).toBeTruthy();
  });

  it('should have title "Birthday Reminder App"', () => {
    const { app } = createComponent();
    expect(app.title).toBe('Birthday Reminder App');
  });

  describe('template structure', () => {
    it('should render skip-to-content', () => {
      const { el } = createComponent();
      expect(el.querySelector('app-skip-to-content')).toBeTruthy();
    });

    it('should render header', () => {
      const { el } = createComponent();
      expect(el.querySelector('app-header')).toBeTruthy();
    });

    it('should render footer', () => {
      const { el } = createComponent();
      expect(el.querySelector('app-footer')).toBeTruthy();
    });

    it('should render notification', () => {
      const { el } = createComponent();
      expect(el.querySelector('app-notification')).toBeTruthy();
    });

    it('should render main with correct id and role', () => {
      const { el } = createComponent();
      const main = el.querySelector('main');
      expect(main).toBeTruthy();
      expect(main?.id).toBe('main-content');
      expect(main?.getAttribute('role')).toBe('main');
    });

    it('should render router-outlet inside main', () => {
      const { el } = createComponent();
      const main = el.querySelector('main');
      expect(main?.querySelector('router-outlet')).toBeTruthy();
    });
  });
});
