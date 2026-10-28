import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';

import { FirebaseAuthService } from '../../core/services/firebase-auth.service';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { HeaderUserMenuComponent } from './header-user-menu.component';

describe('HeaderUserMenuComponent', () => {
  let component: HeaderUserMenuComponent;
  let fixture: ComponentFixture<HeaderUserMenuComponent>;

  const PHOTO = 'https://example.com/avatar.png';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HeaderUserMenuComponent,
        NoopAnimationsModule,
      ],
      providers: [
        provideMockStore({
          initialState: {
            auth: { user: null, loading: false, error: null }
          }
        }),
        // Only reached when the auth button is clicked, which these tests never do.
        { provide: FirebaseAuthService, useValue: {} },
        provideTranslateTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderUserMenuComponent);
    component = fixture.componentInstance;
  });

  const render = (inputs: Partial<Pick<HeaderUserMenuComponent,
    'mode' | 'isAuthenticated' | 'authLoading' | 'userDisplayName' | 'userEmail' | 'userPhotoURL'>>) => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('should default to mobile mode while auth is loading, rendering nothing', () => {
    const el = render({});

    expect(component.mode).toBe('mobile');
    expect(el.querySelector('app-auth-button')).toBeNull();
    expect(el.querySelector('button')).toBeNull();
  });

  describe('mobile mode', () => {
    it('should show name, email and the photo for a signed-in user', () => {
      const el = render({ isAuthenticated: true, userDisplayName: 'Ada', userEmail: 'ada@example.com', userPhotoURL: PHOTO });

      expect(el.querySelector('.user-info-menu-item')?.textContent).toContain('Ada');
      expect(el.querySelector('.menu-user-email')?.textContent).toBe('ada@example.com');
      expect(el.querySelector('img.menu-user-avatar')?.getAttribute('src')).toBe(PHOTO);
    });

    it('should fall back to the generic icon and label without photo or name', () => {
      const el = render({ isAuthenticated: true });

      expect(el.querySelector('img')).toBeNull();
      expect(el.querySelector('.user-info-menu-item mat-icon')?.textContent).toContain('account_circle');
      expect(el.querySelector('.user-info-menu-item')?.textContent).toContain('User');
    });

    it('should emit signOutClicked from the sign-out menu item', () => {
      const emitted = vi.fn();
      component.signOutClicked.subscribe(emitted);
      const el = render({ isAuthenticated: true });

      el.querySelector<HTMLButtonElement>('button[mat-menu-item]')?.click();

      expect(emitted).toHaveBeenCalledTimes(1);
    });

    it('should show the sign-in button once auth has loaded without a user', () => {
      const el = render({ authLoading: false });

      expect(el.querySelector('app-auth-button')).not.toBeNull();
      expect(el.querySelector('.user-info-menu-item')).toBeNull();
    });
  });

  describe('desktop mode', () => {
    it('should show the avatar and name for a signed-in user', () => {
      const el = render({ mode: 'desktop', isAuthenticated: true, userDisplayName: 'Ada', userPhotoURL: PHOTO });

      const avatar = el.querySelector('img.nav-strip-avatar');
      expect(avatar?.getAttribute('src')).toBe(PHOTO);
      expect(avatar?.getAttribute('alt')).toBe('Ada');
      expect(el.querySelector('.nav-strip-user-name')?.textContent).toContain('Ada');
    });

    it('should fall back to the generic icon and label without photo or name', () => {
      const el = render({ mode: 'desktop', isAuthenticated: true });

      expect(el.querySelector('img')).toBeNull();
      expect(el.querySelector('.nav-strip-user-icon')).not.toBeNull();
      expect(el.querySelector('.nav-strip-user-name')?.textContent?.trim()).toBe('User');
    });

    it('should emit signOutClicked from the sign-out button', () => {
      const emitted = vi.fn();
      component.signOutClicked.subscribe(emitted);
      const el = render({ mode: 'desktop', isAuthenticated: true });

      el.querySelector<HTMLButtonElement>('.nav-strip-signout')?.click();

      expect(emitted).toHaveBeenCalledTimes(1);
    });

    it('should show the sign-in button once auth has loaded without a user', () => {
      const el = render({ mode: 'desktop', authLoading: false });

      expect(el.querySelector('app-auth-button')).not.toBeNull();
      expect(el.querySelector('.nav-strip-user')).toBeNull();
    });

    it('should render nothing while auth is loading', () => {
      const el = render({ mode: 'desktop' });

      expect(el.querySelector('app-auth-button')).toBeNull();
      expect(el.querySelector('.nav-strip-spacer')).toBeNull();
    });
  });
});
