import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { MessageSchedulerComponent } from './message-scheduler.component';
import { ScheduledMessageService } from '../../../features/scheduled-messages/scheduled-message.service';
import { NotificationService } from '../../../core';
import { Birthday, ScheduledMessage } from '../..';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

describe('MessageSchedulerComponent', () => {
  let component: MessageSchedulerComponent;
  let fixture: ComponentFixture<MessageSchedulerComponent>;
  let scheduledMessageServiceMock: jasmine.SpyObj<ScheduledMessageService>;
  let notificationServiceMock: jasmine.SpyObj<NotificationService>;
  let dialogMock: jasmine.SpyObj<MatDialog>;
  let store: MockStore;

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
      'createMessage'
    ]);
    notificationServiceMock = jasmine.createSpyObj('NotificationService', ['show']);
    dialogMock = jasmine.createSpyObj('MatDialog', ['open']);

    scheduledMessageServiceMock.getMessageTemplates.and.returnValue([
      { title: 'Birthday', message: 'Happy birthday {name}!' },
      { title: 'Reminder', message: 'Don\'t forget {name}\'s birthday!' }
    ]);

    await TestBed.configureTestingModule({
      imports: [
        MessageSchedulerComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        provideMockStore({
          initialState: {
            birthdays: {
              ids: ['1'],
              entities: { '1': { id: '1', name: 'John Doe', birthDate: new Date(1990, 0, 15), category: 'Family', zodiacSign: 'Capricorn', scheduledMessages: [] } },
              loading: false, error: null, selectedId: null,
              filters: { searchTerm: '', selectedCategory: null }
            }
          }
        }),
        { provide: ScheduledMessageService, useValue: scheduledMessageServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: MatDialog, useValue: dialogMock }
      ]
    }).compileComponents();

    store = TestBed.inject(MockStore);

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

  it('should load templates on construction', () => {
    expect(component.templates.length).toBe(2);
    expect(scheduledMessageServiceMock.getMessageTemplates).toHaveBeenCalled();
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

  it('should pre-compute processed messages in enrichedMessages', () => {
    component.birthday = mockBirthday;
    store.setState({ birthdays: { ids: ['1'], entities: { '1': { ...mockBirthday, scheduledMessages: [mockMessage] } }, loading: false, error: null, selectedId: null, filters: { searchTerm: '', selectedCategory: null } } });
    component.loadMessages();

    expect(component.enrichedMessages().length).toBe(1);
    expect(component.enrichedMessages()[0].processedMessage).toContain('John Doe');
    expect(component.enrichedMessages()[0].processedMessage).not.toContain('{name}');
    expect(component.enrichedMessages()[0].processedMessage).not.toContain('{age}');
  });

  it('should have empty enrichedMessages when birthday is null', () => {
    component.birthday = null;
    expect(component.enrichedMessages()).toEqual([]);
  });

  it('should replace zodiac sign in enriched messages', () => {
    component.birthday = mockBirthday;
    const messageWithZodiac: ScheduledMessage = {
      ...mockMessage,
      message: 'You are a {zodiac}!'
    };
    store.setState({ birthdays: { ids: ['1'], entities: { '1': { ...mockBirthday, scheduledMessages: [messageWithZodiac] } }, loading: false, error: null, selectedId: null, filters: { searchTerm: '', selectedCategory: null } } });
    component.loadMessages();

    expect(component.enrichedMessages()[0].processedMessage).toBe('You are a Capricorn!');
  });

  it('should pre-compute wishLinks in enrichedMessages', () => {
    component.birthday = { ...mockBirthday, email: 'test@example.com' };
    store.setState({ birthdays: { ids: ['1'], entities: { '1': { ...mockBirthday, email: 'test@example.com', scheduledMessages: [mockMessage] } }, loading: false, error: null, selectedId: null, filters: { searchTerm: '', selectedCategory: null } } });
    component.loadMessages();

    expect(component.enrichedMessages()[0].wishLinks).toBeDefined();
    expect(Array.isArray(component.enrichedMessages()[0].wishLinks)).toBeTrue();
  });

  it('should pre-compute formatted dates in enrichedMessages', () => {
    component.birthday = mockBirthday;
    store.setState({ birthdays: { ids: ['1'], entities: { '1': { ...mockBirthday, scheduledMessages: [mockMessage] } }, loading: false, error: null, selectedId: null, filters: { searchTerm: '', selectedCategory: null } } });
    component.loadMessages();

    expect(component.enrichedMessages()[0].formattedCreatedDate).toBeDefined();
    expect(component.enrichedMessages()[0].formattedCreatedDate).toContain(new Date().getFullYear().toString());
  });

  it('should track messages by id', () => {
    const result = component.trackByMessageId(0, mockMessage);
    expect(result).toBe('msg1');
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
      component.loadMessages();

      // Just verify it doesn't throw - messages come from store subscription
      expect(component.messages).toBeDefined();
    });

    it('should not load messages when birthday is null', () => {
      component.birthday = null;
      component.loadMessages();

      expect(component.messages).toEqual([]);
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

    it('should create new message when not editing', () => {
      scheduledMessageServiceMock.createMessage.and.returnValue(mockMessage);
      spyOn(store, 'dispatch');

      component.saveMessage();

      expect(scheduledMessageServiceMock.createMessage).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith('Scheduled message created!', 'success');
      expect(component.isCreatingMessage).toBeFalse();
    });

    it('should update existing message when editing', () => {
      component.editingMessage = mockMessage;
      spyOn(store, 'dispatch');

      component.saveMessage();

      expect(store.dispatch).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith('Message updated!', 'success');
      expect(component.isCreatingMessage).toBeFalse();
    });

    it('should not save when form is invalid', () => {
      component.messageForm.patchValue({ title: '', message: '' });
      spyOn(store, 'dispatch');

      component.saveMessage();

      expect(scheduledMessageServiceMock.createMessage).not.toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should not save when birthday is null', () => {
      component.birthday = null;
      spyOn(store, 'dispatch');

      component.saveMessage();

      expect(scheduledMessageServiceMock.createMessage).not.toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('toggleMessageStatus', () => {
    it('should toggle message active status', () => {
      component.birthday = mockBirthday;
      spyOn(store, 'dispatch');

      component.toggleMessageStatus(mockMessage);

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should not toggle when birthday is null', () => {
      component.birthday = null;
      spyOn(store, 'dispatch');

      component.toggleMessageStatus(mockMessage);

      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('testMessage', () => {
    it('should show test notification with processed message', () => {
      component.birthday = mockBirthday;

      component.testMessage(mockMessage);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        jasmine.stringContaining('TEST'),
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
    it('should delete message after confirmation', fakeAsync(() => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(true));
      dialogMock.open.and.returnValue(mockDialogRef);
      component.birthday = mockBirthday;
      spyOn(store, 'dispatch');

      component.deleteMessage(mockMessage);
      tick();

      expect(store.dispatch).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith('Message deleted', 'success');
    }));

    it('should not delete when confirmation is cancelled', () => {
      const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      mockDialogRef.afterClosed.and.returnValue(of(false));
      dialogMock.open.and.returnValue(mockDialogRef);
      component.birthday = mockBirthday;
      spyOn(store, 'dispatch');

      component.deleteMessage(mockMessage);

      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should not delete when birthday is null', () => {
      component.birthday = null;
      spyOn(store, 'dispatch');

      component.deleteMessage(mockMessage);

      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('hasAnyContact', () => {
    it('should return false when birthday is null', () => {
      component.birthday = null;
      expect(component.hasAnyContact).toBeFalse();
    });

    it('should return false when birthday has no contact info', () => {
      component.birthday = mockBirthday;
      expect(component.hasAnyContact).toBeFalse();
    });

    it('should return true when birthday has email', () => {
      component.birthday = { ...mockBirthday, email: 'test@example.com' };
      expect(component.hasAnyContact).toBeTrue();
    });

    it('should return true when birthday has phone', () => {
      component.birthday = { ...mockBirthday, phone: '+1234567890' };
      expect(component.hasAnyContact).toBeTrue();
    });

    it('should return true when birthday has telegram', () => {
      component.birthday = { ...mockBirthday, telegramUsername: 'testuser' };
      expect(component.hasAnyContact).toBeTrue();
    });

    it('should return false when contact fields are empty strings', () => {
      component.birthday = { ...mockBirthday, email: '', phone: '  ', telegramUsername: '' };
      expect(component.hasAnyContact).toBeFalse();
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
