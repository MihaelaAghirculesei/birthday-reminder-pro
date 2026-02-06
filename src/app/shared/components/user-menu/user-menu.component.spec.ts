import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserMenuComponent } from './user-menu.component';
import * as AuthActions from '../../../core/store/auth/auth.actions';
import * as AuthSelectors from '../../../core/store/auth/auth.selectors';

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;
  let store: MockStore;

  const initialState = {
    auth: {
      user: {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null
      },
      loading: false,
      error: null,
      initialized: true
    },
    sync: { state: 'idle', lastSyncAt: null, pendingChanges: 0, error: null, isOnline: true }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserMenuComponent, NoopAnimationsModule],
      providers: [provideMockStore({ initialState })]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show account_circle icon when no photoURL', () => {
    store.overrideSelector(AuthSelectors.selectUserPhotoURL, null);
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const icon = el.querySelector('mat-icon');
    expect(icon).toBeTruthy();
    expect(icon?.textContent?.trim()).toBe('account_circle');
  });

  it('should show user image when photoURL exists', () => {
    store.overrideSelector(AuthSelectors.selectUserPhotoURL, 'https://example.com/photo.jpg');
    store.refreshState();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const img = el.querySelector('img.user-avatar');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.jpg');
  });

  it('should dispatch signOut on signOut call', () => {
    const dispatchSpy = spyOn(store, 'dispatch');
    component.signOut();
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signOut());
  });

  it('should have a menu trigger button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector('button[mat-icon-button]');
    expect(button).toBeTruthy();
  });
});
