import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MessageScheduleDialogComponent } from './message-schedule-dialog.component';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { CategoryFacadeService } from '../../../core';
import { Birthday } from '../../../shared/models';
import { createMockBirthday } from '../../../testing/mock-data/birthday-mock.data';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import * as BirthdaySelectors from '../../../core/store/birthday/birthday.selectors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal BirthdayOptionView shape mirroring the component-private interface. */
interface BirthdayOptionView {
  birthday: Birthday;
  hasContact: boolean;
  contactInfo: string;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockBirthdays = [
  createMockBirthday({ id: '1', name: 'John Doe', birthDate: '1990-01-15', category: 'friends' }),
  createMockBirthday({ id: '2', name: 'Jane Smith', birthDate: '1995-06-20', category: 'family' }),
  createMockBirthday({ id: '3', name: 'Bob Wilson', birthDate: '1988-12-10', category: 'work' }),
];

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('MessageScheduleDialogComponent', () => {
  let component: MessageScheduleDialogComponent;
  let fixture: ComponentFixture<MessageScheduleDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<MessageScheduleDialogComponent>>;
  let mockCategoryFacade: jasmine.SpyObj<CategoryFacadeService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let store: MockStore;

  // Factory so individual tests can pass custom dialog data.
  const createComponent = (data: { birthday?: Birthday; birthdayId?: string; message?: unknown } | null = {}) => {
    TestBed.configureTestingModule({
      imports: [MessageScheduleDialogComponent, BrowserAnimationsModule],
      providers: [
        provideMockStore(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: CategoryFacadeService, useValue: mockCategoryFacade },
        { provide: MatDialog, useValue: mockDialog },
        provideTranslateTesting(),
      ],
    });

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, mockBirthdays);

    fixture = TestBed.createComponent(MessageScheduleDialogComponent);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    mockDialogRef   = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockCategoryFacade = jasmine.createSpyObj('CategoryFacadeService', [], {
      categories: signal([]),
    });
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
  });

  afterEach(() => store?.resetSelectors());

  // ---------------------------------------------------------------------------
  // Creation
  // ---------------------------------------------------------------------------

