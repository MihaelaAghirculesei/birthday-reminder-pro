import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { ScheduledMessagesComponent } from './scheduled-messages.component';
import { Birthday, ScheduledMessage } from '../../shared';
import { MessageScheduleDialogComponent } from './message-schedule-dialog/message-schedule-dialog.component';
import * as BirthdaySelectors from '../../core/store/birthday/birthday.selectors';

describe('ScheduledMessagesComponent', () => {
  let component: ScheduledMessagesComponent;
  let fixture: ComponentFixture<ScheduledMessagesComponent>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let store: MockStore;

  const mockMessage1: ScheduledMessage = {
    id: 'm1',
    title: 'Birthday Message',
    message: 'Happy Birthday!',
    scheduledTime: '2026-01-15T10:00:00',
    priority: 'normal',
    messageType: 'text',
    active: true,
    createdDate: new Date()
  };

  const mockMessage2: ScheduledMessage = {
    id: 'm2',
    title: 'Reminder',
    message: 'Don\'t forget the party!',
    scheduledTime: '2026-01-16T10:00:00',
    priority: 'high',
    messageType: 'html',
    active: true,
    createdDate: new Date()
  };

  const mockBirthdays: Birthday[] = [
    {
      id: '1',
      name: 'John Doe',
      birthDate: '1990-01-15',
      category: 'friends',
      scheduledMessages: [mockMessage1, mockMessage2]
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: '1995-06-20',
      category: 'family',
      scheduledMessages: []
    },
    {
      id: '3',
      name: 'Bob Wilson',
      birthDate: '1988-12-10',
      category: 'work',
      scheduledMessages: [mockMessage1]
    },
    {
      id: '4',
      name: 'Alice Brown',
      birthDate: '1992-03-25',
      category: 'friends'
    }
  ];

  beforeEach(() => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [ScheduledMessagesComponent, BrowserAnimationsModule],
      providers: [
        provideMockStore(),
        { provide: MatDialog, useValue: mockDialog }
      ]
    });

    store = TestBed.inject(MockStore);
    store.overrideSelector(BirthdaySelectors.selectAllBirthdays, mockBirthdays);

    fixture = TestBed.createComponent(ScheduledMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('birthdaysWithMessages computed signal', () => {
    it('should return only birthdays with scheduled messages', () => {
      const birthdaysWithMsgs = component.birthdaysWithMessages();
      const birthdayIds = birthdaysWithMsgs.map(entry => entry.birthday.id);

      expect(birthdaysWithMsgs.length).toBe(2);
      expect(birthdayIds).toContain('1');
      expect(birthdayIds).toContain('3');
      expect(birthdayIds).not.toContain('2');
      expect(birthdayIds).not.toContain('4');
    });

    it('should include pre-computed wishLinks in messages', () => {
      const birthdaysWithMsgs = component.birthdaysWithMessages();

      birthdaysWithMsgs.forEach(entry => {
        entry.messages.forEach(msg => {
          expect(msg.wishLinks).toBeDefined();
          expect(Array.isArray(msg.wishLinks)).toBeTrue();
        });
      });
    });

    it('should handle empty messages array', () => {
      const birthdaysWithMsgs = component.birthdaysWithMessages();

      const birthdayWithEmptyMessages = birthdaysWithMsgs.find(entry => entry.birthday.id === '2');
      expect(birthdayWithEmptyMessages).toBeUndefined();
    });

    it('should handle birthdays without scheduledMessages property', () => {
      const birthdaysWithMsgs = component.birthdaysWithMessages();

      const birthdayWithoutProperty = birthdaysWithMsgs.find(entry => entry.birthday.id === '4');
      expect(birthdayWithoutProperty).toBeUndefined();
    });
  });

  describe('openScheduleDialog', () => {
    it('should open dialog with birthday data', () => {
      const birthday = mockBirthdays[0];

      component.openScheduleDialog(birthday);

      expect(mockDialog.open).toHaveBeenCalledWith(
        MessageScheduleDialogComponent,
        jasmine.objectContaining({
          width: '800px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          data: { birthday },
          autoFocus: 'dialog',
          restoreFocus: true
        })
      );
    });

    it('should open dialog without birthday data', () => {
      component.openScheduleDialog();

      expect(mockDialog.open).toHaveBeenCalledWith(
        MessageScheduleDialogComponent,
        jasmine.objectContaining({
          data: { birthday: undefined }
        })
      );
    });

    it('should open dialog with undefined birthday', () => {
      component.openScheduleDialog(undefined);

      expect(mockDialog.open).toHaveBeenCalledWith(
        MessageScheduleDialogComponent,
        jasmine.objectContaining({
          data: { birthday: undefined }
        })
      );
    });
  });

  describe('deleteMessage', () => {
    it('should dispatch deleteMessageFromBirthday when confirmed', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(mockDialogRef);
      spyOn(store, 'dispatch');

      component.deleteMessage('1', 'm1');

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should not dispatch when cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(false));
      mockDialog.open.and.returnValue(mockDialogRef);
      spyOn(store, 'dispatch');

      component.deleteMessage('1', 'm1');

      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('trackByBirthday', () => {
    it('should return birthday id', () => {
      const birthday = mockBirthdays[0];
      const result = component.trackByBirthday(0, birthday);

      expect(result).toBe(birthday.id);
    });

    it('should return correct id for different birthdays', () => {
      mockBirthdays.forEach((birthday, index) => {
        const result = component.trackByBirthday(index, birthday);
        expect(result).toBe(birthday.id);
      });
    });
  });

  describe('trackByMessage', () => {
    it('should return message id', () => {
      const message = mockMessage1;
      const result = component.trackByMessage(0, message);

      expect(result).toBe(message.id);
    });

    it('should return correct id for different messages', () => {
      const messages = [mockMessage1, mockMessage2];
      messages.forEach((message, index) => {
        const result = component.trackByMessage(index, message);
        expect(result).toBe(message.id);
      });
    });
  });

  describe('noBirthdays computed signal', () => {
    it('should return false when there are birthdays', () => {
      expect(component.noBirthdays()).toBe(false);
    });

    it('should return true when there are no birthdays', () => {
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, []);
      store.refreshState();
      fixture.detectChanges();

      expect(component.noBirthdays()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle birthday with null scheduledMessages', () => {
      const birthdayWithNull = {
        ...mockBirthdays[0],
        scheduledMessages: null as unknown as undefined
      };

      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, [birthdayWithNull]);
      store.refreshState();
      fixture.detectChanges();

      const birthdaysWithMsgs = component.birthdaysWithMessages();
      expect(birthdaysWithMsgs.length).toBe(0);
    });

    it('should handle empty birthdays list', () => {
      store.overrideSelector(BirthdaySelectors.selectAllBirthdays, []);
      store.refreshState();
      fixture.detectChanges();

      const birthdaysWithMsgs = component.birthdaysWithMessages();
      expect(birthdaysWithMsgs).toEqual([]);
    });
  });
});
