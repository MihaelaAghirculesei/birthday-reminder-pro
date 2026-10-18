import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import type { MockedObject } from 'vitest';

import { provideTranslateTesting } from '../../../../testing/translate-testing';
import * as AuthActions from '../../../core/store/auth/auth.actions';
import * as AuthSelectors from '../../../core/store/auth/auth.selectors';
import type { ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { UserMenuComponent } from './user-menu.component';

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;
  let store: MockStore;
  let dialogSpy: MockedObject<MatDialog>;

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
    const dialogSpyObj = {
      open: vi.fn().mockName('MatDialog.open')
    };

    await TestBed.configureTestingModule({
      imports: [UserMenuComponent, NoopAnimationsModule],
      providers: [
        provideMockStore({ initialState }),
        provideTranslateTesting(),
        { provide: MatDialog, useValue: dialogSpyObj }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dialogSpy = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
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
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    component.signOut();
    expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.signOut());
  });

  it('should have a menu trigger button', () => {
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector('button[mat-icon-button]');
    expect(button).toBeTruthy();
  });

  describe('confirmDeleteAccount', () => {
    it('should do nothing when there is no authenticated user', () => {
      store.overrideSelector(AuthSelectors.selectUserId, null);
      store.refreshState();

      component.confirmDeleteAccount();

      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('should open the confirm dialog with delete-account data', () => {
      const mockDialogRef = {
        afterClosed: vi.fn().mockName('MatDialogRef.afterClosed')
      } as unknown as MockedObject<MatDialogRef<unknown>>;
      mockDialogRef.afterClosed.mockReturnValue(of(false));
      dialogSpy.open.mockReturnValue(mockDialogRef);

      component.confirmDeleteAccount();

      expect(dialogSpy.open).toHaveBeenCalledTimes(1);
      const [, config] = vi.mocked(dialogSpy.open).mock.lastCall!;
      const data = config?.data as ConfirmDialogData;
      expect(data.color).toBe('warn');
      expect(data.icon).toBe('delete_forever');
    });

    it('should dispatch deleteAccount with the user id when confirmed', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      const mockDialogRef = {
        afterClosed: vi.fn().mockName('MatDialogRef.afterClosed')
      } as unknown as MockedObject<MatDialogRef<unknown>>;
      mockDialogRef.afterClosed.mockReturnValue(of(true));
      dialogSpy.open.mockReturnValue(mockDialogRef);

      component.confirmDeleteAccount();

      expect(dispatchSpy).toHaveBeenCalledWith(AuthActions.deleteAccount({ userId: 'user-123' }));
    });

    it('should not dispatch deleteAccount when the dialog is cancelled', () => {
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      const mockDialogRef = {
        afterClosed: vi.fn().mockName('MatDialogRef.afterClosed')
      } as unknown as MockedObject<MatDialogRef<unknown>>;
      mockDialogRef.afterClosed.mockReturnValue(of(false));
      dialogSpy.open.mockReturnValue(mockDialogRef);

      component.confirmDeleteAccount();

      expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: AuthActions.deleteAccount.type }));
    });
  });
});
