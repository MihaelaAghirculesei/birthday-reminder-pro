import { Injectable } from '@angular/core';

import { type Birthday } from '../../shared/models/birthday.model';

export type MergeStrategy = 'cloud-wins' | 'latest-wins';

export interface MergeOptions {
  strategy: MergeStrategy;
  deduplicate?: boolean;
}

export interface MergeResult {
  merged: Birthday[];
  toUpload: Birthday[];
}

/**
 * Merges birthday records from local (IndexedDB) and cloud (Firestore) sources.
 *
 * ## Conflict strategy
 *
 * When the same birthday is edited on two devices while offline, the `latest-wins`
 * strategy resolves conflicts in three tiers based on `updatedAt` timestamps:
 *
 * 1. **Equal timestamps** → cloud wins (deterministic tie-breaker; avoids ping-pong).
 *
 * 2. **Strictly newer (> 1 s apart)** → last-write-wins: the record with the higher
 *    `updatedAt` is kept in full. The other device's changes are **silently discarded**.
 *    No upload is needed when cloud is newer; local is uploaded when local is newer.
 *
 * 3. **Near-simultaneous (≤ 1 s apart)** → field-level merge:
 *    - All scalar fields come from the winner (higher `updatedAt`).
 *    - `notes` and `category` fall back to the loser's value when the winner's is empty,
 *      so independent edits on different fields both survive.
 *    - The merged record is always re-uploaded so both sides converge on the same state.
 *
 * ## Strategies
 *
 * | Strategy       | When to use                              |
 * |----------------|------------------------------------------|
 * | `latest-wins`  | Post-login sync (default)                |
 * | `cloud-wins`   | Initial load / full reset from Firestore |
 */
@Injectable({ providedIn: 'root' })
export class BirthdayMergeService {

  merge(local: Birthday[], cloud: Birthday[], options: MergeOptions): MergeResult {
    const deduplicate = options.deduplicate ?? (options.strategy === 'latest-wins');

    if (options.strategy === 'latest-wins') {
      return this.mergeLatestWins(local, cloud, deduplicate);
    }
    return this.mergeCloudWins(local, cloud, deduplicate);
  }

  private mergeLatestWins(local: Birthday[], cloud: Birthday[], deduplicate: boolean): MergeResult {
    const localMap = new Map(local.map((b) => [b.id, b]));
    const cloudMap = new Map(cloud.map((b) => [b.id, b]));

    const merged: Birthday[] = [];
    const toUpload: Birthday[] = [];

    for (const cloudItem of cloud) {
      const localItem = localMap.get(cloudItem.id);

      if (!localItem) {
        merged.push(cloudItem);
      } else {
        const winner = this.resolveConflict(localItem, cloudItem);
        merged.push(winner);

        // Upload if local is strictly newer (cloud is stale), OR if fields were merged
        // from both sides (cloud needs the combined data — e.g. local category + cloud notes).
        const localIsNewer = (localItem.updatedAt || 0) > (cloudItem.updatedAt || 0);
        const isMergedObject = winner !== localItem && winner !== cloudItem;
        if ((winner === localItem && localIsNewer) || isMergedObject) {
          toUpload.push(winner);
        }
      }
    }

    for (const localItem of local) {
      if (!cloudMap.has(localItem.id)) {
        merged.push(localItem);
        toUpload.push(localItem);
      }
    }

    return {
      merged: deduplicate ? this.deduplicateByNameAndDate(merged) : merged,
      toUpload
    };
  }

  private mergeCloudWins(local: Birthday[], cloud: Birthday[], deduplicate: boolean): MergeResult {
    const localMap = new Map(local.map((b) => [b.id, b]));

    const merged: Birthday[] = [];

    for (const cloudBirthday of cloud) {
      const localItem = localMap.get(cloudBirthday.id);

      if (!localItem || localItem.syncStatus === 'synced' || localItem.syncStatus === undefined) {
        merged.push({ ...cloudBirthday, syncStatus: 'synced' });
      } else if (localItem.syncStatus === 'pending') {
        merged.push(localItem);
      } else {
        merged.push({ ...cloudBirthday, syncStatus: 'synced' });
      }

      localMap.delete(cloudBirthday.id);
    }

    for (const localItem of localMap.values()) {
      merged.push(localItem);
    }

    return {
      merged: deduplicate ? this.deduplicateByNameAndDate(merged) : merged,
      toUpload: []
    };
  }

  /**
   * Resolves a conflict between local and cloud versions of the same birthday record.
   *
   * Returns:
   * - The **cloud** object (reference-equal) when timestamps are equal or cloud is newer.
   * - The **local** object (reference-equal) when local is strictly newer (> 1 s).
   * - A **new merged object** for near-simultaneous edits (≤ 1 s): winner's fields with
   *   the loser's `notes` / `category` as fallbacks for empty values.
   *   Callers detect a merged result via `winner !== local && winner !== cloud`.
   */
  private resolveConflict(local: Birthday, cloud: Birthday): Birthday {
    const localTime = local.updatedAt || 0;
    const cloudTime = cloud.updatedAt || 0;

    if (localTime === cloudTime) {
      return cloud;
    }

    if (Math.abs(localTime - cloudTime) > 1000) {
      return localTime > cloudTime ? local : cloud;
    }

    const winner = localTime > cloudTime ? local : cloud;
    const loser = localTime > cloudTime ? cloud : local;

    return {
      ...loser,
      ...winner,
      notes: winner.notes || loser.notes,
      category: winner.category || loser.category,
      updatedAt: Math.max(localTime, cloudTime),
      syncStatus: 'synced' as const
    };
  }

  /**
   * Deduplicates birthdays using a composite key of normalized name + exact birthDate.
   * - Name comparison is case-insensitive and whitespace-trimmed.
   * - Entries with the same name but different dates are kept (treated as different people).
   * - Partial name matching is intentionally NOT performed (too ambiguous).
   * - When duplicates exist, the entry with the highest updatedAt timestamp wins.
   */
  private deduplicateByNameAndDate(birthdays: Birthday[]): Birthday[] {
    const seen = new Map<string, Birthday>();
    for (const b of birthdays) {
      const key = `${b.name.trim().toLowerCase()}|${b.birthDate}`;
      const existing = seen.get(key);
      if (!existing || (b.updatedAt || 0) > (existing.updatedAt || 0)) {
        seen.set(key, b);
      }
    }
    return Array.from(seen.values());
  }
}
