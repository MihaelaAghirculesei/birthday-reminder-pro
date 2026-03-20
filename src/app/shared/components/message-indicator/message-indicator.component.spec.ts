import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageIndicatorComponent } from './message-indicator.component';
import { provideTranslateTesting } from '../../../../testing/translate-testing';
import { Birthday, ScheduledMessage } from '../../models';

describe('MessageIndicatorComponent', () => {
  let component: MessageIndicatorComponent;
  let fixture: ComponentFixture<MessageIndicatorComponent>;

  const createMockMessage = (id: string, title: string, time: string, active: boolean): ScheduledMessage => ({
    id,
    birthdayId: '1',
    title,
    message: 'Test message',
    scheduledTime: time,
    priority: 'normal',
    active,
    messageType: 'text',
    createdDate: new Date()
  });

  const createMockBirthday = (messages?: ScheduledMessage[]): Birthday => ({
    id: '1',
    name: 'John Doe',
    birthDate: '1990-01-15',
    category: 'Family',
    scheduledMessages: messages
  });

  function setBirthday(birthday: Birthday | null): void {
    component.birthday = birthday;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageIndicatorComponent, NoopAnimationsModule],
      providers: [provideTranslateTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(MessageIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('hasActiveMessages', () => {
    it('should be false when birthday is null', () => {
      setBirthday(null);
      expect(component.hasActiveMessages()).toBeFalse();
    });

    it('should be false when birthday has no scheduledMessages', () => {
      setBirthday(createMockBirthday());
      expect(component.hasActiveMessages()).toBeFalse();
    });

    it('should be false when birthday has empty scheduledMessages array', () => {
      setBirthday(createMockBirthday([]));
      expect(component.hasActiveMessages()).toBeFalse();
    });

    it('should be false when all messages are inactive', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', false),
        createMockMessage('2', 'Msg2', '12:00', false)
      ]));
      expect(component.hasActiveMessages()).toBeFalse();
    });

    it('should be true when at least one message is active', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', true),
        createMockMessage('2', 'Msg2', '12:00', false)
      ]));
      expect(component.hasActiveMessages()).toBeTrue();
    });
  });

  describe('activeMessageCount', () => {
    it('should be 0 when birthday is null', () => {
      setBirthday(null);
      expect(component.activeMessageCount()).toBe(0);
    });

    it('should be 0 when no messages are active', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', false),
        createMockMessage('2', 'Msg2', '12:00', false)
      ]));
      expect(component.activeMessageCount()).toBe(0);
    });

    it('should return correct count of active messages', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', true),
        createMockMessage('2', 'Msg2', '12:00', false),
        createMockMessage('3', 'Msg3', '18:00', true)
      ]));
      expect(component.activeMessageCount()).toBe(2);
    });
  });

  describe('tooltipKey and tooltipParams', () => {
    it('should return NO_INFO key when birthday is null', () => {
      setBirthday(null);
      expect(component.tooltipKey()).toBe('MESSAGE_INDICATOR.NO_INFO');
    });

    it('should return NO_MESSAGES key when no messages exist', () => {
      setBirthday(createMockBirthday([]));
      expect(component.tooltipKey()).toBe('MESSAGE_INDICATOR.NO_MESSAGES');
    });

    it('should return DISABLED_MANY key with count when all messages are inactive', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', false),
        createMockMessage('2', 'Msg2', '12:00', false)
      ]));
      expect(component.tooltipKey()).toBe('MESSAGE_INDICATOR.DISABLED_MANY');
      expect(component.tooltipParams()).toEqual({ count: 2 });
    });

    it('should return DISABLED_ONE key when one inactive message exists', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', false)
      ]));
      expect(component.tooltipKey()).toBe('MESSAGE_INDICATOR.DISABLED_ONE');
      expect(component.tooltipParams()).toEqual({ count: 1 });
    });

    it('should return ONE_ACTIVE key with title and time for single active message', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Birthday Reminder', '09:00', true)
      ]));
      expect(component.tooltipKey()).toBe('MESSAGE_INDICATOR.ONE_ACTIVE');
      expect(component.tooltipParams()).toEqual({ title: 'Birthday Reminder', time: '09:00' });
    });

    it('should return ALL_ACTIVE key with count when all messages are active', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', true),
        createMockMessage('2', 'Msg2', '12:00', true),
        createMockMessage('3', 'Msg3', '18:00', true)
      ]));
      expect(component.tooltipKey()).toBe('MESSAGE_INDICATOR.ALL_ACTIVE');
      expect(component.tooltipParams()).toEqual({ count: 3 });
    });

    it('should return SOME_ACTIVE key with active and total counts', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', true),
        createMockMessage('2', 'Msg2', '12:00', false),
        createMockMessage('3', 'Msg3', '18:00', true)
      ]));
      expect(component.tooltipKey()).toBe('MESSAGE_INDICATOR.SOME_ACTIVE');
      expect(component.tooltipParams()).toEqual({ active: 2, total: 3 });
    });

    it('should update when birthday changes', () => {
      setBirthday(createMockBirthday([]));
      const initialKey = component.tooltipKey();

      setBirthday(createMockBirthday([
        createMockMessage('1', 'Test', '09:00', true)
      ]));
      expect(component.tooltipKey()).not.toBe(initialKey);
    });
  });
});
