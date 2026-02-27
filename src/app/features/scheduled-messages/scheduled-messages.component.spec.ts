import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ScheduledMessagesComponent } from './scheduled-messages.component';
import { BirthdayFacadeService } from '../../core';
import { Birthday, ScheduledMessage } from '../../shared';
import { MessageScheduleDialogComponent } from './message-schedule-dialog/message-schedule-dialog.component';

describe('ScheduledMessagesComponent', () => {
  let component: ScheduledMessagesComponent;
  let fixture: ComponentFixture<ScheduledMessagesComponent>;
  let mockBirthdayFacade: jasmine.SpyObj<BirthdayFacadeService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

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
      birthDate: new Date('1990-01-15'),
      category: 'friends',
      scheduledMessages: [mockMessage1, mockMessage2]
    },
    {
      id: '2',
      name: 'Jane Smith',
      birthDate: new Date('1995-06-20'),
      category: 'family',
      scheduledMessages: []
    },
    {
      id: '3',
      name: 'Bob Wilson',
      birthDate: new Date('1988-12-10'),
      category: 'work',
      scheduledMessages: [mockMessage1]
    },
    {
      id: '4',
      name: 'Alice Brown',
      birthDate: new Date('1992-03-25'),
      category: 'friends'
    }
  ];

  beforeEach(() => {
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockBirthdayFacade = jasmine.createSpyObj('BirthdayFacadeService', [
      'deleteMessageFromBirthday'
    ], {
      birthdays: signal(mockBirthdays)
    });

    TestBed.configureTestingModule({
      imports: [ScheduledMessagesComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialog, useValue: mockDialog },
        { provide: BirthdayFacadeService, useValue: mockBirthdayFacade }
      ]
    });

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

      expect(birthdaysWithMsgs.length).toBe(2);
      expect(birthdaysWithMsgs).toContain(mockBirthdays[0]);
      expect(birthdaysWithMsgs).toContain(mockBirthdays[2]);
      expect(birthdaysWithMsgs).not.toContain(mockBirthdays[1]);
      expect(birthdaysWithMsgs).not.toContain(mockBirthdays[3]);
    });

    it('should handle empty messages array', () => {
      const birthdaysWithMsgs = component.birthdaysWithMessages();

      const birthdayWithEmptyMessages = birthdaysWithMsgs.find(b => b.id === '2');
      expect(birthdayWithEmptyMessages).toBeUndefined();
    });

    it('should handle birthdays without scheduledMessages property', () => {
      const birthdaysWithMsgs = component.birthdaysWithMessages();

      const birthdayWithoutProperty = birthdaysWithMsgs.find(b => b.id === '4');
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
    it('should call facade deleteMessageFromBirthday when confirmed', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(mockDialogRef);

      component.deleteMessage('1', 'm1');

      expect(mockBirthdayFacade.deleteMessageFromBirthday).toHaveBeenCalledWith('1', 'm1');
    });

    it('should not call facade when cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(false));
      mockDialog.open.and.returnValue(mockDialogRef);

      component.deleteMessage('1', 'm1');

      expect(mockBirthdayFacade.deleteMessageFromBirthday).not.toHaveBeenCalled();
    });

    it('should handle deletion of different messages', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(mockDialogRef);

      component.deleteMessage('3', 'm2');

      expect(mockBirthdayFacade.deleteMessageFromBirthday).toHaveBeenCalledWith('3', 'm2');
    });
  });

  describe('getPriorityLabel', () => {
    it('should return "Low" for low priority', () => {
      const result = component.getPriorityLabel('low');
      expect(result).toBe('Low');
    });

    it('should return "Normal" for normal priority', () => {
      const result = component.getPriorityLabel('normal');
      expect(result).toBe('Normal');
    });

    it('should return "High" for high priority', () => {
      const result = component.getPriorityLabel('high');
      expect(result).toBe('High');
    });

    it('should return original value for unknown priority', () => {
      const result = component.getPriorityLabel('urgent');
      expect(result).toBe('urgent');
    });

    it('should handle empty string', () => {
      const result = component.getPriorityLabel('');
      expect(result).toBe('');
    });

    it('should handle case sensitivity', () => {
      expect(component.getPriorityLabel('Low')).toBe('Low');
      expect(component.getPriorityLabel('HIGH')).toBe('HIGH');
      expect(component.getPriorityLabel('Normal')).toBe('Normal');
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

  describe('Integration - Complete Flows', () => {
    it('should support opening dialog and deleting message workflow', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      mockDialog.open.and.returnValue(mockDialogRef);

      component.openScheduleDialog(mockBirthdays[0]);
      expect(mockDialog.open).toHaveBeenCalled();

      component.deleteMessage('1', 'm1');
      expect(mockBirthdayFacade.deleteMessageFromBirthday).toHaveBeenCalledWith('1', 'm1');
    });

    it('should display only birthdays with messages', () => {
      const birthdaysWithMsgs = component.birthdaysWithMessages();

      expect(birthdaysWithMsgs.length).toBe(2);
      birthdaysWithMsgs.forEach(birthday => {
        expect(birthday.scheduledMessages).toBeDefined();
        expect(birthday.scheduledMessages!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('noBirthdays computed signal', () => {
    it('should return false when there are birthdays', () => {
      expect(component.noBirthdays()).toBe(false);
    });

    it('should return true when there are no birthdays', () => {
      mockBirthdayFacade = jasmine.createSpyObj('BirthdayFacadeService', [
        'deleteMessageFromBirthday'
      ], {
        birthdays: signal([])
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ScheduledMessagesComponent, BrowserAnimationsModule],
        providers: [
          { provide: MatDialog, useValue: mockDialog },
          { provide: BirthdayFacadeService, useValue: mockBirthdayFacade }
        ]
      });

      fixture = TestBed.createComponent(ScheduledMessagesComponent);
      component = fixture.componentInstance;
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

      mockBirthdayFacade = jasmine.createSpyObj('BirthdayFacadeService', [
        'deleteMessageFromBirthday'
      ], {
        birthdays: signal([birthdayWithNull])
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ScheduledMessagesComponent, BrowserAnimationsModule],
        providers: [
          { provide: MatDialog, useValue: mockDialog },
          { provide: BirthdayFacadeService, useValue: mockBirthdayFacade }
        ]
      });

      fixture = TestBed.createComponent(ScheduledMessagesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const birthdaysWithMsgs = component.birthdaysWithMessages();
      expect(birthdaysWithMsgs.length).toBe(0);
    });

    it('should handle empty birthdays list', () => {
      mockBirthdayFacade = jasmine.createSpyObj('BirthdayFacadeService', [
        'deleteMessageFromBirthday'
      ], {
        birthdays: signal([])
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [ScheduledMessagesComponent, BrowserAnimationsModule],
        providers: [
          { provide: MatDialog, useValue: mockDialog },
          { provide: BirthdayFacadeService, useValue: mockBirthdayFacade }
        ]
      });

      fixture = TestBed.createComponent(ScheduledMessagesComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const birthdaysWithMsgs = component.birthdaysWithMessages();
      expect(birthdaysWithMsgs).toEqual([]);
    });
  });
});
