import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { IdGeneratorService } from './id-generator.service';

const cryptoRef = crypto as unknown as { randomUUID?: () => string };

describe('IdGeneratorService', () => {
  let service: IdGeneratorService;

  describe('Browser with crypto.randomUUID', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          IdGeneratorService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });
      service = TestBed.inject(IdGeneratorService);
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should generate a valid UUID using crypto.randomUUID', () => {
      const id = service.generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const id1 = service.generateId();
      const id2 = service.generateId();
      expect(id1).not.toEqual(id2);
    });
  });

  describe('Browser with crypto.getRandomValues (no randomUUID)', () => {
    let originalRandomUUID: (() => string) | undefined;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          IdGeneratorService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });

      originalRandomUUID = cryptoRef.randomUUID;
      delete cryptoRef.randomUUID;

      service = TestBed.inject(IdGeneratorService);
    });

    afterEach(() => {
      if (originalRandomUUID) {
        cryptoRef.randomUUID = originalRandomUUID;
      }
    });

    it('should generate a valid UUID using crypto.getRandomValues', () => {
      const id = service.generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');

      // UUID v4 format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs with getRandomValues', () => {
      const id1 = service.generateId();
      const id2 = service.generateId();
      expect(id1).not.toEqual(id2);
    });

    it('should set correct version and variant bits in UUID', () => {
      const id = service.generateId();
      const parts = id.split('-');

      // Version should be 4
      expect(parts[2][0]).toBe('4');

      // Variant should be 8, 9, a, or b
      expect(['8', '9', 'a', 'b']).toContain(parts[3][0].toLowerCase());
    });
  });

  describe('Server-side rendering (no crypto)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          IdGeneratorService,
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });
      service = TestBed.inject(IdGeneratorService);
    });

    it('should generate a fallback ID on server', () => {
      const id = service.generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');

      // Fallback format: timestamp-random-random
      const parts = id.split('-');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBeTruthy();
      expect(parts[1]).toBeTruthy();
      expect(parts[2]).toBeTruthy();
    });

    it('should generate unique fallback IDs', () => {
      const id1 = service.generateId();
      const id2 = service.generateId();
      expect(id1).not.toEqual(id2);
    });

    it('should include timestamp in fallback ID', () => {
      const beforeTimestamp = Date.now();
      const id = service.generateId();
      const afterTimestamp = Date.now();

      const parts = id.split('-');
      const timestampPart = parseInt(parts[0], 36);

      expect(timestampPart).toBeGreaterThanOrEqual(parseInt(beforeTimestamp.toString(36), 36));
      expect(timestampPart).toBeLessThanOrEqual(parseInt(afterTimestamp.toString(36), 36));
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          IdGeneratorService,
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });
      service = TestBed.inject(IdGeneratorService);
    });

    it('should generate IDs that are non-empty strings', () => {
      const id = service.generateId();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate consistent length IDs', () => {
      const id1 = service.generateId();
      const id2 = service.generateId();
      const id3 = service.generateId();

      expect(id1.length).toBe(id2.length);
      expect(id2.length).toBe(id3.length);
    });

    it('should generate many unique IDs without collisions', () => {
      const ids = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        ids.add(service.generateId());
      }

      expect(ids.size).toBe(count);
    });
  });
});