  describe('Component creation', () => {
    it('should create', () => {
      createComponent();
      expect(component).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // ngOnInit – initialisation paths
  // ---------------------------------------------------------------------------

  describe('ngOnInit – with birthday object', () => {
    it('should set selectedBirthday and hide selector when birthday is provided directly', () => {
      createComponent({ birthday: mockBirthdays[0] });
      fixture.detectChanges();

      expect(component.selectedBirthday).toEqual(mockBirthdays[0]);
      expect(component.showBirthdaySelector).toBe(false);
    });
  });

  describe('ngOnInit – with birthdayId', () => {
    it('should find and set selectedBirthday when birthdayId exists in the store', () => {
      createComponent({ birthdayId: '2' });
      fixture.detectChanges();

      expect(component.selectedBirthday).toEqual(mockBirthdays[1]);
      expect(component.showBirthdaySelector).toBe(false);
    });

    it('should leave selectedBirthday null when birthdayId is not found', () => {
      createComponent({ birthdayId: 'non-existent-id' });
      fixture.detectChanges();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(false);
    });
  });

  describe('ngOnInit – without data', () => {
    it('should show selector when no data is provided', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });

    it('should show selector when data is null', () => {
      createComponent(null);
      fixture.detectChanges();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // onBirthdaySelected
  // ---------------------------------------------------------------------------

  describe('onBirthdaySelected', () => {
    beforeEach(() => {
      createComponent({});
      fixture.detectChanges();
    });

    it('should set selectedBirthday and hide selector for a valid birthdayId', () => {
      component.selectedBirthdayId = '1';
      component.onBirthdaySelected();

      expect(component.selectedBirthday).toEqual(mockBirthdays[0]);
      expect(component.showBirthdaySelector).toBe(false);
    });

    it('should leave selectedBirthday null and keep selector visible for an unknown id', () => {
      component.selectedBirthdayId = 'invalid-id';
      component.onBirthdaySelected();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });

    it('should leave selectedBirthday null and keep selector visible when selectedBirthdayId is empty', () => {
      component.selectedBirthdayId = '';
      component.onBirthdaySelected();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // changeBirthday
  // ---------------------------------------------------------------------------

  describe('changeBirthday', () => {
    it('should reset selectedBirthday to null and show selector', () => {
      createComponent({ birthday: mockBirthdays[0] });
      fixture.detectChanges();

      expect(component.selectedBirthday).toEqual(mockBirthdays[0]);
      expect(component.showBirthdaySelector).toBe(false);

      component.changeBirthday();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // close
  // ---------------------------------------------------------------------------

  describe('close', () => {
    it('should call dialogRef.close()', () => {
      createComponent();
      fixture.detectChanges();

      component.close();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // trackByBirthday
  // ---------------------------------------------------------------------------

  describe('trackByBirthday', () => {
    beforeEach(() => {
      createComponent();
      fixture.detectChanges();
    });

    it('should return the birthday id', () => {
      expect(component.trackByBirthday(0, mockBirthdays[0])).toBe(mockBirthdays[0].id);
    });

    it('should return the correct id for every birthday', () => {
      mockBirthdays.forEach((birthday, index) => {
        expect(component.trackByBirthday(index, birthday)).toBe(birthday.id);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // onOptionClick – the most critical untested path
  // ---------------------------------------------------------------------------

  describe('onOptionClick', () => {
    // We spy on the *actual* injected MatDialog instance because the component's
    // own MatDialogModule import shadows the test-level MatDialog provider.
    let dialogOpenSpy: jasmine.Spy;

    const noContactOption = (): BirthdayOptionView => ({
      birthday: mockBirthdays[0],
      hasContact: false,
      contactInfo: '',
    });

    beforeEach(() => {
      createComponent({});
      fixture.detectChanges();
      // Spy after component creation so we have the real injected instance.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dialogOpenSpy = spyOn((component as any)['dialog'], 'open')
        .and.returnValue({ afterClosed: () => of(null) });
    });

    it('should return early without opening dialog when the option already has contact info', () => {
      const option: BirthdayOptionView = {
        birthday: mockBirthdays[0],
        hasContact: true,
        contactInfo: 'test@example.com',
      };
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');

      component.onOptionClick(event, option as never);

      expect(event.stopPropagation).not.toHaveBeenCalled();
      expect(dialogOpenSpy).not.toHaveBeenCalled();
    });

    it('should stop propagation and reset selectedBirthdayId when the option has no contact', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');

      component.selectedBirthdayId = '1';
      component.onOptionClick(event, noContactOption() as never);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.selectedBirthdayId).toBe('');
    });

    it('should open BirthdayEditDialogComponent when the option has no contact', () => {
      component.onOptionClick(new MouseEvent('click'), noContactOption() as never);

      expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
      const [dialogComponent] = dialogOpenSpy.calls.mostRecent().args as [{ name: string }, ...unknown[]];
      expect(dialogComponent.name).toContain('BirthdayEditDialog');
    });

    it('should dispatch updateBirthday when the edit dialog returns a valid result', () => {
      spyOn(store, 'dispatch');

      const dialogResult = {
        birthday: mockBirthdays[0],
        editedData: {
          name:             'John Updated',
          notes:            'Some notes',
          birthDate:        '1990-01-15',
          category:         'friends',
          photo:            null,
          rememberPhoto:    null,
          email:            'john@example.com',
          phone:            '+1234567890',
          telegramUsername: 'johnupdated',
        },
      };
      dialogOpenSpy.and.returnValue({ afterClosed: () => of(dialogResult) });

      component.onOptionClick(new MouseEvent('click'), noContactOption() as never);

      const dispatchedBirthday: Birthday =
        (store.dispatch as jasmine.Spy).calls.mostRecent().args[0].birthday;
      expect(dispatchedBirthday.id).toBe(mockBirthdays[0].id);
      expect(dispatchedBirthday.name).toBe('John Updated');
      expect(dispatchedBirthday.email).toBe('john@example.com');
      expect(dispatchedBirthday.phone).toBe('+1234567890');
      expect(dispatchedBirthday.telegramUsername).toBe('johnupdated');
    });

    it('should fall back to original name when editedData.name is blank', () => {
      spyOn(store, 'dispatch');

      const dialogResult = {
        birthday: mockBirthdays[0],
        editedData: {
          name:             '   ',   // blank → should keep original
          notes:            '',
          birthDate:        '1990-01-15',
          category:         'friends',
          photo:            null,
          rememberPhoto:    null,
          email:            'john@example.com',
          phone:            '',
          telegramUsername: '',
        },
      };
      dialogOpenSpy.and.returnValue({ afterClosed: () => of(dialogResult) });

      component.onOptionClick(new MouseEvent('click'), noContactOption() as never);

      const dispatchedBirthday: Birthday =
        (store.dispatch as jasmine.Spy).calls.mostRecent().args[0].birthday;
      expect(dispatchedBirthday.name).toBe(mockBirthdays[0].name);
    });

    it('should NOT dispatch when the edit dialog is cancelled (null result)', () => {
      spyOn(store, 'dispatch');
      // dialogOpenSpy already returns { afterClosed: () => of(null) } by default

      component.onOptionClick(new MouseEvent('click'), noContactOption() as never);

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should coerce blank contact fields to undefined in the dispatched birthday', () => {
      spyOn(store, 'dispatch');

      const dialogResult = {
        birthday: mockBirthdays[0],
        editedData: {
          name:             'John',
          notes:            '',
          birthDate:        '1990-01-15',
          category:         'friends',
          photo:            null,
          rememberPhoto:    null,
          email:            '   ',   // blank → undefined
          phone:            '',      // blank → undefined
          telegramUsername: '',      // blank → undefined
        },
      };
      dialogOpenSpy.and.returnValue({ afterClosed: () => of(dialogResult) });

      component.onOptionClick(new MouseEvent('click'), noContactOption() as never);

      const dispatchedBirthday: Birthday =
        (store.dispatch as jasmine.Spy).calls.mostRecent().args[0].birthday;
      expect(dispatchedBirthday.email).toBeUndefined();
      expect(dispatchedBirthday.phone).toBeUndefined();
      expect(dispatchedBirthday.telegramUsername).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Computed signals
  // ---------------------------------------------------------------------------

  describe('noBirthdays computed signal', () => {
    it('should be false when the store has birthdays', () => {
      createComponent();
      fixture.detectChanges();

      expect(component.noBirthdays()).toBe(false);
    });

    it('should be true when the store returns an empty list', () => {
      TestBed.resetTestingModule();
      createComponent({});
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, []);
      store.refreshState();
      fixture.detectChanges();

      expect(component.noBirthdays()).toBe(true);
    });
  });

  describe('allBirthdays computed signal', () => {
    it('should return all birthdays from the store', () => {
      createComponent();
      fixture.detectChanges();

      const ids = component.allBirthdays().map(b => b.id);
      expect(ids).toEqual(jasmine.arrayWithExactContents(['1', '2', '3']));
    });
  });

  // ---------------------------------------------------------------------------
  // birthdayOptions computed signal – hasContact + buildContactInfo
  // ---------------------------------------------------------------------------

  describe('birthdayOptions – hasContact and contactInfo', () => {
    it('should mark hasContact as false when birthday has no contact info', () => {
      createComponent();
      fixture.detectChanges();

      expect(component.birthdayOptions().every(o => !o.hasContact)).toBeTrue();
    });

    it('should mark hasContact as true when email is present', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], email: 'test@example.com' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].hasContact).toBeTrue();
    });

    it('should mark hasContact as true when phone is present', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], phone: '+1234567890' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].hasContact).toBeTrue();
    });

    it('should mark hasContact as true when telegramUsername is present', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], telegramUsername: 'myuser' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].hasContact).toBeTrue();
    });

    it('should produce contactInfo with only email when only email is set', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], email: 'test@example.com' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].contactInfo).toBe('test@example.com');
    });

    it('should produce contactInfo with only phone when only phone is set', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], phone: '+1234567890' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].contactInfo).toBe('+1234567890');
    });

    it('should prefix telegram with @ when only telegramUsername is set', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], telegramUsername: 'myuser' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].contactInfo).toBe('@myuser');
    });

    it('should join multiple contact parts with " · "', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], email: 'test@example.com', phone: '+1234567890' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].contactInfo).toBe('test@example.com · +1234567890');
    });

