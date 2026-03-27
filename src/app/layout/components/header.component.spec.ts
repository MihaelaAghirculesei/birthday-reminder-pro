import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

import { HeaderComponent } from './header.component';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { BackupService } from '../../core/services/backup.service';
import * as AuthActions from '../../core/store/auth/auth.actions';

const INITIAL_STATE = {
  auth: { user: null, loading: false, error: null },
  birthdays: { ids: [], entities: {}, loading: false, error: null, filters: { searchTerm: '', selectedCategory: null } }
};

function mockPermissionService() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc: any = {
    ...jasmine.createSpyObj('NotificationPermissionService', [
      'getCurrentPermission', 'requestPermission', 'isNotificationsEnabled', 'setNotificationsEnabled'
    ]),
    permissionStatus: new BehaviorSubject<string>('default'),
    notificationsEnabled: new BehaviorSubject<boolean>(false)
  };
  svc.getCurrentPermission.and.returnValue('default');
  svc.isNotificationsEnabled.and.returnValue(false);
  return svc;
}

function buildProviders(platformId: unknown = 'browser') {
  return [
    provideMockStore({ initialState: INITIAL_STATE }),
    { provide: PLATFORM_ID, useValue: platformId },
    { provide: NotificationPermissionService, useValue: mockPermissionService() },
    { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['show']) },
    { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
    { provide: BackupService, useValue: jasmine.createSpyObj('BackupService', ['exportToJSON', 'exportToCSV', 'importFromFile', 'importFromCSV', 'importFromVCard']) },
    { provide: ThemeService, useValue: { darkMode: signal(false), toggleDarkMode: jasmine.createSpy() } },
    provideTranslateTesting()
  ];
}

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule, RouterTestingModule],
      providers: buildProviders()
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dispatches signOut action', () => {
    spyOn(store, 'dispatch');
    component.signOut();
    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signOut());
  });

  describe('ngOnDestroy', () => {
    it('removes scroll listeners from window and body', () => {
      spyOn(window, 'removeEventListener');
      spyOn(document.body, 'removeEventListener');
      component.ngOnDestroy();
      expect(window.removeEventListener).toHaveBeenCalled();
      expect(document.body.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('onScroll', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let comp: any;
    let nativeEl: HTMLElement;

    beforeEach(() => {
      comp = component;
      nativeEl = comp.el.nativeElement;
      spyOn(comp, 'getScrollY');
      comp.lastScrollY = 100;
    });

    it('removes header-hidden when at top (currentY <= 0)', () => {
      nativeEl.classList.add('header-hidden');
      comp.getScrollY.and.returnValue(0);
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeFalse();
    });

    it('adds header-hidden when scrolling down past threshold', () => {
      comp.getScrollY.and.returnValue(115); // > lastScrollY(100) + threshold(10)
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeTrue();
    });

    it('removes header-hidden when scrolling up past threshold', () => {
      nativeEl.classList.add('header-hidden');
      comp.getScrollY.and.returnValue(85); // < lastScrollY(100) - threshold(10)
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeFalse();
    });

    it('does not change state when scroll delta is within threshold', () => {
      nativeEl.classList.add('header-hidden');
      comp.getScrollY.and.returnValue(105); // within ±10
      comp.onScroll();
      expect(nativeEl.classList.contains('header-hidden')).toBeTrue();
    });

    it('updates lastScrollY after state change', () => {
      comp.getScrollY.and.returnValue(115);
      comp.onScroll();
      expect(comp.lastScrollY).toBe(115);
    });
  });
});

describe('HeaderComponent – server platform', () => {
  it('does not attach scroll listeners during ngOnInit', async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule, RouterTestingModule],
      providers: buildProviders('server')
    }).compileComponents();

    const fixture = TestBed.createComponent(HeaderComponent);
    spyOn(window, 'addEventListener');
    fixture.detectChanges();

    expect(window.addEventListener).not.toHaveBeenCalled();
  });
});
