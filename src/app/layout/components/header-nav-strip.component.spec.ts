import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

import { HeaderNavStripComponent } from './header-nav-strip.component';
import { NotificationPermissionService } from '../../core/services/notification-permission.service';
import { NotificationService } from '../../core/services/notification.service';
import { ThemeService } from '../../core/services/theme.service';
import { BackupService } from '../../core/services/backup.service';

describe('HeaderNavStripComponent', () => {
  let component: HeaderNavStripComponent;
  let fixture: ComponentFixture<HeaderNavStripComponent>;

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
        HeaderNavStripComponent,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
      providers: [
        provideMockStore({
          initialState: {
            auth: { user: null, loading: false, error: null },
            birthdays: { ids: [], entities: {}, loading: false, error: null, filters: { searchTerm: '', selectedCategory: null } }
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

    fixture = TestBed.createComponent(HeaderNavStripComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit signOutClicked', () => {
    spyOn(component.signOutClicked, 'emit');
    component.signOutClicked.emit();
    expect(component.signOutClicked.emit).toHaveBeenCalled();
  });
});
