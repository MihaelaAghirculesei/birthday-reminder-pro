/** Base time units in milliseconds */
export const ONE_MINUTE_MS = 60 * 1_000;
export const ONE_HOUR_MS   = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS    = 24 * ONE_HOUR_MS;
export const ONE_WEEK_MS   =  7 * ONE_DAY_MS;

/** Notification polling interval for browser-based checks */
export const NOTIFICATION_POLL_INTERVAL_MS = 30 * 1_000;

/** How long after the scheduled time a browser notification is still eligible to fire */
export const NOTIFICATION_FIRE_WINDOW_MS = 5 * ONE_MINUTE_MS;

/** How long a dismissed notification banner stays suppressed */
export const BANNER_DISMISS_TTL_MS = ONE_WEEK_MS;
