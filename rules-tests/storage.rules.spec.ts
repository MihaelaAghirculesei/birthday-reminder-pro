/**
 * Security-rules tests for storage.rules.
 * Requires the Storage emulator running on 127.0.0.1:9199.
 * Run via: npm run test:rules:ci  (starts emulators automatically)
 *       or: firebase emulators:start --only storage && npm run test:rules
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getDownloadURL, ref, updateMetadata, uploadBytes } from 'firebase/storage';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

const ALICE = 'uid-alice';
const BOB = 'uid-bob';

// Minimal valid byte sequences — the emulator validates contentType, not magic bytes
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const PNG  = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
const PDF  = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

/** Unique path so parallel tests never collide on the same object. */
function path(uid: string, type = 'photo', ext = 'jpg') {
  return `users/${uid}/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'birthday-rules-test',
    storage: {
      rules: readFileSync(resolve(process.cwd(), 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

// ===========================================================================
// Photo — read (getDownloadURL)
// ===========================================================================

describe('Photo — read', () => {
  let seededPath: string;

  beforeAll(async () => {
    seededPath = path(ALICE);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), seededPath), JPEG, { contentType: 'image/jpeg' });
    });
  });

  it('owner can download their own photo', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertSucceeds(getDownloadURL(ref(storage, seededPath)));
  });

  it('unauthenticated user is denied', async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(getDownloadURL(ref(storage, seededPath)));
  });

  it('other authenticated user is denied', async () => {
    const storage = testEnv.authenticatedContext(BOB).storage();
    await assertFails(getDownloadURL(ref(storage, seededPath)));
  });
});

// ===========================================================================
// Photo — create (upload new object)
// ===========================================================================

describe('Photo — create (new upload)', () => {
  it('owner uploads a JPEG', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertSucceeds(
      uploadBytes(ref(storage, path(ALICE, 'photo', 'jpg')), JPEG, { contentType: 'image/jpeg' })
    );
  });

  it('owner uploads a PNG', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertSucceeds(
      uploadBytes(ref(storage, path(ALICE, 'photo', 'png')), PNG, { contentType: 'image/png' })
    );
  });

  it('owner uploads a WebP (rememberPhoto type)', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertSucceeds(
      uploadBytes(ref(storage, path(ALICE, 'rememberPhoto', 'webp')), WEBP, { contentType: 'image/webp' })
    );
  });

  it('unauthenticated user cannot upload', async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(
      uploadBytes(ref(storage, path(ALICE, 'photo', 'jpg')), JPEG, { contentType: 'image/jpeg' })
    );
  });

  it('other user cannot upload to someone else\'s path', async () => {
    const storage = testEnv.authenticatedContext(BOB).storage();
    // BOB tries to write into ALICE's user space
    await assertFails(
      uploadBytes(ref(storage, path(ALICE, 'photo', 'jpg')), JPEG, { contentType: 'image/jpeg' })
    );
  });

  it('rejects disallowed content type (PDF)', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertFails(
      uploadBytes(ref(storage, path(ALICE, 'photo', 'pdf')), PDF, { contentType: 'application/pdf' })
    );
  });

  it('rejects disallowed content type (GIF)', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertFails(
      uploadBytes(
        ref(storage, path(ALICE, 'photo', 'gif')),
        new Uint8Array([0x47, 0x49, 0x46]),
        { contentType: 'image/gif' }
      )
    );
  });
});

// ===========================================================================
// Photo — metadata update (`allow update: if false`)
// NOTE: In Firebase Storage rules, uploadBytes() to an existing path triggers
// `create` (not `update`) — the object is replaced. Only updateMetadata()
// triggers the `update` rule. The rule `allow update: if false` prevents
// metadata-only edits; the intended workflow for photo replacement is
// delete + re-upload (two separate create/delete operations).
// ===========================================================================

describe('Photo — metadata update (denied by allow update: if false)', () => {
  let existingPath: string;

  beforeEach(async () => {
    existingPath = path(ALICE);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), existingPath), JPEG, { contentType: 'image/jpeg' });
    });
  });

  it('owner cannot update photo metadata', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertFails(
      updateMetadata(ref(storage, existingPath), { cacheControl: 'no-cache' })
    );
  });

  it('other user also cannot update photo metadata', async () => {
    const storage = testEnv.authenticatedContext(BOB).storage();
    await assertFails(
      updateMetadata(ref(storage, existingPath), { cacheControl: 'no-cache' })
    );
  });

  it('re-uploading to an existing path is allowed (triggers create, not update)', async () => {
    // uploadBytes() always triggers the `create` rule in Firebase Storage,
    // even when a file already exists at that path.
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertSucceeds(
      uploadBytes(ref(storage, existingPath), PNG, { contentType: 'image/png' })
    );
  });
});

// ===========================================================================
// Photo — delete
// ===========================================================================

describe('Photo — delete', () => {
  let seededPath: string;

  beforeEach(async () => {
    seededPath = path(ALICE);
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), seededPath), JPEG, { contentType: 'image/jpeg' });
    });
  });

  it('owner deletes their own photo', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertSucceeds(deleteObject(ref(storage, seededPath)));
  });

  it('other user cannot delete someone else\'s photo', async () => {
    const storage = testEnv.authenticatedContext(BOB).storage();
    await assertFails(deleteObject(ref(storage, seededPath)));
  });

  it('unauthenticated user cannot delete any photo', async () => {
    const storage = testEnv.unauthenticatedContext().storage();
    await assertFails(deleteObject(ref(storage, seededPath)));
  });
});

// ===========================================================================
// Default deny (catch-all rule)
// ===========================================================================

describe('Storage — default deny', () => {
  it('blocks access to paths outside users/{uid}/{type}/{file}', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertFails(getDownloadURL(ref(storage, 'top-level-file.jpg')));
  });

  it('blocks access to paths with only 3 segments (missing fileName)', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    // users/{uid}/{type} — no fileName segment, won't match the rule
    await assertFails(getDownloadURL(ref(storage, `users/${ALICE}/photo`)));
  });

  it('blocks access to paths outside users/ prefix', async () => {
    const storage = testEnv.authenticatedContext(ALICE).storage();
    await assertFails(getDownloadURL(ref(storage, `admin/${ALICE}/photo/img.jpg`)));
  });
});
