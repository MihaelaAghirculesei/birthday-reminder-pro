import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { HeaderImportExportComponent } from './header-import-export.component';
import { NotificationService } from '../../core/services/notification.service';
import { BackupService } from '../../core/services/backup.service';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

describe('HeaderImportExportComponent', () => {
  let component: HeaderImportExportComponent;
  let fixture: ComponentFixture<HeaderImportExportComponent>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockBackupService: jasmine.SpyObj<BackupService>;
  let store: MockStore;

  beforeEach(async () => {
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['show']);
    mockBackupService = jasmine.createSpyObj('BackupService', [
      'exportToJSON', 'exportToCSV', 'importFromFile', 'importFromCSV', 'importFromVCard'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        HeaderImportExportComponent,
        NoopAnimationsModule,
      ],
      providers: [
        provideMockStore({
          initialState: {
            birthdays: { ids: [], entities: {}, loading: false, error: null, filters: { searchTerm: '', selectedCategory: null } }
          }
        }),
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: BackupService, useValue: mockBackupService },
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, []);

    fixture = TestBed.createComponent(HeaderImportExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose importMenu and exportMenu ViewChildren', () => {
    expect(component.importMenu).toBeTruthy();
    expect(component.exportMenu).toBeTruthy();
  });

  it('should show warning when exporting with no birthdays', () => {
    component.exportJSON();
    expect(mockNotificationService.show).toHaveBeenCalledWith('No birthdays to export', 'warning');
  });
});