    it('should include all three contact fields joined with " · "', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [{
        ...mockBirthdays[0],
        email:            'test@example.com',
        phone:            '+1234567890',
        telegramUsername: 'testuser',
      }]);
      store.refreshState();
      fixture.detectChanges();

      const info = component.birthdayOptions()[0].contactInfo;
      expect(info).toContain('test@example.com');
      expect(info).toContain('+1234567890');
      expect(info).toContain('@testuser');
    });

    it('should trim whitespace from contact fields before including them', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], email: '  test@example.com  ' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      expect(component.birthdayOptions()[0].contactInfo).toBe('test@example.com');
    });

    it('should return empty contactInfo when no contact details are set', () => {
      createComponent();
      fixture.detectChanges();

      // mockBirthdays have no email / phone / telegramUsername
      expect(component.birthdayOptions()[0].contactInfo).toBe('');
    });

    it('should NOT include a field that is only whitespace in contactInfo', () => {
      TestBed.resetTestingModule();
      createComponent();
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [
        { ...mockBirthdays[0], email: '   ', phone: '+1234567890' },
      ]);
      store.refreshState();
      fixture.detectChanges();

      const info = component.birthdayOptions()[0].contactInfo;
      // blank email trimmed → excluded; only phone remains
      expect(info).toBe('+1234567890');
    });
  });

  // ---------------------------------------------------------------------------
  // Integration – full selection flow
  // ---------------------------------------------------------------------------

  describe('Integration – birthday selection flow', () => {
    it('should allow selecting a birthday, then switching back to the selector', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.showBirthdaySelector).toBe(true);
      expect(component.selectedBirthday).toBeNull();

      component.selectedBirthdayId = '2';
      component.onBirthdaySelected();

      expect(component.selectedBirthday).toEqual(mockBirthdays[1]);
      expect(component.showBirthdaySelector).toBe(false);

      component.changeBirthday();

      expect(component.selectedBirthday).toBeNull();
      expect(component.showBirthdaySelector).toBe(true);
    });
  });
});
