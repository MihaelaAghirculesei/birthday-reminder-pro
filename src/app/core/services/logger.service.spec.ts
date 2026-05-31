import { TestBed } from '@angular/core/testing';

import { provideTranslateTesting } from '../../testing/translate-testing';
import { LoggerService, SILENT_LOGGER_PROVIDER,SILENT_LOGGING } from './logger.service';

describe('LoggerService', () => {
  // isDevMode() returns true in test environment

  describe('default (non-silent) mode', () => {
    let logger: LoggerService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [LoggerService, provideTranslateTesting()]
      });
      logger = TestBed.inject(LoggerService);
    });

    it('should create', () => {
      expect(logger).toBeTruthy();
    });

    it('should call console.log', () => {
      spyOn(console, 'log');
      logger.log('test');
      expect(console.log).toHaveBeenCalledWith('test');
    });

    it('should call console.info', () => {
      spyOn(console, 'info');
      logger.info('test');
      expect(console.info).toHaveBeenCalledWith('test');
    });

    it('should call console.warn', () => {
      spyOn(console, 'warn');
      logger.warn('warning');
      expect(console.warn).toHaveBeenCalledWith('warning');
    });

    it('should call console.error', () => {
      spyOn(console, 'error');
      logger.error('error');
      expect(console.error).toHaveBeenCalledWith('error');
    });

    it('should call console.group', () => {
      spyOn(console, 'group');
      logger.group('label');
      expect(console.group).toHaveBeenCalledWith('label');
    });

    it('should call console.groupEnd', () => {
      spyOn(console, 'groupEnd');
      logger.groupEnd();
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('should pass multiple arguments to console.error', () => {
      spyOn(console, 'error');
      logger.error('msg', { detail: 1 }, 42);
      expect(console.error).toHaveBeenCalledWith('msg', { detail: 1 }, 42);
    });
  });

  describe('silent mode', () => {
    let logger: LoggerService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [LoggerService, SILENT_LOGGER_PROVIDER, provideTranslateTesting()]
      });
      logger = TestBed.inject(LoggerService);
    });

    it('should suppress console.log', () => {
      spyOn(console, 'log');
      logger.log('test');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should suppress console.info', () => {
      spyOn(console, 'info');
      logger.info('test');
      expect(console.info).not.toHaveBeenCalled();
    });

    it('should suppress console.warn', () => {
      spyOn(console, 'warn');
      logger.warn('test');
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should suppress console.error', () => {
      spyOn(console, 'error');
      logger.error('test');
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should suppress console.group', () => {
      spyOn(console, 'group');
      logger.group('label');
      expect(console.group).not.toHaveBeenCalled();
    });

    it('should suppress console.groupEnd', () => {
      spyOn(console, 'groupEnd');
      logger.groupEnd();
      expect(console.groupEnd).not.toHaveBeenCalled();
    });
  });

  describe('SILENT_LOGGING not provided', () => {
    it('should default to non-silent when token is not provided', () => {
      TestBed.configureTestingModule({
        providers: [LoggerService, provideTranslateTesting()]
      });
      const logger = TestBed.inject(LoggerService);
      spyOn(console, 'error');
      logger.error('test');
      expect(console.error).toHaveBeenCalledWith('test');
    });
  });

  describe('SILENT_LOGGING explicitly false', () => {
    it('should behave as non-silent', () => {
      TestBed.configureTestingModule({
        providers: [
          LoggerService,
          { provide: SILENT_LOGGING, useValue: false },
          provideTranslateTesting()
        ]
      });
      const logger = TestBed.inject(LoggerService);
      spyOn(console, 'error');
      logger.error('test');
      expect(console.error).toHaveBeenCalledWith('test');
    });
  });
});
