/**
 * Security-rules tests for firestore.rules.
 * Requires the Firestore emulator running on 127.0.0.1:8080.
 * Run via: npm run test:rules:ci  (starts emulators automatically)
 *       or: firebase emulators:start --only firestore && npm run test:rules
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

const ALICE = 'uid-alice';
const BOB = 'uid-bob';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Same shape as FirestoreService.mapBirthdayToFirestore writes.
function birthday(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    name: 'Alice',
    birthDate: '1990-05-15',
    ownerId: userId,
    updatedAt: Date.now(),
    ...overrides,
  };
}

// Same shape as FirestoreService.performSaveCategory writes.
function category(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    name: 'Family',
    icon: 'family_restroom',
    color: '#4CAF50',
    ownerId: userId,
    updatedAt: Date.now(),
    syncStatus: 'synced',
    ...overrides,
  };
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'birthday-rules-test',
    firestore: {
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ===========================================================================
// Birthdays subcollection
// ===========================================================================

describe('Birthdays — read', () => {
  const path = `users/${ALICE}/birthdays/b1`;

  beforeEach(() => seed(path, birthday(ALICE)));

  it('owner reads their own birthday', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, path)));
  });

  it('unauthenticated user is denied', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, path)));
  });

  it('other authenticated user is denied', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(getDoc(doc(db, path)));
  });
});

describe('Birthdays — create', () => {
  const path = `users/${ALICE}/birthdays/b1`;

  it('owner creates a minimal valid birthday', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, path), birthday(ALICE)));
  });

  it('owner creates a fully populated birthday (all optional fields)', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    const full = birthday(ALICE, {
      notes: 'Best friend',
      reminderDays: 7,
      photo: 'https://i.pravatar.cc/300?img=5',
      rememberPhoto: 'users/uid-alice/photos/abc.jpg',
      zodiacSign: 'Taurus',
      googleCalendarEventId: 'evt123',
      category: 'friends',
      email: 'alice@example.com',
      phone: '+49 151 2345678',
      telegramUsername: 'alice_92',
      daysUntilBirthday: 42,
      needsMigration: false,
    });
    await assertSucceeds(setDoc(doc(db, path), full));
  });

  it('owner saves a birthday and the rate-limit marker in one batch, like the app', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, path), birthday(ALICE), { merge: true });
    batch.set(doc(db, `users/${ALICE}/rateLimit/writes`), { lastWrite: serverTimestamp() });
    await assertSucceeds(batch.commit());
  });

  it('rejects ownerId that differs from the path user', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { ownerId: BOB })));
  });

  it('rejects id that differs from the document id', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { id: 'other' })));
  });

  it('rejects birthDate not in YYYY-MM-DD format', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { birthDate: '15/05/1990' })));
  });

  it('rejects updatedAt that is not an integer timestamp', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { updatedAt: '2024-01-01' })));
  });

  it('rejects photo longer than 2048 characters (base64 data never reaches Firestore)', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { photo: 'data:image/png;base64,' + 'a'.repeat(2048) })));
  });

  it('unauthenticated user is denied', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE)));
  });

  it('other user cannot write to another user\'s collection', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE)));
  });

  it('rejects name longer than 200 characters', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { name: 'A'.repeat(201) })));
  });

  it('rejects notes longer than 2000 characters', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { notes: 'x'.repeat(2001) })));
  });

  it('rejects documents with more than 30 fields', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    const extra: Record<string, number> = {};
    for (let i = 0; i < 26; i++) extra[`f${i}`] = i; // 5 base fields + 26 = 31
    await assertFails(setDoc(doc(db, path), birthday(ALICE, extra)));
  });

  it('rejects missing required field `name`', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, ...withoutName } = birthday(ALICE);
    await assertFails(setDoc(doc(db, path), withoutName));
  });

  it('rejects missing required field `birthDate`', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { birthDate, ...withoutDate } = birthday(ALICE);
    await assertFails(setDoc(doc(db, path), withoutDate));
  });

  it('rejects missing required field `ownerId`', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ownerId, ...withoutOwner } = birthday(ALICE);
    await assertFails(setDoc(doc(db, path), withoutOwner));
  });

  it('rejects non-string birthDate', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { birthDate: 19900515 })));
  });

  it('rejects non-string name', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { name: 12345 })));
  });

  it('rejects category longer than 100 characters', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { category: 'c'.repeat(101) })));
  });
});

describe('Birthdays — update', () => {
  const path = `users/${ALICE}/birthdays/b1`;

  beforeEach(() => seed(path, birthday(ALICE)));

  it('owner updates their birthday with valid data', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, path), birthday(ALICE, { name: 'Alice Updated' })));
  });

  it('other user cannot update someone else\'s birthday', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { name: 'Hacked' })));
  });

  it('owner updates with a merge write, like the app', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, path), birthday(ALICE, { notes: 'Updated' }), { merge: true }));
  });

  it('owner cannot update with invalid data (bad birthDate)', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), birthday(ALICE, { birthDate: 'not-a-date' })));
  });
});

describe('Birthdays — delete', () => {
  const path = `users/${ALICE}/birthdays/b1`;

  beforeEach(() => seed(path, birthday(ALICE)));

  it('owner deletes their birthday', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it('other user cannot delete someone else\'s birthday', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(deleteDoc(doc(db, path)));
  });

  it('unauthenticated user cannot delete any birthday', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(deleteDoc(doc(db, path)));
  });
});

// ===========================================================================
// Categories subcollection
// ===========================================================================

describe('Categories — read', () => {
  const path = `users/${ALICE}/categories/c1`;

  beforeEach(() => seed(path, category(ALICE)));

  it('owner reads their category', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, path)));
  });

  it('other user is denied', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(getDoc(doc(db, path)));
  });

  it('unauthenticated user is denied', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, path)));
  });
});

describe('Categories — write', () => {
  const path = `users/${ALICE}/categories/c1`;

  it('owner creates a minimal valid category', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, path), category(ALICE)));
  });

  it('owner creates a custom category', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, path), category(ALICE, { color: '#ff4081', icon: 'star', isCustom: true })));
  });

  it('rejects category name longer than 100 characters', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), category(ALICE, { name: 'A'.repeat(101) })));
  });

  it('rejects ownerId that differs from the path user', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), category(ALICE, { ownerId: BOB })));
  });

  it('rejects categories with more than 15 fields', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    const extra: Record<string, number> = {};
    for (let i = 0; i < 9; i++) extra[`f${i}`] = i; // 7 base fields + 9 = 16
    await assertFails(setDoc(doc(db, path), category(ALICE, extra)));
  });

  it('rejects missing required field `name`', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, ...withoutName } = category(ALICE);
    await assertFails(setDoc(doc(db, path), withoutName));
  });

  it('rejects color longer than 20 characters', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), category(ALICE, { color: '#'.repeat(21) })));
  });

  it('rejects icon longer than 50 characters', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), category(ALICE, { icon: 'i'.repeat(51) })));
  });

  it('other user cannot write to another user\'s categories', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(setDoc(doc(db, path), category(ALICE)));
  });
});

// ===========================================================================
// Rate-limit marker (/users/{userId}/rateLimit/writes)
// ===========================================================================

describe('Rate-limit marker', () => {
  const path = `users/${ALICE}/rateLimit/writes`;

  it('owner writes lastWrite as a server timestamp', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, path), { lastWrite: serverTimestamp() }));
  });

  it('rejects a client-side timestamp', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), { lastWrite: new Date() }));
  });

  it('rejects extra fields', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, path), { lastWrite: serverTimestamp(), extra: 1 }));
  });

  it('rejects any document id other than `writes`', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, `users/${ALICE}/rateLimit/other`), { lastWrite: serverTimestamp() }));
  });

  it('other user cannot write the marker', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(setDoc(doc(db, path), { lastWrite: serverTimestamp() }));
  });

  it('owner deletes the marker (account deletion)', async () => {
    await seed(path, { lastWrite: new Date() });
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(deleteDoc(doc(db, path)));
  });
});

// ===========================================================================
// Settings subcollection
// ===========================================================================

describe('Settings — read', () => {
  const path = `users/${ALICE}/settings/prefs`;

  beforeEach(() => seed(path, { theme: 'dark', language: 'it' }));

  it('owner reads their settings', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, path)));
  });

  it('other user is denied', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(getDoc(doc(db, path)));
  });

  it('unauthenticated user is denied', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, path)));
  });
});

describe('Settings — write', () => {
  const path = `users/${ALICE}/settings/prefs`;

  it('owner writes settings within the 30-key limit', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, path), { theme: 'dark', language: 'it', notifications: true }));
  });

  it('rejects settings with more than 30 keys', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    const bigSettings: Record<string, number> = {};
    for (let i = 0; i <= 30; i++) bigSettings[`key${i}`] = i; // 31 keys
    await assertFails(setDoc(doc(db, path), bigSettings));
  });

  it('other user cannot write settings', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(setDoc(doc(db, path), { theme: 'dark' }));
  });
});

// ===========================================================================
// User document (/users/{userId})
// ===========================================================================

describe('User document', () => {
  it('owner reads their own user document', async () => {
    await seed(`users/${ALICE}`, { displayName: 'Alice' });
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(getDoc(doc(db, `users/${ALICE}`)));
  });

  it('owner writes their own user document', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, `users/${ALICE}`), { displayName: 'Alice', email: 'a@test.com' }));
  });

  it('other user cannot read another\'s user document', async () => {
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(getDoc(doc(db, `users/${ALICE}`)));
  });

  it('unauthenticated user cannot read any user document', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `users/${ALICE}`)));
  });

  it('rejects user document with more than 20 keys', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    const big: Record<string, number> = {};
    for (let i = 0; i <= 20; i++) big[`field${i}`] = i; // 21 keys
    await assertFails(setDoc(doc(db, `users/${ALICE}`), big));
  });

  it('owner can delete their own user document (account deletion)', async () => {
    await seed(`users/${ALICE}`, { displayName: 'Alice' });
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertSucceeds(deleteDoc(doc(db, `users/${ALICE}`)));
  });

  it('other user cannot delete someone else\'s user document', async () => {
    await seed(`users/${ALICE}`, { displayName: 'Alice' });
    const db = testEnv.authenticatedContext(BOB).firestore();
    await assertFails(deleteDoc(doc(db, `users/${ALICE}`)));
  });
});

// ===========================================================================
// Default deny (catch-all rule)
// ===========================================================================

describe('Default deny', () => {
  it('blocks authenticated read of arbitrary top-level paths', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(getDoc(doc(db, 'arbitrary/document')));
  });

  it('blocks authenticated write to arbitrary paths', async () => {
    const db = testEnv.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, 'arbitrary/document'), { data: 'evil' }));
  });

  it('blocks unauthenticated access to any path', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'arbitrary/document')));
  });
});
