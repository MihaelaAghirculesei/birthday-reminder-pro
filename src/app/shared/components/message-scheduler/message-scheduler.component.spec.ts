import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MessageSchedulerComponent } from './message-scheduler.component';
import { ScheduledMessageService } from '../../../features/scheduled-messages/scheduled-message.service';
import { NotificationService, BirthdayFacadeService } from '../../../core';
import { Birthday, ScheduledMessage } from '../..';

describe('MessageSchedulerComponent', () => {
  let component: MessageSchedulerComponent;
  let fixture: ComponentFixture<MessageSchedulerComponent>;
  let scheduledMessageServiceMock: jasmine.SpyObj<ScheduledMessageService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let birthdayFacadeMock: jasmine.SpyObj<BirthdayFacadeService>;

  const mockBirthday: Birthday = {
    id: '1',
    name: 'John Doe',
    birthDate: new Date(1990, 0, 15),
    category: 'Family',
    zodiacSign: 'Capricorn'
  };

  const mockMessage: ScheduledMessage = {
    id: 'msg1',
    birthdayId: '1',
    title: 'Birthday Reminder',
    message: 'Happy {age}th birthday {name}!',
    scheduledTime: '09:00',
    priority: 'normal',
    active: true,
    messageType: 'text',
    createdDate: new Date()
  };

  beforeEach(async () => {
    scheduledMessageServiceMock = jasmine.createSpyObj('ScheduledMessageService', [
      'getMessageTemplates',
      'getTimeSlots',
      'createMessage'
    ]);
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['show']);
    birthdayFacadeMock = jasmine.createSpyObj('BirthdayFacadeService', [
      'getMessagesByBirthday',
      'addMessageToBirthday',
      'updateMessageInBirthday',
      'deleteMessageFromBirthday'
    ]);

    scheduledMessageServiceMock.getMessageTemplates.and.returnValue([
      { title: 'Birthday', message: 'Happy birthday {name}!' },
      { title: 'Reminder', message: 'Don\'t forget {name}\'s birthday!' }
    ]);
    scheduledMessageServiceMock.getTimeSlots.and.returnValue(['09:00', '12:00', '18:00']);
    birthdayFacadeMock.getMessagesByBirthday.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        MessageSchedulerComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: ScheduledMessageService, useValue: scheduledMessageServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: BirthdayFacadeService, useValue: birthdayFacadeMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MessageSchedulerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.messageForm).toBeDefined();
    expect(component.messageForm.get('title')?.value).toBe('');
    expect(component.messageForm.get('message')?.value).toBe('');
    expect(component.messageForm.get('scheduledTime')?.value).toBe('09:00');
    expect(component.messageForm.get('priority')?.value).toBe('normal');
    expect(component.messageForm.get('active')?.value).toBe(true);
  });

  it('should load templates and time slots on construction', () => {
    expect(component.templates.length).toBe(2);
    expect(component.timeSlots.length).toBe(3);
    expect(scheduledMessageServiceMock.getMessageTemplates).toHaveBeenCalled();
    expect(scheduledMessageServiceMock.getTimeSlots).toHaveBeenCalled();
  });

  it('should validate required fields', () => {
    const form = component.messageForm;
    expect(form.valid).toBeFalse();

    form.patchValue({
      title: 'Test',
      message: 'Test message'
    });

    expect(form.valid).toBeTrue();
  });

  it('should process message template with birthday data', () => {
    component.birthday = mockBirthday;
    const result = component.getProcessedMessage(mockMessage);

    expect(result).toContain('John Doe');
    expect(result).toContain('36th');
    expect(result).not.toContain('{name}');
    expect(result).not.toContain('{age}');
  });

  it('should return unprocessed message when birthday is null', () => {
    component.birthday = null;
    const result = component.getProcessedMessage(mockMessage);

    expect(result).toBe(mockMessage.message);
  });

  it('should replace zodiac sign in message', () => {
    component.birthday = mockBirthday;
    const messageWithZodiac: ScheduledMessage = {
      ...mockMessage,
      message: 'You are a {zodiac}!'
    };
    const result = component.getProcessedMessage(messageWithZodiac);

    expect(result).toBe('You are a Capricorn!');
  });

  it('should format date correctly', () => {
    const date = new Date(2024, 0, 15, 14, 30);
    const result = component.formatDate(date);

    expect(result).toContain('15');
    expect(result).toContain('01');
    expect(result).toContain('2024');
  });

  it('should track messages by id', () => {
    const result = component.trackByMessageId(0, mockMessage);
    expect(result).toBe('msg1');
  });

  it('should track templates by title', () => {
    const template = { title: 'Test', message: 'Test msg' };
    const result = component.trackByTemplate(0, template);
    expect(result).toBe('Test');
  });

  it('should track by index when template has no title', () => {
    const template = { title: '', message: 'Test' };
    const result = component.trackByTemplate(5, template);
    expect(result).toBe('5');
  });

  it('should track by index', () => {
    const result = component.trackByIndex(3);
    expect(result).toBe(3);
  });

  it('should start creating message with default values', () => {
    component.startCreatingMessage();

    expect(component.isCreatingMessage).toBeTrue();
    expect(component.editingMessage).toBeNull();
    expect(component.messageForm.get('scheduledTime')?.value).toBe('09:00');
    expect(component.messageForm.get('priority')?.value).toBe('normal');
    expect(component.messageForm.get('active')?.value).toBe(true);
  });

  it('should apply template to form', () => {
    const template = { title: 'Birthday', message: 'Happy birthday!' };
    component.applyTemplate(template);

    expect(component.messageForm.get('title')?.value).toBe('Birthday');
    expect(component.messageForm.get('message')?.value).toBe('Happy birthday!');
  });

  it('should edit message and populate form', () => {
    component.editMessage(mockMessage);

    expect(component.isCreatingMessage).toBeTrue();
    expect(component.editingMessage).toBe(mockMessage);
    expect(component.messageForm.get('title')?.value).toBe(mockMessage.title);
    expect(component.messageForm.get('message')?.value).toBe(mockMessage.message);
  });

  it('should cancel edit and reset form', () => {
    component.isCreatingMessage = true;
    component.editingMessage = mockMessage;

    component.cancelEdit();

    expect(component.isCreatingMessage).toBeFalse();
    expect(component.editingMessage).toBeNull();
    expect(component.messageForm.get('title')?.value).toBeNull();
  });

  it('should use DestroyRef for subscription cleanup', () => {
    expect(component['destroyRef']).toBeTruthy();
  });

  it('should update message preview when birthday changes', () => {
    component.messageForm.patchValue({ message: 'Hi {name}' });
    component.birthday = mockBirthday;

    component.ngOnChanges({
      birthday: {
        currentValue: mockBirthday,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(component.messagePreview).toContain('John Doe');
  });

  it('should not crash when birthday is null in preview', () => {
    component.birthday = null;
    component.messageForm.patchValue({ message: 'Test' });

    expect(() => component.ngOnChanges({
      birthday: {
        currentValue: null,
        previousValue: mockBirthday,
        firstChange: false,
        isFirstChange: () => false
      }
    })).not.toThrow();

    expect(component.messagePreview).toBe('Test');
  });

  describe('loadMessages', () => {
    it('should load messages for birthday', () => {
      component.birthday = mockBirthday;
      birthdayFacadeMock.getMessagesByBirthday.and.returnValue(of([mockMessage]));

      component.loadMessages();

      expect(birthdayFacadeMock.getMessagesByBirthday).toHaveBeenCalledWith('1');
    });

    it('should handle null messages array', (done) => {
      component.birthday = mockBirthday;
      birthdayFacadeMock.getMessagesByBirthday.and.returnValue(of(null as unknown as ScheduledMessage[]));

      component.loadMessages();

      setTimeout(() => {
        expect(component.messages).toEqual([]);
        done();
      }, 50);
    });

    it('should not load messages when birthday is null', () => {
      component.birthday = null;
      component.loadMessages();

      expect(birthdayFacadeMock.getMessagesByBirthday).not.toHaveBeenCalled();
    });
  });

  describe('saveMessage', () => {
    beforeEach(() => {
      component.birthday = mockBirthday;
      component.messageForm.patchValue({
        title: 'Test',
        message: 'Test message',
        scheduledTime: '10:00',
        priority: 'high',
        active: true
      });
    });

    it('should create new message when not editing', async () => {
      scheduledMessageServiceMock.createMessage.and.returnValue(mockMessage);
      birthdayFacadeMock.getMessagesByBirthday.and.returnValue(of([]));

      await component.saveMessage();

      expect(scheduledMessageServiceMock.createMessage).toHaveBeenCalled();
      expect(birthdayFacadeMock.addMessageToBirthday).toHaveBeenCalledWith('1', mockMessage);
      expect(notificationServiceMock.show).toHaveBeenCalledWith('Scheduled message created!', 'success');
      expect(component.isCreatingMessage).toBeFalse();
    });

    it('should update existing message when editing', async () => {
      component.editingMessage = mockMessage;
      birthdayFacadeMock.getMessagesByBirthday.and.returnValue(of([]));

      await component.saveMessage();

      expect(birthdayFacadeMock.updateMessageInBirthday).toHaveBeenCalledWith(
        '1',
        'msg1',
        jasmine.any(Object)
      );
      expect(notificationServiceMock.show).toHaveBeenCalledWith('Message updated!', 'success');
      expect(component.isCreatingMessage).toBeFalse();
    });

    it('should not save when form is invalid', async () => {
      component.messageForm.patchValue({ title: '', message: '' });

      await component.saveMessage();

      expect(scheduledMessageServiceMock.createMessage).not.toHaveBeenCalled();
      expect(birthdayFacadeMock.addMessageToBirthday).not.toHaveBeenCalled();
    });

    it('should not save when birthday is null', async () => {
      component.birthday = null;

      await component.saveMessage();

      expect(scheduledMessageServiceMock.createMessage).not.toHaveBeenCalled();
      expect(birthdayFacadeMock.addMessageToBirthday).not.toHaveBeenCalled();
    });
  });

  describe('toggleMessageStatus', () => {
    it('should toggle message active status', async () => {
      component.birthday = mockBirthday;
      birthdayFacadeMock.getMessagesByBirthday.and.returnValue(of([]));

      await component.toggleMessageStatus(mockMessage);

      expect(birthdayFacadeMock.updateMessageInBirthday).toHaveBeenCalledWith(
        '1',
        'msg1',
        { active: false }
      );
    });

    it('should not toggle when birthday is null', async () => {
      component.birthday = null;

      await component.toggleMessageStatus(mockMessage);

      expect(birthdayFacadeMock.updateMessageInBirthday).not.toHaveBeenCalled();
    });
  });

  describe('testMessage', () => {
    it('should show test notification with processed message', () => {
      component.birthday = mockBirthday;

      component.testMessage(mockMessage);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        jasmine.stringContaining('🧪 TEST'),
        'info'
      );
    });

    it('should not show notification when birthday is null', () => {
      component.birthday = null;

      component.testMessage(mockMessage);

      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should delete message after confirmation', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.birthday = mockBirthday;
      birthdayFacadeMock.getMessagesByBirthday.and.returnValue(of([]));

      await component.deleteMessage(mockMessage);

      expect(birthdayFacadeMock.deleteMessageFromBirthday).toHaveBeenCalledWith('1', 'msg1');
      expect(notificationServiceMock.show).toHaveBeenCalledWith('Message deleted', 'success');
    });

    it('should not delete when confirmation is cancelled', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      component.birthday = mockBirthday;

      await component.deleteMessage(mockMessage);

      expect(birthdayFacadeMock.deleteMessageFromBirthday).not.toHaveBeenCalled();
    });

    it('should not delete when birthday is null', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.birthday = null;

      await component.deleteMessage(mockMessage);

      expect(birthdayFacadeMock.deleteMessageFromBirthday).not.toHaveBeenCalled();
    });
  });

  describe('message value changes', () => {
    it('should update preview when message value changes', (done) => {
      component.birthday = mockBirthday;
      fixture.detectChanges();

      component.messageForm.patchValue({ message: 'Hello {name}!' });

      setTimeout(() => {
        expect(component.messagePreview).toContain('John Doe');
        done();
      }, 50);
    });
  });
});
