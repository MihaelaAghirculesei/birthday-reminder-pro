// ─── Infrastructure ───────────────────────────────────────────────────────────
export { ERROR_REPORTER,ErrorReport, ErrorReporter, ErrorReportingService, SerializedErrorReport } from './error-reporting.service';
export { FeatureFlagsService } from './feature-flags.service';
export { GlobalErrorHandler } from './global-error-handler.service';
export { IdGeneratorService } from './id-generator.service';
export { AppLocale,LocaleService } from './locale.service';
export { LoggerService, SILENT_LOGGER_PROVIDER,SILENT_LOGGING } from './logger.service';
export { NetworkService } from './network.service';
export { SecureStorageService } from './secure-storage.service';
export { SelectivePreloadingStrategy } from './selective-preloading.strategy';
export { SentryClient, SentryClientHolder, SentryReporterService } from './sentry-reporter.service';
export { ThemeService } from './theme.service';

// ─── Offline Storage (IndexedDB) ──────────────────────────────────────────────
export { CURRENT_DATA_VERSION,IdbDataMigrationService } from './idb-data-migration.service';
export { IndexedDBConnectionService } from './indexeddb-connection.service';
export { IndexedDBStorageService } from './offline-storage.service';

// ─── Birthday ─────────────────────────────────────────────────────────────────
export { BackupData, BackupService, ImportResult } from './backup.service';
export { BirthdayService } from './birthday.service';
export { BirthdayMergeService, MergeOptions,MergeResult, MergeStrategy } from './birthday-merge.service';
export { BirthdayNormalizationService } from './birthday-normalization.service';

// ─── Category ─────────────────────────────────────────────────────────────────
export { CategoryFacadeService } from './category-facade.service';
export { CategoryStorageService } from './category-storage.service';

// ─── Notifications ────────────────────────────────────────────────────────────
export { BrowserNotificationSchedulerService } from './browser-notification-scheduler.service';
export { NotificationMessage,NotificationService } from './notification.service';
export { NotificationFormatterService } from './notification-formatter.service';
export { NotificationPermissionService, NotificationPermissionStatus } from './notification-permission.service';
export { BirthdayNotificationData,PushNotificationService } from './push-notification.service';
export { SenderSettingsService } from './sender-settings.service';

// ─── Google Calendar ──────────────────────────────────────────────────────────
export { CalendarIntegrationService } from './calendar-integration.service';
export { GoogleApiErrorDetails,GoogleApiErrorService } from './google-api-error.service';
export { GoogleApiLoaderService } from './google-api-loader.service';
export { GoogleCalendarItem,GoogleCalendarService, GoogleCalendarSettings } from './google-calendar.service';
export { GoogleCalendarAuthService } from './google-calendar-auth.service';

// ─── Firebase Auth ────────────────────────────────────────────────────────────
export { AuthUser,FirebaseAuthService } from './firebase-auth.service';

// ─── Firebase Storage (Photos) ────────────────────────────────────────────────
export { OrphanPhotoCleanupService } from './orphan-photo-cleanup.service';
export { PhotoStorageService } from './photo-storage.service';

// ─── Firestore ────────────────────────────────────────────────────────────────
export { FirestoreService } from './firestore.service';

// ─── Sync ─────────────────────────────────────────────────────────────────────
export { CloudSyncService } from './cloud-sync.service';
export { ChangeType, EntityType,PendingChange, PendingChangesService } from './pending-changes.service';
export { SyncCoordinatorService } from './sync-coordinator.service';
export { SyncQueueProcessorService } from './sync-queue-processor.service';
