import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

import { HeaderComponent } from './header.component';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { BackupService } from '../../core/services/backup.service';
import * as AuthActions from '../../core/store/auth/auth.actions';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;

  beforeEach(async () => {
    const permissionStatus$ = new BehaviorSubject<string>('default');
    const notificationsEnabled$ = new BehaviorSubject<boolean>(false);

    const mockPermissionService = {
      ...jasmine.createSpyObj('NotificationPermissionService', [
        'getCurrentPermission',
        'requestPermission',
        'isNotificationsEnabled',
        'setNotificationsEnabled'
      ]),
      permissionStatus: permissionStatus$,
      notificationsEnabled: notificationsEnabled$
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockPermissionService.getCurrentPermission.and.returnValue('default');
    mockPermissionService.isNotificationsEnabled.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [
        HeaderComponent,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        provideMockStore({
          initialState: {
            auth: { user: null, loading: false, error: null },
            birthdays: { ids: [], entities: {}, loading: false, error: null, selectedId: null, filters: { searchTerm: '', selectedCategory: null } }
          }
        }),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: NotificationPermissionService, useValue: mockPermissionService },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['show']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: BackupService, useValue: jasmine.createSpyObj('BackupService', ['exportToJSON', 'exportToCSV', 'importFromFile', 'importFromCSV', 'importFromVCard']) },
        { provide: ThemeService, useValue: { darkMode: signal(false), toggleDarkMode: jasmine.createSpy('toggleDarkMode') } }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch signOut action', () => {
    spyOn(store, 'dispatch');
    component.signOut();
    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.signOut());
  });
});
