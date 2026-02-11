import { TestBed } from '@angular/core/testing';
import { FirestoreService } from './firestore.service';
import { LoggerService } from './logger.service';
import { Birthday, Category } from '../../shared/models/birthday.model';
import { environment } from '../../../environments/environment';

describe('FirestoreService', () => {
  let service: FirestoreService;
  let loggerMock: jasmine.SpyObj<LoggerService>;
  const originalFirebase = environment.firebase;

  beforeEach(() => {
    // Force isFirebaseConfigured() to return false — no real Firebase calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).firebase = undefined;

    loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggerService, useValue: loggerMock }
      ]
    });

    service = TestBed.inject(FirestoreService);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (environment as any).firebase = originalFirebase;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('birthdays$ should be an observable', () => {
    expect(service.birthdays$).toBeTruthy();
    expect(service.birthdays$.subscribe).toBeDefined();
  });

  it('categories$ should be an observable', () => {
    expect(service.categories$).toBeTruthy();
    expect(service.categories$.subscribe).toBeDefined();
  });

  it('unsubscribeFromBirthdays should not throw when no listener', () => {
    expect(() => service.unsubscribeFromBirthdays()).not.toThrow();
  });

  it('unsubscribeFromCategories should not throw when no listener', () => {
    expect(() => service.unsubscribeFromCategories()).not.toThrow();
  });

  it('unsubscribeAll should not throw when no listeners', () => {
    expect(() => service.unsubscribeAll()).not.toThrow();
  });

  it('getBirthdays should return an observable', () => {
    const result = service.getBirthdays('user-123');
    expect(result).toBeTruthy();
    expect(result.subscribe).toBeDefined();
  });

  it('getCategories should return an observable', () => {
    const result = service.getCategories('user-123');
    expect(result).toBeTruthy();
    expect(result.subscribe).toBeDefined();
  });

  it('saveBirthday should return an observable', () => {
    const birthday = { id: '1', name: 'Test', birthDate: new Date() } as Birthday;
    const result = service.saveBirthday('user-123', birthday);
    expect(result).toBeTruthy();
    expect(result.subscribe).toBeDefined();
  });

  it('deleteBirthday should return an observable', () => {
    const result = service.deleteBirthday('user-123', 'b-1');
    expect(result).toBeTruthy();
    expect(result.subscribe).toBeDefined();
  });

  it('saveCategory should return an observable', () => {
    const category = { id: '1', name: 'Test', icon: 'star', color: '#000' } as Category;
    const result = service.saveCategory('user-123', category);
    expect(result).toBeTruthy();
    expect(result.subscribe).toBeDefined();
  });

  it('deleteCategory should return an observable', () => {
    const result = service.deleteCategory('user-123', 'c-1');
    expect(result).toBeTruthy();
    expect(result.subscribe).toBeDefined();
  });

  it('saveBirthdaysBatch should return an observable', () => {
    const result = service.saveBirthdaysBatch('user-123', []);
    expect(result).toBeTruthy();
    expect(result.subscribe).toBeDefined();
  });

  it('subscribeToBirthdays should not throw', () => {
    expect(() => service.subscribeToBirthdays('user-123')).not.toThrow();
  });

  it('subscribeToCategories should not throw', () => {
    expect(() => service.subscribeToCategories('user-123')).not.toThrow();
  });
});
