import { TestBed } from '@angular/core/testing';
import { FirestoreService } from './firestore.service';
import { LoggerService } from './logger.service';
import { Birthday, Category } from '../../shared/models/birthday.model';
import { FIREBASE_OPTIONS } from '../../firebase.config';
import * as firebaseConfig from '../../firebase.config';
import { provideTranslateTesting } from '../../testing/translate-testing';

describe('FirestoreService', () => {
  describe('basic tests', () => {
    let service: FirestoreService;
    let loggerMock: jasmine.SpyObj<LoggerService>;

    beforeEach(() => {
      loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: loggerMock },
          { provide: FIREBASE_OPTIONS, useValue: undefined },
          provideTranslateTesting()
        ]
      });

      service = TestBed.inject(FirestoreService);
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
      const birthday = { id: '1', name: 'Test', birthDate: '2000-01-01' } as Birthday;
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

  describe('error branches', () => {
    const networkError = new Error('network-error');
    const VALID_OPTIONS = { apiKey: 'test-api-key', projectId: 'test-project' };

    let service: FirestoreService;
    let loggerMock: jasmine.SpyObj<LoggerService>;
    let mockBatch: { set: jasmine.Spy; delete: jasmine.Spy; commit: jasmine.Spy };

    beforeEach(() => {
      loggerMock = jasmine.createSpyObj('LoggerService', ['log', 'info', 'warn', 'error']);

      TestBed.configureTestingModule({
        providers: [
          { provide: LoggerService, useValue: loggerMock },
          { provide: FIREBASE_OPTIONS, useValue: VALID_OPTIONS },
          provideTranslateTesting()
        ]
      });

      service = TestBed.inject(FirestoreService);

      mockBatch = {
        set: jasmine.createSpy('batch.set'),
        delete: jasmine.createSpy('batch.delete'),
        commit: jasmine.createSpy('batch.commit').and.rejectWith(networkError),
      };

      // firebaseGetters is a plain object, so its properties are writable —
      // no Object.defineProperty tricks needed. spyOn works out of the box.
      spyOn(firebaseConfig.firebaseGetters, 'getFirebaseFirestore').and.returnValue(
        {} as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirebaseFirestore>
      );
    });

    it('getBirthdays should log and rethrow on getDocs failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.rejectWith(networkError),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.getBirthdays('user-123').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to fetch birthdays:', networkError);
          done();
        }
      });
    });

    it('getCategories should log and rethrow on getDocs failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        collection: jasmine.createSpy().and.returnValue({}),
        getDocs: jasmine.createSpy().and.rejectWith(networkError),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.getCategories('user-123').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to fetch categories:', networkError);
          done();
        }
      });
    });

    it('saveBirthday should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-1', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthday('user-123', birthday).subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save birthday:', networkError);
          done();
        }
      });
    });

    it('deleteBirthday should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.deleteBirthday('user-123', 'b-1').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to delete birthday:', networkError);
          done();
        }
      });
    });

    it('saveBirthdaysBatch should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
        Timestamp: { fromDate: jasmine.createSpy().and.returnValue({}) },
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const birthday = { id: 'b-1', name: 'Test', birthDate: '2000-01-01', syncStatus: 'local-only' } as Birthday;
      service.saveBirthdaysBatch('user-123', [birthday]).subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Batch save failed:', networkError);
          done();
        }
      });
    });

    it('saveCategory should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      const category = { id: 'c-1', name: 'Test', icon: 'star', color: '#000' } as Category;
      service.saveCategory('user-123', category).subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to save category:', networkError);
          done();
        }
      });
    });

    it('deleteCategory should log and rethrow on commit failure', (done) => {
      spyOn(firebaseConfig.firebaseGetters, 'getFirestoreModule').and.returnValue({
        writeBatch: jasmine.createSpy().and.returnValue(mockBatch),
        doc: jasmine.createSpy().and.returnValue({}),
        serverTimestamp: jasmine.createSpy().and.returnValue({}),
      } as unknown as ReturnType<typeof firebaseConfig.firebaseGetters.getFirestoreModule>);

      service.deleteCategory('user-123', 'c-1').subscribe({
        error: (err) => {
          expect(err).toBe(networkError);
          expect(loggerMock.error).toHaveBeenCalledWith('[Firestore] Failed to delete category:', networkError);
          done();
        }
      });
    });
  });
});
