import { TestBed } from '@angular/core/testing';
import { ScheduledMessageService } from '../../shared/services/scheduled-message.service';
import { provideTranslateTesting } from '../../../testing/translate-testing';
import { IdGeneratorService } from '../../core/services/id-generator.service';

describe('ScheduledMessageService', () => {
  let service: ScheduledMessageService;
  let idGeneratorMock: jasmine.SpyObj<IdGeneratorService>;

  beforeEach(() => {
    idGeneratorMock = jasmine.createSpyObj('IdGeneratorService', ['generateId']);
    idGeneratorMock.generateId.and.returnValue('test-id-123');

    TestBed.configureTestingModule({
      providers: [
        ScheduledMessageService,
        { provide: IdGeneratorService, useValue: idGeneratorMock },
        provideTranslateTesting()
      ]
    });
    service = TestBed.inject(ScheduledMessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createMessage', () => {
    it('should create a message with defaults', () => {
      const message = service.createMessage({});
      expect(message.id).toBe('test-id-123');
      expect(message.title).toBe('');
      expect(message.message).toBe('');
      expect(message.scheduledTime).toBe('09:00');
      expect(message.active).toBeTrue();
      expect(message.messageType).toBe('text');
      expect(message.priority).toBe('normal');
      expect(message.createdDate).toBeDefined();
    });

    it('should use provided values', () => {
      const message = service.createMessage({
        title: 'Happy Birthday!',
        message: 'Wish you the best',
        scheduledTime: '14:30',
        active: false,
        messageType: 'html',
        priority: 'high',
        birthdayId: 'bday-1'
      });
      expect(message.title).toBe('Happy Birthday!');
      expect(message.message).toBe('Wish you the best');
      expect(message.scheduledTime).toBe('14:30');
      expect(message.active).toBeFalse();
      expect(message.messageType).toBe('html');
      expect(message.priority).toBe('high');
      expect(message.birthdayId).toBe('bday-1');
    });

    it('should generate unique id via IdGeneratorService', () => {
      service.createMessage({});
      expect(idGeneratorMock.generateId).toHaveBeenCalled();
    });
  });

  describe('getMessageTemplates', () => {
    it('should return an array of templates', () => {
      const templates = service.getMessageTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should have title and message on each template', () => {
      const templates = service.getMessageTemplates();
      templates.forEach(t => {
        expect(t.title).toBeTruthy();
        expect(t.message).toBeTruthy();
      });
    });

    it('should include placeholder tokens in messages', () => {
      const templates = service.getMessageTemplates();
      const allMessages = templates.map(t => t.message).join(' ');
      expect(allMessages).toContain('{name}');
    });
  });

  describe('getTimeSlots', () => {
    it('should return 48 time slots (24h x 30min)', () => {
      const slots = service.getTimeSlots();
      expect(slots.length).toBe(48);
    });

    it('should start at 00:00', () => {
      expect(service.getTimeSlots()[0]).toBe('00:00');
    });

    it('should end at 23:30', () => {
      const slots = service.getTimeSlots();
      expect(slots[slots.length - 1]).toBe('23:30');
    });

    it('should have properly formatted times', () => {
      const slots = service.getTimeSlots();
      slots.forEach(slot => {
        expect(slot).toMatch(/^\d{2}:\d{2}$/);
      });
    });
  });
});
