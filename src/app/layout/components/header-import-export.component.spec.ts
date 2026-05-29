import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { HeaderImportExportComponent } from './header-import-export.component';
import { provideTranslateTesting } from '../../testing/translate-testing';
import { NotificationService } from '../../core/services/notification.service';
import { BackupService } from '../../core/services/backup.service';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';
import * as BirthdayActions from '../../core/store/birthday/birthday.actions';
import { createMockBirthday } from '../../testing/mock-data/birthday-mock.data';

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
        provideTranslateTesting()
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, []);

    fixture = TestBed.createComponent(HeaderImportExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => store.resetSelectors());

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

  it('should export JSON when birthdays exist', () => {
    const mockBirthday = createMockBirthday({ id: '1', name: 'John', birthDate: '1990-05-15' });
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [mockBirthday]);
    store.refreshState();
    fixture.detectChanges();

    component.exportJSON();

    expect(mockBackupService.exportToJSON).toHaveBeenCalledWith([mockBirthday]);
    expect(mockNotificationService.show).toHaveBeenCalledWith('Exported to JSON', 'success');
  });

  it('should export CSV when birthdays exist', () => {
    const mockBirthday = createMockBirthday({ id: '1', name: 'John', birthDate: '1990-05-15' });
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [mockBirthday]);
    store.refreshState();
    fixture.detectChanges();

    component.exportCSV();

    expect(mockBackupService.exportToCSV).toHaveBeenCalledWith([mockBirthday]);
    expect(mockNotificationService.show).toHaveBeenCalledWith('Exported to CSV', 'success');
  });

  describe('Import functionality', () => {
    let mockFile: File;
    let mockInput: HTMLInputElement;

    beforeEach(() => {
      mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      mockInput = document.createElement('input');
      mockInput.type = 'file';
      Object.defineProperty(mockInput, 'files', { value: [mockFile], writable: false });
    });

    it('should dispatch addBirthday and show success when all birthdays are valid', async () => {
      const mockBirthday = createMockBirthday({ id: '1', name: 'John', birthDate: '1990-05-15' });
      mockBackupService.importFromFile.and.returnValue(
        Promise.resolve({ valid: [mockBirthday], invalid: [] })
      );
      spyOn(store, 'dispatch');

      await component.onImportJSON({ target: mockInput } as unknown as Event);

      expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.importBirthdays({ birthdays: [mockBirthday] }));
      expect(mockNotificationService.show).toHaveBeenCalledWith('Imported 1 birthdays', 'success');
    });

    it('should dispatch valid birthdays and show warning when some are skipped', async () => {
      const mockBirthday = createMockBirthday({ id: '1', name: 'John', birthDate: '1990-05-15' });
      mockBackupService.importFromFile.and.returnValue(
        Promise.resolve({ valid: [mockBirthday], invalid: [{ name: 'Bad', error: 'Invalid date' }] })
      );
      spyOn(store, 'dispatch');

      await component.onImportJSON({ target: mockInput } as unknown as Event);

      expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.importBirthdays({ birthdays: [mockBirthday] }));
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        'Imported 1 birthdays (1 skipped)',
        'warning'
      );
    });

    it('should show error when all imported birthdays are invalid', async () => {
      mockBackupService.importFromFile.and.returnValue(
        Promise.resolve({ valid: [], invalid: [{ name: 'Bad', error: 'Invalid date' }] })
      );
      spyOn(store, 'dispatch');

      await component.onImportJSON({ target: mockInput } as unknown as Event);

      expect(store.dispatch).not.toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith('Invalid backup file', 'error');
    });

    it('should show error when import throws', async () => {
      mockBackupService.importFromFile.and.returnValue(Promise.reject(new Error('Parse error')));

      await component.onImportJSON({ target: mockInput } as unknown as Event);

      expect(mockNotificationService.show).toHaveBeenCalledWith('Invalid backup file', 'error');
    });

    it('should do nothing when no file is selected', async () => {
      const emptyInput = document.createElement('input');
      Object.defineProperty(emptyInput, 'files', { value: [], writable: false });

      await component.onImportJSON({ target: emptyInput } as unknown as Event);

      expect(mockBackupService.importFromFile).not.toHaveBeenCalled();
    });

    it('should dispatch addBirthday and show success on CSV import', async () => {
      const mockBirthday = createMockBirthday({ id: '1', name: 'John', birthDate: '1990-05-15' });
      mockBackupService.importFromCSV.and.returnValue(
        Promise.resolve({ valid: [mockBirthday], invalid: [] })
      );
      spyOn(store, 'dispatch');

      await component.onImportCSV({ target: mockInput } as unknown as Event);

      expect(mockBackupService.importFromCSV).toHaveBeenCalledWith(mockFile);
      expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.importBirthdays({ birthdays: [mockBirthday] }));
    });

    it('should dispatch addBirthday and show success on vCard import', async () => {
      const mockBirthday = createMockBirthday({ id: '1', name: 'John', birthDate: '1990-05-15' });
      mockBackupService.importFromVCard.and.returnValue(
        Promise.resolve({ valid: [mockBirthday], invalid: [] })
      );
      spyOn(store, 'dispatch');

      await component.onImportVCard({ target: mockInput } as unknown as Event);

      expect(mockBackupService.importFromVCard).toHaveBeenCalledWith(mockFile);
      expect(store.dispatch).toHaveBeenCalledWith(BirthdayActions.importBirthdays({ birthdays: [mockBirthday] }));
    });
  });
});
