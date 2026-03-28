/**
 * Firebase lazy-loading — anonymous session
 *
 * Contract: users who have never signed in must NEVER trigger Firebase SDK
 * initialization. No auth-hint cookie → initAuthListener() exits the fast path
 * without calling initFirebase(), so the Firebase SDK (auth + firestore +
 * storage) is never loaded and no Firebase API endpoints are contacted.
 *
 * Strategy:
 *  - cy.intercept() spies on every known Firebase API hostname.
 *  - After full Angular hydration + 2 s settle time, the spy count must be 0.
 *  - The sign-in button must be visible immediately (loading$ resolved without
 *    waiting for onAuthStateChanged, which proves the SDK was skipped).
 */

const FIREBASE_HOSTNAMES = [
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /firebase\.googleapis\.com/,
  /firebasestorage\.googleapis\.com/,
  /firebaseapp\.com/,
];

describe('Firebase lazy-loading — anonymous session', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies(); // removes __Secure-fb_auth_hint if present
    cy.clearIndexedDB();
  });

  it('makes zero Firebase API requests on cold anonymous start', () => {
    let requestCount = 0;

    FIREBASE_HOSTNAMES.forEach(pattern => {
      cy.intercept({ hostname: pattern }, (req) => {
        requestCount++;
        req.continue();
      });
    });

    cy.visit('/');
    cy.waitForAngular();

    // Allow async initialisation to settle before asserting.
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);

    cy.then(() => {
      expect(requestCount).to.equal(
        0,
        'Firebase API must not be contacted for anonymous sessions'
      );
    });
  });

  it('resolves auth loading state without waiting for Firebase', () => {
    // The sign-in button is hidden while authLoading is true and only rendered
    // once loading$ emits false. For anonymous users this must happen immediately
    // (synchronous fast-path), not after an async Firebase handshake.
    cy.visit('/');
    cy.waitForAngular();

    cy.get('app-auth-button button').contains('Sign in').should('be.visible');
  });
});
