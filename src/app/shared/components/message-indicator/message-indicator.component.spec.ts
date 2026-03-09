import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageIndicatorComponent } from './message-indicator.component';
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
    birthDate: new Date(1990, 0, 15),
    category: 'Family',
    scheduledMessages: messages
  });

  function setBirthday(birthday: Birthday | null): void {
    component.birthday = birthday;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageIndicatorComponent, NoopAnimationsModule]
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

  describe('tooltipText', () => {
    it('should show "No information available" when birthday is null', () => {
      setBirthday(null);
      expect(component.tooltipText()).toBe('No information available');
    });

    it('should show "No messages configured" when no messages exist', () => {
      setBirthday(createMockBirthday([]));
      expect(component.tooltipText()).toContain('No messages configured');
    });

    it('should show "configured but disabled" when all messages are inactive', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', false),
        createMockMessage('2', 'Msg2', '12:00', false)
      ]));
      expect(component.tooltipText()).toContain('2 messages configured but disabled');
    });

    it('should show singular "message" when one inactive message exists', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', false)
      ]));
      expect(component.tooltipText()).toContain('1 message configured but disabled');
    });

    it('should show detailed info for single active message', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Birthday Reminder', '09:00', true)
      ]));
      expect(component.tooltipText()).toContain('Message configured: "Birthday Reminder"');
      expect(component.tooltipText()).toContain('sending at 09:00');
    });

    it('should show count when all messages are active', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', true),
        createMockMessage('2', 'Msg2', '12:00', true),
        createMockMessage('3', 'Msg3', '18:00', true)
      ]));
      expect(component.tooltipText()).toBe('✅ 3 messages configured and active for birthday');
    });

    it('should show partial count when some messages are active', () => {
      setBirthday(createMockBirthday([
        createMockMessage('1', 'Msg1', '09:00', true),
        createMockMessage('2', 'Msg2', '12:00', false),
        createMockMessage('3', 'Msg3', '18:00', true)
      ]));
      expect(component.tooltipText()).toBe('✅ 2 of 3 configured messages are active');
    });

    it('should update when birthday changes', () => {
      setBirthday(createMockBirthday([]));
      const initialTooltip = component.tooltipText();

      setBirthday(createMockBirthday([
        createMockMessage('1', 'Test', '09:00', true)
      ]));
      expect(component.tooltipText()).not.toBe(initialTooltip);
    });
  });
});
