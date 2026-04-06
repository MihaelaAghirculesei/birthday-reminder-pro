/**
 * Base class for all application-defined errors.
 *
 * Using a class hierarchy instead of string matching lets GlobalErrorHandler
 * categorize errors reliably without coupling to message text.
 * `Object.setPrototypeOf` fixes the prototype chain for `instanceof` checks
 * in TypeScript code transpiled to ES5.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Base class for all IndexedDB-layer failures detected by application code.
 *
 * Native browser DOMExceptions (`QuotaExceededError`, `InvalidStateError`)
 * are handled separately via name-based checks in GlobalErrorHandler because
 * they cannot be subclassed.
 */
export class IdbError extends AppError {}

/** Thrown when IndexedDB is accessed in a server-side (SSR) context. */
export class IdbUnavailableError extends IdbError {
  constructor() {
    super('IndexedDB is not available in a server-side context');
  }
}

/** Thrown when a schema migration step is missing or fails during `onupgradeneeded`. */
export class IdbMigrationError extends IdbError {}
